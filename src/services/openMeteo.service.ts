// src/services/openMeteo.service.ts
import { Connection } from 'mongoose';
import { getHistoryModel, getPredictModel } from '../models/openMeteo.model';
import { RainfallDataResult, TimeSeriesData } from '../types/response.types';
import { calculateSummary } from '../utils/calcHelper';

export class OpenMeteoService {
  private historyConnection: Connection | null = null;
  private predictConnection: Connection | null = null;

  setConnections(historyConn: Connection, predictConn: Connection) {
    this.historyConnection = historyConn;
    this.predictConnection = predictConn;
  }

  private getCollectionName(name: string, prefix: string = ''): string {
    let clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    clean = clean.replace(/_+/g, '_');
    return prefix ? `${prefix}_${clean}` : clean;
  }

  // Helper: Format Date ke YYYY-MM-DD (Key di DB History)
  private formatDateKey(date: Date): string {
    // Kita gunakan local parts karena data disimpan per tanggal lokal (biasanya)
    // Atau gunakan ISO split jika konsisten UTC
    return date.toISOString().split('T')[0];
  }

  // Helper: Parse string waktu dari OpenMeteo (biasanya ISO-like) ke Date Object
  private parseTimeString(timeStr: string): Date {
    const datePart = timeStr.split('T')[0];
    const timePart = timeStr.split('T')[1];
    // Asumsi timeStr adalah UTC/GMT+0 dari OpenMeteo,
    // Tapi jika data mentah sudah WIB, sesuaikan offsetnya.
    // Di sini asumsi logic lama: kurangi 7 jam
    const tempDate = new Date(`${datePart}T${timePart}:00.000Z`);
    return new Date(tempDate.getTime() - (7 * 60 * 60 * 1000));
  }

  async getOpenMeteoData(pumpName: string, startTime: Date, endTime: Date): Promise<RainfallDataResult | null> {

    console.log(`🔍 [OpenMeteoService] Request: ${pumpName}`);
    console.log(`⏰ Window: ${startTime.toISOString()} <-> ${endTime.toISOString()}`);

    // ==========================================
    // 1. FETCH DATA HISTORY
    // ==========================================
    const historyCollName = this.getCollectionName(pumpName);
    const HistoryModel = getHistoryModel(this.historyConnection!, historyCollName);

    // Generate array tanggal (YYYY-MM-DD) dari startTime s/d endTime
    // Karena data history disimpan per dokumen = 1 hari
    const dateKeys: string[] = [];
    let loopDate = new Date(startTime);
    // Mundurkan loopDate sedikit agar jika jam 00:00 tetap kena hari sebelumnya jika perlu (timezone issue)
    loopDate.setHours(loopDate.getHours() - 7);

    const loopEnd = new Date(endTime);

    // Loop per hari untuk mengumpulkan Key
    while (loopDate <= loopEnd) {
        const key = this.formatDateKey(loopDate);
        if (!dateKeys.includes(key)) dateKeys.push(key);
        loopDate.setDate(loopDate.getDate() + 1);
    }
    // Pastikan end date key masuk
    const endKey = this.formatDateKey(loopEnd);
    if (!dateKeys.includes(endKey)) dateKeys.push(endKey);

    const historyDocs = await HistoryModel.find({
      date: { $in: dateKeys }
    });

    const historyData: TimeSeriesData[] = [];

    historyDocs.forEach(doc => {
      if (doc.hourly) {
        Object.values(doc.hourly).forEach((hourData: any) => {
          if (hourData.time) {
            const itemTime = this.parseTimeString(hourData.time);

            // Filter Ketat: >= startTime DAN <= endTime
            // Dan pastikan <= Waktu Sekarang (karena ini History)
            const now = new Date();
            if (itemTime >= startTime && itemTime <= endTime && itemTime <= now) {
              historyData.push({
                time: hourData.time.replace('T', ' '),
                value: hourData.rain || 0
              });
            }
          }
        });
      }
    });

    // Sort ascending
    historyData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // ==========================================
    // 2. FETCH DATA PREDIKSI
    // ==========================================
    const predictCollName = this.getCollectionName(pumpName, 'prediction');
    const PredictModel = getPredictModel(this.predictConnection!, predictCollName);

    // Ambil 1 doc prediksi terbaru
    const predictDoc = await PredictModel.findOne().sort({ fetchedAt: -1 });

    const forecastData: TimeSeriesData[] = [];
    let location = [-6.1754, 106.8272]; // Default Jakarta

    if (predictDoc) {
      if (predictDoc.pumpLat && predictDoc.pumpLng) {
        location = [predictDoc.pumpLat, predictDoc.pumpLng];
      }

      if (predictDoc.hourly && predictDoc.hourly.time) {
        // Tentukan titik potong waktu agar history & forecast tidak overlap
        let lastHistoryTime = historyData.length > 0
            ? new Date(historyData[historyData.length - 1].time)
            : startTime;

        predictDoc.hourly.time.forEach((timeStr, index) => {
          const itemTime = this.parseTimeString(timeStr);

          // Filter: > lastHistoryTime DAN <= endTime
          if (itemTime > lastHistoryTime && itemTime <= endTime) {
            forecastData.push({
              time: timeStr.replace('T', ' '),
              value: predictDoc.hourly.rain[index] || 0
            });
          }
        });
      }
    }

    if (historyData.length === 0 && forecastData.length === 0) {
      return null;
    }

    // ==========================================
    // 3. HITUNG SUMMARY & RESULT
    // ==========================================
    const summary = calculateSummary(historyData);

    const bounds = [
      [location[0] - 0.01, location[1] - 0.01],
      [location[0] + 0.01, location[1] + 0.01]
    ];

    return {
      pumpHouse: pumpName,
      bounds: bounds,
      location: location,
      history: historyData,   // Array History
      forecast: forecastData, // Array Prediksi
      summary: summary        // Object Summary
    };
  }
}

const openMeteoService = new OpenMeteoService();
export default openMeteoService;

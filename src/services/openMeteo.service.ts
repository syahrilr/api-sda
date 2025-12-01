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

  private getCollectionName(name: string, type: 'history' | 'prediction'): string {
    let clean = name.toLowerCase().replace(/[^a-z0-9]/g, '_');
    clean = clean.replace(/_+/g, '_');
    clean = clean.replace(/^_|_$/g, '');

    if (type === 'prediction') {
      return `prediction_${clean}`;
    }
    return clean;
  }

  private formatDateKey(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  private parseTimeString(timeStr: string): Date {
    const datePart = timeStr.split('T')[0];
    const timePart = timeStr.split('T')[1];
    const tempDate = new Date(`${datePart}T${timePart}:00.000Z`);
    // Adjust Timezone WIB (-7 jam)
    return new Date(tempDate.getTime() - (7 * 60 * 60 * 1000));
  }

  async getOpenMeteoData(pumpName: string, startTime: Date, endTime: Date, historyMaxDate?: Date): Promise<RainfallDataResult | null> {

    // Batas Akhir History adalah parameter historyMaxDate ATAU Sekarang (new Date)
    // Ini menjadi "Garis Batas": Kiri = History, Kanan = Forecast
    const effectiveHistoryEnd = historyMaxDate || new Date();

    console.log(`\n🔍 [OpenMeteo] Req: ${pumpName}`);
    // console.log(`📅 Cut-Off Time: ${effectiveHistoryEnd.toISOString()}`);

    // ==========================================
    // 1. FETCH DATA HISTORY
    // ==========================================
    const historyCollName = this.getCollectionName(pumpName, 'history');
    const HistoryModel = getHistoryModel(this.historyConnection!, historyCollName);

    const dateKeys: string[] = [];
    let loopDate = new Date(startTime);
    loopDate.setDate(loopDate.getDate() - 1);

    const loopEnd = new Date(effectiveHistoryEnd);
    loopEnd.setDate(loopEnd.getDate() + 1);

    while (loopDate <= loopEnd) {
        const key = this.formatDateKey(loopDate);
        if (!dateKeys.includes(key)) dateKeys.push(key);
        loopDate.setDate(loopDate.getDate() + 1);
    }

    const historyDocs = await HistoryModel.find({
      date: { $in: dateKeys }
    }).lean();

    const historyData: TimeSeriesData[] = [];

    historyDocs.forEach((doc: any) => {
      const processHour = (hourData: any) => {
        if (hourData.time) {
          const itemTime = this.parseTimeString(hourData.time);

          // FILTER HISTORY:
          // Ambil jika masuk range Start - End
          // DAN wajib <= effectiveHistoryEnd (Masa Lalu / Sekarang)
          if (itemTime >= startTime && itemTime <= effectiveHistoryEnd) {
            historyData.push({
              time: hourData.time.replace('T', ' '),
              value: hourData.rain || 0
            });
          }
        }
      };

      if (doc.hourly_data && Array.isArray(doc.hourly_data)) {
        doc.hourly_data.forEach(processHour);
      } else if (doc.hourly) {
        Object.values(doc.hourly).forEach(processHour);
      }
    });

    historyData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

    // ==========================================
    // 2. FETCH DATA PREDIKSI
    // ==========================================
    const predictCollName = this.getCollectionName(pumpName, 'prediction');
    const PredictModel = getPredictModel(this.predictConnection!, predictCollName);

    const predictDoc = await PredictModel.findOne().sort({ fetchedAt: -1 }).lean();

    const forecastData: TimeSeriesData[] = [];
    let location = [-6.1754, 106.8272];

    if (predictDoc) {
      // @ts-ignore
      if (predictDoc.pumpLat && predictDoc.pumpLng) location = [predictDoc.pumpLat, predictDoc.pumpLng];

      // @ts-ignore
      if (predictDoc.hourly && predictDoc.hourly.time) {

        // PERBAIKAN DI SINI:
        // Jangan hitung lastHistoryTime dari string array historyData.
        // Langsung pakai 'effectiveHistoryEnd' sebagai patokan.
        // Apa pun yang LEBIH BESAR dari effectiveHistoryEnd adalah FORECAST.

        // @ts-ignore
        predictDoc.hourly.time.forEach((timeStr, index) => {
          const itemTime = this.parseTimeString(timeStr);

          // Logic Forecast:
          // 1. Waktu item harus > Batas History (Masa Depan)
          // 2. Waktu item harus <= Batas Akhir Filter (5 jam ke depan / 16 hari ke depan)
          if (itemTime > effectiveHistoryEnd && itemTime <= endTime) {
            forecastData.push({
              time: timeStr.replace('T', ' '),
              // @ts-ignore
              value: predictDoc.hourly.rain[index] || 0
            });
          }
        });
      }
    }

    // ==========================================
    // 3. RESULT
    // ==========================================
    if (historyData.length === 0 && forecastData.length === 0) return null;

    return {
      pumpHouse: pumpName,
      bounds: [
        [location[0] - 0.01, location[1] - 0.01],
        [location[0] + 0.01, location[1] + 0.01]
      ],
      location: location,
      history: historyData,
      forecast: forecastData,
      summary: calculateSummary(historyData)
    };
  }
}

const openMeteoService = new OpenMeteoService();
export default openMeteoService;

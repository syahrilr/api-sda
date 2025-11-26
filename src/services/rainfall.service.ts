import { Connection } from 'mongoose';
// PERBAIKAN DISINI: Tambahkan IRainfallRecord ke dalam import
import { getPredictionModel } from '../models/prediction.model';
import { getRainfallModel, IRainfallRecord } from '../models/rainfall.model';
import { RainfallDataResult, TimeSeriesData } from '../types/response.types';
import { getTimeWindow } from '../utils/dateHelper';

export class RainfallService {
  private radarConnection: Connection | null = null;
  private predictionConnection: Connection | null = null;

  setConnections(radarConn: Connection, predictConn: Connection) {
    this.radarConnection = radarConn;
    this.predictionConnection = predictConn;
  }

  // Helper 1: Date (UTC) -> String DB Radar (WIB "YYYY-MM-DD HH:mm")
  private formatToRadarString(date: Date): string {
    const wibOffset = 7 * 60 * 60 * 1000;
    const wibDate = new Date(date.getTime() + wibOffset);

    const yyyy = wibDate.getUTCFullYear();
    const mm = String(wibDate.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(wibDate.getUTCDate()).padStart(2, '0');
    const hh = String(wibDate.getUTCHours()).padStart(2, '0');
    const min = String(wibDate.getUTCMinutes()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
  }

  // Helper 2: String DB Python (WIB "YYYY-MM-DD HH:mm") -> Date (UTC)
  private parseRadarString(timeStr: string): Date {
    const [datePart, timePart] = timeStr.split(' ');
    // Buat ISO String seolah-olah UTC dulu
    const tempISO = `${datePart}T${timePart}:00.000Z`;
    const tempDate = new Date(tempISO);
    // Kurangi 7 jam untuk mendapatkan waktu UTC yang sebenarnya
    return new Date(tempDate.getTime() - (7 * 60 * 60 * 1000));
  }

  async getPumpHouseWindowData(name: string, referenceDate: Date = new Date()): Promise<RainfallDataResult | null> {
    // 1. Tentukan Window Waktu (Now +/- 32 menit)
    const { startTime, endTime } = getTimeWindow(referenceDate);
    const splitTime = referenceDate; // Titik tengah (Sekarang)

    console.log('\n========================================');
    console.log(`🔍 [RainfallService] Request: ${name}`);
    console.log(`⏰ Window UTC: ${startTime.toISOString()} <-> ${endTime.toISOString()}`);

    // =========================================================
    // BAGIAN 1: DATA RADAR (HISTORY -> Masa Lalu s/d Sekarang)
    // =========================================================
    const radarModel = getRainfallModel(this.radarConnection!);
    const startRadarStr = this.formatToRadarString(startTime);
    const splitRadarStr = this.formatToRadarString(splitTime);

    console.log(`📡 Fetching History: ${startRadarStr} s/d ${splitRadarStr}`);

    const radarRecords = await radarModel.find({
      'markers.name': { $regex: name, $options: 'i' },
      'metadata.radarTime': {
        $gte: startRadarStr,
        $lte: splitRadarStr
      }
    }).sort({ 'metadata.radarTime': 1 });

    const historicalData: TimeSeriesData[] = radarRecords.map(record => {
      const marker = record.markers.find(m => m.name.toLowerCase().includes(name.toLowerCase()));
      return {
        time: record.metadata.radarTime, // Format String WIB
        value: marker ? marker.rainRate : 0
      };
    });

    // Ambil metadata lokasi dari record radar terakhir (jika ada) untuk peta
    let bounds: number[][] = [];
    let location: number[] = [];

    if (radarRecords.length > 0) {
      const last = radarRecords[radarRecords.length - 1];
      bounds = [last.bounds.sw, last.bounds.ne];
      location = last.location.coordinates;
    }

    // =========================================================
    // BAGIAN 2: DATA PREDIKSI (FUTURE -> Sekarang s/d Masa Depan)
    // =========================================================
    const PredictionModel = getPredictionModel(this.predictionConnection!);

    // Ambil 1 dokumen prediksi TERBARU saja (karena berisi forecast ke depan)
    const predictionDoc = await PredictionModel.findOne().sort({ createdAt: -1 });

    const forecastData: TimeSeriesData[] = [];

    if (predictionDoc && predictionDoc.predictions) {
      console.log(`🔮 Found Prediction Doc created at: ${predictionDoc.createdAt}`);

      // Waktu dasar prediksi dibuat (dalam UTC)
      const basePredictionTime = this.parseRadarString(predictionDoc.timestamp);

      // Python menyimpan key "10", "20", "30" (menit ke depan)
      // Kita harus urutkan key tersebut agar timeline rapi
      const predictionKeys = Object.keys(predictionDoc.predictions)
        .map(Number)
        .sort((a, b) => a - b);

      predictionKeys.forEach(minutesAhead => {
        // Hitung waktu absolut untuk poin prediksi ini
        const forecastTime = new Date(basePredictionTime.getTime() + (minutesAhead * 60000));

        // FILTER LOGIC:
        // Ambil data HANYA JIKA waktunya > Sekarang DAN <= Batas Akhir (32 menit ke depan)
        if (forecastTime > splitTime && forecastTime <= endTime) {

           // Cari data pompa spesifik di dalam array predictions[menit]
           // Kita gunakan 'any' sementara karena struktur Mixed, tapi logic-nya aman
           const locData = (predictionDoc.predictions[String(minutesAhead)] as any[]).find(
             (p: any) => p.name.toLowerCase().includes(name.toLowerCase())
           );

           if (locData) {
             // Format balik ke string WIB agar formatnya seragam dengan data radar history
             const timeString = this.formatToRadarString(forecastTime);

             forecastData.push({
               time: timeString,
               value: locData.rain_rate
             });
           }
        }
      });
    } else {
        console.warn("⚠️ No prediction document found in DB.");
    }

    // --- Fallback Location (Jika Radar mati tapi Prediksi ada) ---
    if (location.length === 0 && predictionDoc && predictionDoc.predictions['10']) {
        const fallbackLoc = (predictionDoc.predictions['10'] as any[]).find(
            (p: any) => p.name.toLowerCase().includes(name.toLowerCase())
        );
        if (fallbackLoc) {
            location = [fallbackLoc.lat, fallbackLoc.lng];
            // Buat bounds dummy kecil sekitar titik
            bounds = [
              [fallbackLoc.lat - 0.05, fallbackLoc.lng - 0.05],
              [fallbackLoc.lat + 0.05, fallbackLoc.lng + 0.05]
            ];
        }
    }

    // Jika total data kosong, return null
    if (historicalData.length === 0 && forecastData.length === 0) {
      return null;
    }

    // Gabungkan Data
    const combinedData = [...historicalData, ...forecastData];

    return {
      pumpHouse: name,
      bounds: bounds,
      location: location,
      data: combinedData
    };
  }

  // Method ini yang tadi menyebabkan error karena IRainfallRecord tidak diimport
  async getLatestRecord(): Promise<IRainfallRecord | null> {
    const RainfallRecord = getRainfallModel(this.radarConnection!);
    return await RainfallRecord.findOne().sort({ 'metadata.radarTime': -1 });
  }
}

const rainfallService = new RainfallService();
export default rainfallService;

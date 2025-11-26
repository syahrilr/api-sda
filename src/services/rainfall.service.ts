import { Connection } from 'mongoose';
import { getRainfallModel } from '../models/rainfall.model';
import { getPredictionModel } from '../models/prediction.model';
import { getTimeWindow } from '../utils/dateHelper';
import { dbManager } from '../config/database';
import { RainfallDataResult, TimeSeriesData } from '../types/response.types';

export class RainfallService {
  private radarConnection: Connection | null = null;
  private predictionConnection: Connection | null = null;

  setConnections(radarConn: Connection, predictConn: Connection) {
    this.radarConnection = radarConn;
    this.predictionConnection = predictConn;
  }

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

  private parseRadarString(timeStr: string): Date {
    const [datePart, timePart] = timeStr.split(' ');
    const tempISO = `${datePart}T${timePart}:00.000Z`;
    const tempDate = new Date(tempISO);
    return new Date(tempDate.getTime() - (7 * 60 * 60 * 1000));
  }

  async getPumpHouseWindowData(name: string, referenceDate: Date = new Date()): Promise<RainfallDataResult | null> {
    const { startTime, endTime } = getTimeWindow(referenceDate);
    const splitTime = referenceDate;

    console.log('\n========================================');
    console.log(`🔍 [RainfallService] Request: ${name}`);

    // 1. AMBIL DATA RADAR (HISTORY)
    const radarModel = getRainfallModel(this.radarConnection!);
    const startRadarStr = this.formatToRadarString(startTime);
    const splitRadarStr = this.formatToRadarString(splitTime);

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
        time: record.metadata.radarTime,
        value: marker ? marker.rainRate : 0
      };
    });

    // --- PERBAIKAN LOGIKA LOCATION ---
    let bounds: number[][] = [];
    let location: number[] = [];

    if (radarRecords.length > 0) {
      const last = radarRecords[radarRecords.length - 1];

      // Bounds tetap ambil dari radar (area cakupan gambar)
      bounds = [last.bounds.sw, last.bounds.ne];

      // LOCATION: Cari koordinat spesifik di dalam markers, BUKAN lokasi radar
      const specificMarker = last.markers.find(m =>
        m.name.toLowerCase().includes(name.toLowerCase())
      );

      if (specificMarker) {
        // Ambil koordinat Rumah Pompa (lat, lng)
        location = [specificMarker.lat, specificMarker.lng];
      } else {
        // Fallback ke lokasi radar jika marker anehnya tidak ketemu
        location = last.location.coordinates;
      }
    }

    // 2. AMBIL DATA PREDIKSI (FUTURE)
    const PredictionModel = getPredictionModel(this.predictionConnection!);
    const predictionDoc = await PredictionModel.findOne().sort({ createdAt: -1 });

    const forecastData: TimeSeriesData[] = [];

    if (predictionDoc && predictionDoc.predictions) {
      const basePredictionTime = this.parseRadarString(predictionDoc.timestamp);
      const predictionKeys = Object.keys(predictionDoc.predictions)
        .map(Number)
        .sort((a, b) => a - b);

      predictionKeys.forEach(minutesAhead => {
        const forecastTime = new Date(basePredictionTime.getTime() + (minutesAhead * 60000));

        if (forecastTime > splitTime && forecastTime <= endTime) {
           const locData = (predictionDoc.predictions[String(minutesAhead)] as any[]).find(
             (p: any) => p.name.toLowerCase().includes(name.toLowerCase())
           );

           if (locData) {
             const timeString = this.formatToRadarString(forecastTime);
             forecastData.push({
               time: timeString,
               value: locData.rain_rate
             });
           }
        }
      });
    }

    // Fallback Location (Jika history kosong, ambil lokasi dari data prediksi)
    if (location.length === 0 && predictionDoc && predictionDoc.predictions['10']) {
        const fallbackLoc = (predictionDoc.predictions['10'] as any[]).find(
            (p: any) => p.name.toLowerCase().includes(name.toLowerCase())
        );
        if (fallbackLoc) {
            location = [fallbackLoc.lat, fallbackLoc.lng];
            // Update bounds agar fokus ke titik prediksi
            bounds = [
              [fallbackLoc.lat - 0.05, fallbackLoc.lng - 0.05],
              [fallbackLoc.lat + 0.05, fallbackLoc.lng + 0.05]
            ];
        }
    }

    if (historicalData.length === 0 && forecastData.length === 0) {
      return null;
    }

    const combinedData = [...historicalData, ...forecastData];

    return {
      pumpHouse: name,
      bounds: bounds,
      location: location, // Sekarang sudah benar (koordinat rumah pompa)
      data: combinedData
    };
  }

  async getLatestRecord(): Promise<any> {
    const RainfallRecord = getRainfallModel(this.radarConnection!);
    return await RainfallRecord.findOne().sort({ 'metadata.radarTime': -1 });
  }
}

const rainfallService = new RainfallService();
export default rainfallService;

import { Connection } from 'mongoose';
import { getRainfallModel } from '../models/rainfall.model';
import { getPredictionModel } from '../models/prediction.model';
import { RainfallDataResult, TimeSeriesData } from '../types/response.types';
import { calculateSummary } from '../utils/calcHelper';

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

  async getPumpHouseWindowData(name: string, startTime: Date, endTime: Date): Promise<RainfallDataResult | null> {

    console.log(`🔍 [RainfallService] Request: ${name}`);
    console.time('fetchHistory'); // Debug timer

    // ==========================================
    // 1. AMBIL DATA HISTORY (OPTIMIZED)
    // ==========================================
    const radarModel = getRainfallModel(this.radarConnection!);
    const startRadarStr = this.formatToRadarString(startTime);
    const endRadarStr = this.formatToRadarString(endTime);

    // OPTIMASI QUERY:
    // 1. Filter marker di level DB
    // 2. Select hanya field yang dibutuhkan + 'markers.$' (hanya return array element yg match)
    // 3. Gunakan .lean() agar return plain JSON (sangat cepat untuk ribuan data)
    const radarRecords = await radarModel.find({
      'markers.name': { $regex: name, $options: 'i' },
      'metadata.radarTime': {
        $gte: startRadarStr,
        $lte: endRadarStr
      }
    })
    .select({
      'metadata.radarTime': 1, // Ambil Waktu
      'markers.$': 1           // MAGIC: Hanya ambil 1 marker yang cocok dari array!
    })
    .sort({ 'metadata.radarTime': 1 })
    .lean(); // Skip overhead Mongoose Document

    console.timeEnd('fetchHistory'); // Lihat bedanya di console log

    // Mapping data dari hasil lean query
    const historyData: TimeSeriesData[] = radarRecords.map((record: any) => {
      // Karena projection markers.$, array markers pasti cuma isi 1 item (item yg dicari)
      const marker = record.markers && record.markers.length > 0 ? record.markers[0] : null;
      return {
        time: record.metadata.radarTime,
        value: marker ? marker.rainRate : 0
      };
    });

    // ==========================================
    // 2. AMBIL LOCATION & BOUNDS (TERPISAH)
    // ==========================================
    // Kita query terpisah ambil 1 record terakhir untuk info lokasi.
    // Ini jauh lebih ringan daripada mengambil info lokasi di setiap row history.

    let bounds: number[][] = [];
    let location: number[] = [];

    const lastRecord = await radarModel.findOne({
      'markers.name': { $regex: name, $options: 'i' },
      'metadata.radarTime': { $lte: endRadarStr }
    })
    .sort({ 'metadata.radarTime': -1 })
    .select('bounds location markers.$') // Tetap pakai projection biar ringan
    .lean();

    if (lastRecord) {
        // @ts-ignore
        bounds = [lastRecord.bounds.sw, lastRecord.bounds.ne];

        // @ts-ignore
        const specificMarker = lastRecord.markers && lastRecord.markers[0];
        if (specificMarker) {
            location = [specificMarker.lat, specificMarker.lng];
        } else {
            // @ts-ignore
            location = lastRecord.location.coordinates;
        }
    }

    // ==========================================
    // 3. AMBIL DATA PREDIKSI (FORECAST)
    // ==========================================
    const forecastData: TimeSeriesData[] = [];
    const PredictionModel = getPredictionModel(this.predictionConnection!);

    // Gunakan lean() juga untuk prediksi
    const predictionDoc = await PredictionModel.findOne().sort({ createdAt: -1 }).lean();

    if (predictionDoc && predictionDoc.predictions) {
      const basePredictionTime = this.parseRadarString(predictionDoc.timestamp);

      let lastHistoryTime = historyData.length > 0
        ? this.parseRadarString(historyData[historyData.length - 1].time)
        : startTime;

      const predictionKeys = Object.keys(predictionDoc.predictions)
        .map(Number)
        .sort((a, b) => a - b);

      predictionKeys.forEach(minutesAhead => {
        const forecastTime = new Date(basePredictionTime.getTime() + (minutesAhead * 60000));

        if (forecastTime > lastHistoryTime && forecastTime <= endTime) {
           // @ts-ignore
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

      // Fallback Location dari prediksi jika history kosong
      // @ts-ignore
      if (location.length === 0 && predictionDoc.predictions['10']) {
        // @ts-ignore
        const fallbackLoc = (predictionDoc.predictions['10'] as any[]).find(
            (p: any) => p.name.toLowerCase().includes(name.toLowerCase())
        );
        if (fallbackLoc) {
            location = [fallbackLoc.lat, fallbackLoc.lng];
            bounds = [
              [fallbackLoc.lat - 0.05, fallbackLoc.lng - 0.05],
              [fallbackLoc.lat + 0.05, fallbackLoc.lng + 0.05]
            ];
        }
      }
    }

    if (historyData.length === 0 && forecastData.length === 0) {
      return null;
    }

    // ==========================================
    // 4. HITUNG SUMMARY
    // ==========================================
    const summary = calculateSummary(historyData);

    return {
      pumpHouse: name,
      bounds: bounds,
      location: location,
      history: historyData,
      forecast: forecastData,
      summary: summary
    };
  }

  async getLatestRecord(): Promise<any> {
    const RainfallRecord = getRainfallModel(this.radarConnection!);
    return await RainfallRecord.findOne().sort({ 'metadata.radarTime': -1 }).lean();
  }
}

const rainfallService = new RainfallService();
export default rainfallService;

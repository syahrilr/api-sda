// src/services/rainfall.service.ts
import { Connection } from 'mongoose';
import { getRainfallModel, IRainfallRecord } from '../models/rainfall.model';
import { getDayRange } from '../utils/dateHelper';
import { dbManager } from '../config/database';

export class RainfallService {
  private connection: Connection | null = null;

  /**
   * Set database connection
   */
  setConnection(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Get the model (with current connection)
   */
  private getModel() {
    if (!this.connection) {
      // Fallback to default connection
      this.connection = dbManager.getConnection('curahHujan') as unknown as Connection;
    }
    return getRainfallModel(this.connection);
  }

  /**
   * Get all rainfall records for today
   */
  async getTodayRecords(): Promise<IRainfallRecord[]> {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    return await RainfallRecord.find({
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    }).sort({ 'metadata.radarTime': -1 });
  }

  /**
   * Get rainfall records by specific date
   */
  async getRecordsByDate(date: Date): Promise<IRainfallRecord[]> {
    const { startOfDay, endOfDay } = getDayRange(date);
    const RainfallRecord = this.getModel();

    return await RainfallRecord.find({
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    }).sort({ 'metadata.radarTime': -1 });
  }

  /**
   * Get rainfall records by pump house name (today)
   */
  async getRecordsByPumpHouse(name: string): Promise<any[]> {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    const records = await RainfallRecord.find({
      'markers.name': { $regex: name, $options: 'i' },
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    }).sort({ 'metadata.radarTime': -1 });

    // Filter markers to only include matching pump houses
    return records.map(record => {
      const doc = record.toObject();
      doc.markers = doc.markers.filter(marker =>
        marker.name.toLowerCase().includes(name.toLowerCase())
      );
      return doc;
    });
  }

  /**
   * Get the latest rainfall record
   */
  async getLatestRecord(): Promise<IRainfallRecord | null> {
    const RainfallRecord = this.getModel();
    return await RainfallRecord.findOne()
      .sort({ 'metadata.radarTime': -1 })
      .limit(1);
  }

  /**
   * Get all unique pump houses with rainfall today
   */
  async getTodayPumpHouses(): Promise<string[]> {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    const records = await RainfallRecord.find({
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    });

    const pumpHouses = new Set<string>();
    records.forEach(record => {
      record.markers.forEach(marker => {
        pumpHouses.add(marker.name);
      });
    });

    return Array.from(pumpHouses).sort();
  }

  /**
   * Get rainfall summary for today
   */
  async getTodaySummary() {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    const records = await RainfallRecord.find({
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    });

    const summary = {
      totalRecords: records.length,
      locationsWithRain: 0,
      maxRainRate: 0,
      alertCount: 0,
      pumpHouses: new Set<string>()
    };

    records.forEach(record => {
      summary.locationsWithRain += record.metadata.locationsWithRain || 0;
      summary.maxRainRate = Math.max(summary.maxRainRate, record.metadata.maxRainRate || 0);
      summary.alertCount += record.metadata.alertCount || 0;

      record.markers.forEach(marker => {
        summary.pumpHouses.add(marker.name);
      });
    });

    return {
      totalRecords: summary.totalRecords,
      locationsWithRain: summary.locationsWithRain,
      maxRainRate: summary.maxRainRate,
      alertCount: summary.alertCount,
      pumpHouses: Array.from(summary.pumpHouses).sort(),
      totalPumpHouses: summary.pumpHouses.size
    };
  }

  /**
   * Get rainfall records by radar station
   */
  async getRecordsByRadarStation(station: string): Promise<IRainfallRecord[]> {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    return await RainfallRecord.find({
      'location.radarStation': station.toUpperCase(),
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      }
    }).sort({ 'metadata.radarTime': -1 });
  }

  /**
   * Get rainfall alerts (locations with high rain rate)
   */
  async getTodayAlerts(minRainRate: number = 5): Promise<any[]> {
    const { startOfDay, endOfDay } = getDayRange();
    const RainfallRecord = this.getModel();

    const records = await RainfallRecord.find({
      'metadata.radarTime': {
        $gte: startOfDay.toISOString(),
        $lte: endOfDay.toISOString()
      },
      'metadata.maxRainRate': { $gte: minRainRate }
    }).sort({ 'metadata.maxRainRate': -1 });

    return records.map(record => {
      const doc = record.toObject();
      doc.markers = doc.markers.filter(marker => marker.rainRate >= minRainRate);
      return doc;
    });
  }
}

// Create singleton with default connection
const rainfallService = new RainfallService();

export default rainfallService;

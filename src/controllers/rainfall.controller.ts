import { Request, Response, NextFunction } from 'express';
import rainfallService from '../services/rainfall.service';
import { ApiResponse } from '../types/response.types';

export class RainfallController {
  /**
   * Get all rainfall data for today
   * GET /api/rainfall/today
   */
  async getTodayRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const records = await rainfallService.getTodayRecords();

      const response: ApiResponse = {
        success: true,
        count: records.length,
        date: new Date().toISOString().split('T')[0],
        data: records
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rainfall data by specific date
   * GET /api/rainfall/date/:date
   */
  async getRainfallByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const { date } = req.params;
      const targetDate = new Date(date);

      if (isNaN(targetDate.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format. Use YYYY-MM-DD'
        });
      }

      const records = await rainfallService.getRecordsByDate(targetDate);

      const response: ApiResponse = {
        success: true,
        count: records.length,
        date: date,
        data: records
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rainfall data by pump house name
   * GET /api/rainfall/pump-house/:name
   */
  async getRainfallByPumpHouse(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const records = await rainfallService.getRecordsByPumpHouse(name);

      const response: ApiResponse = {
        success: true,
        count: records.length,
        pumpHouse: name,
        date: new Date().toISOString().split('T')[0],
        data: records
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get latest rainfall data
   * GET /api/rainfall/latest
   */
  async getLatestRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await rainfallService.getLatestRecord();

      if (!record) {
        return res.status(404).json({
          success: false,
          error: 'No rainfall data found'
        });
      }

      const response: ApiResponse = {
        success: true,
        data: record
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get all pump houses with rainfall today
   * GET /api/rainfall/pump-houses
   */
  async getPumpHouses(req: Request, res: Response, next: NextFunction) {
    try {
      const pumpHouses = await rainfallService.getTodayPumpHouses();

      const response: ApiResponse = {
        success: true,
        count: pumpHouses.length,
        date: new Date().toISOString().split('T')[0],
        data: pumpHouses
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rainfall summary for today
   * GET /api/rainfall/summary/today
   */
  async getTodaySummary(req: Request, res: Response, next: NextFunction) {
    try {
      const summary = await rainfallService.getTodaySummary();

      const response: ApiResponse = {
        success: true,
        date: new Date().toISOString().split('T')[0],
        data: summary
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rainfall data by radar station
   * GET /api/rainfall/station/:station
   */
  async getRainfallByStation(req: Request, res: Response, next: NextFunction) {
    try {
      const { station } = req.params;
      const records = await rainfallService.getRecordsByRadarStation(station);

      const response: ApiResponse = {
        success: true,
        count: records.length,
        station: station.toUpperCase(),
        date: new Date().toISOString().split('T')[0],
        data: records
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Get rainfall alerts (high rain rate locations)
   * GET /api/rainfall/alerts
   */
  async getRainfallAlerts(req: Request, res: Response, next: NextFunction) {
    try {
      const minRainRate = req.query.minRainRate
        ? parseFloat(req.query.minRainRate as string)
        : 5;

      const alerts = await rainfallService.getTodayAlerts(minRainRate);

      const response: ApiResponse = {
        success: true,
        count: alerts.length,
        minRainRate,
        date: new Date().toISOString().split('T')[0],
        data: alerts
      };

      res.json(response);
    } catch (error) {
      next(error);
    }
  }
}

export default new RainfallController();

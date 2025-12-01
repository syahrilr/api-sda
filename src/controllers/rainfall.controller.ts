import { Request, Response, NextFunction } from 'express';
import rainfallService from '../services/rainfall.service';
import { ApiResponse } from '../types/response.types';
import { isValidDateString } from '../utils/dateHelper';

export class RainfallController {

  async getRainfallByPumpHouse(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const dateQuery = req.query.date as string;
      const rangeQuery = req.query.range as string;

      // Default Setup (Hari Ini)
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);

      let endDate = new Date();
      endDate.setHours(endDate.getHours() + 24);

      // LOGIC FILTER
      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(specificDate);
        endDate.setHours(23, 59, 59, 999);
      }
      else if (rangeQuery) {
        // Base Reference untuk perhitungan menit/jam
        const now = new Date();

        // Reset base untuk case mingguan/bulanan
        startDate = new Date();
        endDate = new Date();

        switch (rangeQuery) {
          // --- TAMBAHAN BARU: 32 MENIT ---
          case '32min':
            // Start: 32 menit yang lalu
            startDate = new Date(now.getTime() - (32 * 60 * 1000));
            // End: 32 menit ke depan
            endDate = new Date(now.getTime() + (32 * 60 * 1000));
            break;
          // -------------------------------

          case '1w':
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(23, 59, 59, 999);
            break;

          case '1m':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date();
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;

          case '2m':
            startDate.setMonth(startDate.getMonth() - 2);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date();
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;

          case '3m':
            startDate.setMonth(startDate.getMonth() - 3);
            startDate.setDate(1);
            startDate.setHours(0, 0, 0, 0);

            endDate = new Date();
            endDate.setDate(0);
            endDate.setHours(23, 59, 59, 999);
            break;

          case 'today':
          default:
            startDate.setHours(0, 0, 0, 0);
            endDate.setHours(endDate.getHours() + 24);
            break;
        }
      }

      console.log(`\n📅 [Rainfall] Date Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      const result = await rainfallService.getPumpHouseWindowData(name, startDate, endDate);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `No rainfall data found for '${name}' in range`
        });
      }

      const response: ApiResponse = {
        success: true,
        result: result
      };

      res.json(response);

    } catch (error) {
      next(error);
    }
  }

  async getLatestRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await rainfallService.getLatestRecord();
      if (!record) {
        return res.status(404).json({ success: false, error: 'No data available' });
      }
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
}

export default new RainfallController();

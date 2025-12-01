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

      // Setup default (Hari Ini)
      let startDate = new Date();
      startDate.setHours(-7, 0, 0, 0); // 00:00 WIB

      let endDate = new Date();
      endDate.setHours(endDate.getHours() + 24);

      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(-7, 0, 0, 0);
        endDate = new Date(specificDate);
        endDate.setHours(16, 59, 59, 999); // 23:59 WIB
      }
      else if (rangeQuery) {
        const now = new Date();
        const baseDate = new Date();
        baseDate.setDate(1); // Reset ke tanggal 1 bulan ini

        switch (rangeQuery) {
          case '32min':
            startDate = new Date(now.getTime() - (32 * 60 * 1000));
            endDate = new Date(now.getTime() + (32 * 60 * 1000));
            break;

          case '1w':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(-7, 0, 0, 0);

            endDate = new Date();
            endDate.setDate(endDate.getDate() - 1);
            endDate.setHours(16, 59, 59, 999); // Kemarin 23:59 WIB
            break;

          case '1m':
            // 1 Bulan Lalu FULL (Misal skrg Des -> Full Nov)
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 1);
            startDate.setHours(-7, 0, 0, 0); // 00:00 WIB

            endDate = new Date(baseDate);
            endDate.setDate(0); // Tanggal 0 bulan ini = Akhir bulan lalu
            endDate.setHours(16, 59, 59, 999); // 23:59 WIB
            break;

          case '2m':
            // 2 Bulan Lalu FULL (Misal skrg Des -> Full Okt)
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 2);
            startDate.setHours(-7, 0, 0, 0); // 00:00 WIB

            endDate = new Date(baseDate);
            endDate.setMonth(baseDate.getMonth() - 1); // Mundur ke bulan lalu
            endDate.setDate(0); // Ambil akhir bulannya
            endDate.setHours(16, 59, 59, 999); // 23:59 WIB
            break;

          case '3m':
            // 3 Bulan Lalu FULL (Misal skrg Des -> Full Sept)
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 3);
            startDate.setHours(-7, 0, 0, 0);

            endDate = new Date(baseDate);
            endDate.setMonth(baseDate.getMonth() - 2);
            endDate.setDate(0);
            endDate.setHours(16, 59, 59, 999); // 23:59 WIB
            break;

          case 'today':
          default:
            startDate = new Date();
            startDate.setHours(-7, 0, 0, 0); // 00:00 WIB
            endDate = new Date();
            endDate.setHours(endDate.getHours() + 24);
            break;
        }
      }

      console.log(`\n📅 [Rainfall] Filter (UTC): ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      const result = await rainfallService.getPumpHouseWindowData(name, startDate, endDate);

      if (!result) return res.status(404).json({ success: false, message: `No data` });

      if (rangeQuery === '32min') {
        const mergedData = [...(result.history || []), ...(result.forecast || [])];
        mergedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
        return res.json({
          success: true,
          result: {
            pumpHouse: result.pumpHouse,
            bounds: result.bounds,
            location: result.location,
            data: mergedData
          }
        });
      }

      res.json({ success: true, result: result });

    } catch (error) {
      next(error);
    }
  }

  async getLatestRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const record = await rainfallService.getLatestRecord();
      if (!record) return res.status(404).json({ success: false, error: 'No data' });
      res.json({ success: true, data: record });
    } catch (error) {
      next(error);
    }
  }
}

export default new RainfallController();

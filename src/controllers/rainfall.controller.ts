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

      // --- SETUP DATE (Sama seperti sebelumnya) ---
      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0);
      let endDate = new Date();
      endDate.setHours(endDate.getHours() + 24);

      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(specificDate);
        endDate.setHours(23, 59, 59, 999);
      }
      else if (rangeQuery) {
        const now = new Date();
        startDate = new Date();
        endDate = new Date();

        switch (rangeQuery) {
          case '32min':
            startDate = new Date(now.getTime() - (32 * 60 * 1000));
            endDate = new Date(now.getTime() + (32 * 60 * 1000));
            break;
          // ... (case 1w, 1m, 2m, 3m, today biarkan sama seperti kode sebelumnya)
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

      console.log(`\n📅 [Rainfall] Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      // Panggil Service (Dapat data lengkap: history + forecast + summary)
      const result = await rainfallService.getPumpHouseWindowData(name, startDate, endDate);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `No rainfall data found for '${name}' in range`
        });
      }

      // === LOGIKA TRANSFORMASI RESPONSE ===
      // Jika filter 32min, kita gabung history & forecast jadi satu array 'data'
      if (rangeQuery === '32min') {
        // 1. Gabung Array
        const mergedData = [
          ...(result.history || []),
          ...(result.forecast || [])
        ];

        // 2. Sort berdasarkan waktu
        mergedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

        // 3. Return format khusus (tanpa summary, tanpa history/forecast terpisah)
        return res.json({
          success: true,
          result: {
            pumpHouse: result.pumpHouse,
            bounds: result.bounds,
            location: result.location,
            data: mergedData // Array gabungan
          }
        });
      }

      // Jika filter LAIN (1w, 1m, today), return format standard lengkap
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

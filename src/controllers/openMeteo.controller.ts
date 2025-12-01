// src/controllers/openMeteo.controller.ts
import { Request, Response, NextFunction } from 'express';
import openMeteoService from '../services/openMeteo.service';
import { ApiResponse } from '../types/response.types';
import { isValidDateString } from '../utils/dateHelper';

export class OpenMeteoController {

  async getRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const dateQuery = req.query.date as string;
      const rangeQuery = req.query.range as string; // 'today', '1w', '1m', '3m'

      // Default: Hari ini
      let endDate = new Date();
      // Kita tambahkan buffer 48 jam ke depan untuk default view agar prediksi terlihat
      endDate.setHours(endDate.getHours() + 48);

      let startDate = new Date();
      startDate.setHours(0, 0, 0, 0); // Default start jam 00:00 hari ini

      // CASE 1: User minta tanggal spesifik (?date=2025-11-25)
      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(0, 0, 0, 0);

        endDate = new Date(specificDate);
        endDate.setHours(23, 59, 59, 999);
      }
      // CASE 2: User minta range (?range=1w)
      else if (rangeQuery) {
        // Reset endDate ke saat ini + buffer prediksi
        endDate = new Date();
        endDate.setHours(endDate.getHours() + 48);

        startDate = new Date();

        switch (rangeQuery) {
          case '1w': // 1 Minggu lalu
            startDate.setDate(startDate.getDate() - 7);
            break;
          case '1m': // 1 Bulan lalu
            startDate.setMonth(startDate.getMonth() - 1);
            break;
          case '2m': // 2 Bulan lalu
            startDate.setMonth(startDate.getMonth() - 2);
            break;
          case '3m': // 3 Bulan lalu
            startDate.setMonth(startDate.getMonth() - 3);
            break;
          case 'today':
          default:
            startDate.setHours(0, 0, 0, 0);
            break;
        }
      }

      console.log(`\n📅 [OpenMeteo] Date Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      // Panggil Service dengan Start & End Date eksplisit
      const result = await openMeteoService.getOpenMeteoData(name, startDate, endDate);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `No Open-Meteo data found for '${name}' in range`
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
}

export default new OpenMeteoController();

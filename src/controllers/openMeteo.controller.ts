import { Request, Response, NextFunction } from 'express';
import openMeteoService from '../services/openMeteo.service';
import { ApiResponse } from '../types/response.types';
import { isValidDateString } from '../utils/dateHelper';

export class OpenMeteoController {

  async getRainfall(req: Request, res: Response, next: NextFunction) {
    try {
      const { name } = req.params;
      const dateQuery = req.query.date as string;
      const rangeQuery = req.query.range as string;

      // Setup Date (Sama seperti kode terakhir)
      let startDate = new Date();
      startDate.setHours(-7, 0, 0, 0);
      let endDate = new Date();
      endDate.setDate(endDate.getDate() + 16);
      let strictHistoryDate: Date | undefined = undefined;

      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(-7, 0, 0, 0);
        endDate = new Date(specificDate);
        endDate.setHours(16, 59, 59, 999);
      }
      else if (rangeQuery) {
        startDate = new Date();
        endDate = new Date();
        endDate.setDate(endDate.getDate() + 16);

        switch (rangeQuery) {
          case '5h':
            const now = new Date();
            startDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
            endDate = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            break;
          // ... (case 1w, 1m, 2m, 3m, today biarkan sama)
          case '1w':
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(-7, 0, 0, 0);
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(strictHistoryDate.getDate() - 1);
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;
          case '1m':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(-7, 0, 0, 0);
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(0);
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;
          case '2m':
            startDate.setMonth(startDate.getMonth() - 2);
            startDate.setDate(1);
            startDate.setHours(-7, 0, 0, 0);
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(0);
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;
          case '3m':
            startDate.setMonth(startDate.getMonth() - 3);
            startDate.setDate(1);
            startDate.setHours(-7, 0, 0, 0);
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(0);
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;
          case 'today':
          default:
            startDate.setHours(-7, 0, 0, 0);
            break;
        }
      }

      console.log(`\n📅 [OpenMeteo] Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      const result = await openMeteoService.getOpenMeteoData(name, startDate, endDate, strictHistoryDate);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `No Open-Meteo data found for '${name}' in range`
        });
      }

      // === LOGIKA TRANSFORMASI RESPONSE ===
      // Jika filter 5h, kita gabung history & forecast jadi satu array 'data'
      if (rangeQuery === '5h') {
         const mergedData = [
          ...(result.history || []),
          ...(result.forecast || [])
        ];

        mergedData.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());

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

      // Jika filter LAIN (1m, today), return format standard
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

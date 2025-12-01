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
        const now = new Date();

        // Base Date (Tanggal 1 bulan ini) untuk kalkulasi mundur bulan
        const baseDate = new Date();
        baseDate.setDate(1);

        switch (rangeQuery) {
          case '5h':
            startDate = new Date(now.getTime() - (5 * 60 * 60 * 1000));
            endDate = new Date(now.getTime() + (5 * 60 * 60 * 1000));
            break;

          case '1w':
            startDate = new Date();
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(-7, 0, 0, 0);
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(strictHistoryDate.getDate() - 1);
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;

          case '1m':
            // 1 Bulan Lalu FULL (Start Tgl 1 - End Tgl Terakhir Bulan Lalu)
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 1);
            startDate.setHours(-7, 0, 0, 0);

            endDate = new Date(baseDate);
            endDate.setDate(0); // Tanggal 0 bulan ini = Tgl Terakhir Bulan Lalu
            endDate.setHours(16, 59, 59, 999); // 23:59 WIB

            // Karena ini masa lalu, strictHistory sama dengan endDate
            strictHistoryDate = new Date(endDate);
            break;

          case '2m':
            // 2 Bulan Lalu FULL
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 2);
            startDate.setHours(-7, 0, 0, 0);

            endDate = new Date(baseDate);
            endDate.setMonth(baseDate.getMonth() - 1);
            endDate.setDate(0);
            endDate.setHours(16, 59, 59, 999);

            strictHistoryDate = new Date(endDate);
            break;

          case '3m':
             // 3 Bulan Lalu FULL
            startDate = new Date(baseDate);
            startDate.setMonth(baseDate.getMonth() - 3);
            startDate.setHours(-7, 0, 0, 0);

            endDate = new Date(baseDate);
            endDate.setMonth(baseDate.getMonth() - 2);
            endDate.setDate(0);
            endDate.setHours(16, 59, 59, 999);

            strictHistoryDate = new Date(endDate);
            break;

          case 'today':
            startDate = new Date();
            startDate.setHours(-7, 0, 0, 0);
            endDate = new Date();
            endDate.setDate(endDate.getDate() + 16);
            break;

          default:
            startDate = new Date();
            startDate.setHours(-7, 0, 0, 0);
            endDate = new Date();
            endDate.setDate(endDate.getDate() + 16);
            break;
        }
      }

      console.log(`\n📅 [OpenMeteo] Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      const result = await openMeteoService.getOpenMeteoData(name, startDate, endDate, strictHistoryDate);

      if (!result) {
        return res.status(404).json({ success: false, message: `No data` });
      }

      // Transformasi 5h
      if (rangeQuery === '5h') {
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
}

export default new OpenMeteoController();

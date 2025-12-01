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

      // Variable baru untuk menampung batas history strict
      let strictHistoryDate: Date | undefined = undefined;

      // CASE 1: Tanggal Spesifik
      if (dateQuery && isValidDateString(dateQuery)) {
        const specificDate = new Date(dateQuery);
        startDate = new Date(specificDate);
        startDate.setHours(-7, 0, 0, 0);

        endDate = new Date(specificDate);
        endDate.setHours(16, 59, 59, 999);
      }
      // CASE 2: Range Filter
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

          case '1w':
            startDate.setDate(startDate.getDate() - 7);
            startDate.setHours(-7, 0, 0, 0);
            // 1w biasanya mau exclude hari ini
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(strictHistoryDate.getDate() - 1); // Kemarin
            strictHistoryDate.setHours(16, 59, 59, 999);
            break;

          case '1m':
            startDate.setMonth(startDate.getMonth() - 1);
            startDate.setDate(1);
            startDate.setHours(-7, 0, 0, 0);

            // STRICT: History stop di akhir bulan lalu
            strictHistoryDate = new Date();
            strictHistoryDate.setDate(0); // Tanggal 0 = Akhir bulan lalu
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
            // Hari ini tidak perlu strictHistoryDate, biarkan ambil semua history yang ada
            break;
        }
      }

      console.log(`\n📅 [OpenMeteo] Filter: ${startDate.toISOString()} s/d ${endDate.toISOString()}`);

      // Panggil Service dengan parameter ke-4 (strictHistoryDate)
      const result = await openMeteoService.getOpenMeteoData(name, startDate, endDate, strictHistoryDate);

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

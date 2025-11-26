// src/controllers/rainfall.controller.ts
import { Request, Response, NextFunction } from 'express';
import rainfallService from '../services/rainfall.service';
import { ApiResponse } from '../types/response.types';
import { isValidDateString } from '../utils/dateHelper';

export class RainfallController {

  async getRainfallByPumpHouse(req: Request, res: Response, next: NextFunction) {
    try {
      // Ambil nama pompa dari URL parameter
      const { name } = req.params;
      // Ambil tanggal dari Query param (opsional)
      const dateQuery = req.query.date as string;

      // Tentukan waktu referensi (Default: Sekarang)
      let referenceDate = new Date();

      // Jika user request tanggal spesifik
      if (dateQuery) {
        if (!isValidDateString(dateQuery)) {
           return res.status(400).json({
             success: false,
             error: 'Invalid date format. Use ISO format (e.g., 2025-11-25T23:00:00)'
           });
        }
        referenceDate = new Date(dateQuery);
      }

      // Panggil Service
      const result = await rainfallService.getPumpHouseWindowData(name, referenceDate);

      if (!result) {
        return res.status(404).json({
          success: false,
          message: `No rainfall data found for '${name}' around ${referenceDate.toISOString()}`
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

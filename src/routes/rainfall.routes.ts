// src/routes/rainfall.routes.ts
import { Router } from 'express';
import rainfallController from '../controllers/rainfall.controller';

const router = Router();

// Route untuk data spesifik pompa (Window +/- 32 menit)
// Contoh: /api/rainfall/pump-house/Ancol
router.get('/pump-house/:name', rainfallController.getRainfallByPumpHouse.bind(rainfallController));

// Route untuk data radar terakhir (Full Map)
router.get('/latest', rainfallController.getLatestRainfall.bind(rainfallController));

export default router;

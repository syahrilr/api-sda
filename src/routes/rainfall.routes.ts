// src/routes/rainfall.routes.ts
import { Router } from 'express';
import rainfallController from '../controllers/rainfall.controller';

const router = Router();

/**
 * Route: Get Data Curah Hujan (Radar) per Rumah Pompa
 * Endpoint: GET /api/rainfall/pump-house/:name
 * * Query Params yang didukung:
 * 1. ?date=YYYY-MM-DD  -> Mengambil data tanggal spesifik
 * 2. ?range=today      -> Hari ini (Default)
 * 3. ?range=1w         -> 1 Minggu terakhir
 * 4. ?range=1m         -> 1 Bulan terakhir
 * 5. ?range=2m         -> 2 Bulan terakhir
 * 6. ?range=3m         -> 3 Bulan terakhir
 * * Contoh: /api/rainfall/pump-house/Ancol?range=1w
 */
router.get('/pump-house/:name', rainfallController.getRainfallByPumpHouse.bind(rainfallController));

// Route: Get Data Radar Terakhir (Full Map Image & Metadata)
router.get('/latest', rainfallController.getLatestRainfall.bind(rainfallController));

export default router;

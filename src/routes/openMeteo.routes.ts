// src/routes/openMeteo.routes.ts
import { Router } from 'express';
import openMeteoController from '../controllers/openMeteo.controller';

const router = Router();

/**
 * Route: Get Data Curah Hujan (OpenMeteo) per Rumah Pompa
 * Endpoint: GET /api/open-meteo/pump-house/:name
 * * Query Params yang didukung:
 * 1. ?date=YYYY-MM-DD  -> Mengambil data tanggal spesifik
 * 2. ?range=today      -> Hari ini + Prediksi 48 jam (Default)
 * 3. ?range=1w         -> 1 Minggu terakhir + Prediksi
 * 4. ?range=1m         -> 1 Bulan terakhir + Prediksi
 * 5. ?range=2m         -> 2 Bulan terakhir + Prediksi
 * 6. ?range=3m         -> 3 Bulan terakhir + Prediksi
 * * Contoh: /api/open-meteo/pump-house/Ancol?range=1m
 */
router.get('/pump-house/:name', openMeteoController.getRainfall.bind(openMeteoController));

export default router;

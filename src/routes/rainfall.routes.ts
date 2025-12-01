import { Router } from 'express';
import rainfallController from '../controllers/rainfall.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: Rainfall
 *     description: API Data Radar (Jangka Pendek)
 */

/**
 * @swagger
 * /api/rainfall/pump-house/{name}:
 *   get:
 *     summary: Ambil data curah hujan Radar per Pompa
 *     tags: [Rainfall]
 *     parameters:
 *       - in: path
 *         name: name
 *         schema:
 *           type: string
 *         required: true
 *         description: Nama rumah pompa
 *         example: Rumah Pompa Pulomas 2
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [32min, today, 1w, 1m, 2m, 3m]
 *         description: Filter waktu
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         description: Tanggal spesifik (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: Sukses
 *       404:
 *         description: Data tidak ditemukan
 */
router.get('/pump-house/:name', rainfallController.getRainfallByPumpHouse.bind(rainfallController));

/**
 * @swagger
 * /api/rainfall/latest:
 *   get:
 *     summary: Ambil data & gambar radar terakhir
 *     tags: [Rainfall]
 *     responses:
 *       200:
 *         description: Sukses
 */
router.get('/latest', rainfallController.getLatestRainfall.bind(rainfallController));

export default router;

import { Router } from 'express';
import openMeteoController from '../controllers/openMeteo.controller';

const router = Router();

/**
 * @swagger
 * tags:
 *   - name: OpenMeteo
 *     description: API Prediksi Jangka Panjang
 */

/**
 * @swagger
 * /api/open-meteo/pump-house/{name}:
 *   get:
 *     summary: Ambil data History & Prediksi Panjang
 *     tags: [OpenMeteo]
 *     parameters:
 *       - in: path
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: Nama rumah pompa
 *         example: Rumah Pompa Pulomas 2
 *       - in: query
 *         name: range
 *         schema:
 *           type: string
 *           enum: [5h, today, 1w, 1m, 2m, 3m]
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
 *         description: Data kosong
 */
router.get('/pump-house/:name', openMeteoController.getRainfall.bind(openMeteoController));

export default router;

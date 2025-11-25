import { Router } from 'express';
import rainfallController from '../controllers/rainfall.controller';

const router = Router();

/**
 * @route   GET /api/rainfall/today
 * @desc    Get all rainfall data for today
 * @access  Public
 */
router.get('/today', rainfallController.getTodayRainfall.bind(rainfallController));

/**
 * @route   GET /api/rainfall/date/:date
 * @desc    Get rainfall data by specific date (YYYY-MM-DD)
 * @access  Public
 */
router.get('/date/:date', rainfallController.getRainfallByDate.bind(rainfallController));

/**
 * @route   GET /api/rainfall/pump-house/:name
 * @desc    Get rainfall data by pump house name
 * @access  Public
 */
router.get('/pump-house/:name', rainfallController.getRainfallByPumpHouse.bind(rainfallController));

/**
 * @route   GET /api/rainfall/latest
 * @desc    Get latest rainfall data
 * @access  Public
 */
router.get('/latest', rainfallController.getLatestRainfall.bind(rainfallController));

/**
 * @route   GET /api/rainfall/pump-houses
 * @desc    Get all pump houses with rainfall today
 * @access  Public
 */
router.get('/pump-houses', rainfallController.getPumpHouses.bind(rainfallController));

/**
 * @route   GET /api/rainfall/summary/today
 * @desc    Get rainfall summary for today
 * @access  Public
 */
router.get('/summary/today', rainfallController.getTodaySummary.bind(rainfallController));

/**
 * @route   GET /api/rainfall/station/:station
 * @desc    Get rainfall data by radar station (e.g., JAK)
 * @access  Public
 */
router.get('/station/:station', rainfallController.getRainfallByStation.bind(rainfallController));

/**
 * @route   GET /api/rainfall/alerts
 * @desc    Get rainfall alerts (high rain rate locations)
 * @query   minRainRate - Minimum rain rate threshold (default: 5)
 * @access  Public
 */
router.get('/alerts', rainfallController.getRainfallAlerts.bind(rainfallController));

export default router;

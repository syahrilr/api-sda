import express from 'express';
import dotenv from 'dotenv';
import { dbManager } from './config/database';
import rainfallRoutes from './routes/rainfall.routes';
import openMeteoRoutes from './routes/openMeteo.routes';
import rainfallService from './services/rainfall.service';
import openMeteoService from './services/openMeteo.service';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
app.use(express.json());

const initializeApp = async () => {
  try {
    // 1. Buka Koneksi Database
    await dbManager.connectAll();

    const mainConn = dbManager.getConnection('main');     // db_curah_hujan
    const predictConn = dbManager.getConnection('predict'); // db-predict-ch

    // 2. Setup RADAR Service (Sistem Lama)
    // Radar History ada di 'main', Radar Prediksi juga ada di 'main'
    rainfallService.setConnections(mainConn as any, mainConn as any);

    // 3. Setup OPEN-METEO Service (Sistem Baru)
    // History ada di 'main', Prediksi ada di 'predict' (db-predict-ch)
    openMeteoService.setConnections(mainConn as any, predictConn as any);

    console.log('✅ All Services initialized successfully');

  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  }
};

// Daftarkan Routes
app.use('/api/rainfall', rainfallRoutes);       // Endpoint Lama
app.use('/api/open-meteo', openMeteoRoutes);    // Endpoint Baru

app.get('/health', (req, res) => {
    const main = dbManager.getConnection('main');
    const predict = dbManager.getConnection('predict');
    res.json({
        status: 'OK',
        timestamp: new Date(),
        db_main: main && (main as any).readyState === 1 ? 'UP' : 'DOWN',
        db_predict: predict && (predict as any).readyState === 1 ? 'UP' : 'DOWN'
    });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
  });
});

export default app;

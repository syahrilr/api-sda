import express from 'express';
import dotenv from 'dotenv';
import { dbManager } from './config/database';
import rainfallRoutes from './routes/rainfall.routes';
import rainfallService from './services/rainfall.service';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
app.use(express.json());

const initializeApp = async () => {
  try {
    // Connect ke KEDUA database
    await dbManager.connectAll();

    // Setup service dengan kedua koneksi
    const radarConn = dbManager.getConnection('curahHujan');
    const predictConn = dbManager.getConnection('prediksi');

    rainfallService.setConnections(radarConn as any, predictConn as any);

    console.log('✅ App initialized successfully with Dual DB connection');

  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  }
};

app.use('/api/rainfall', rainfallRoutes);

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timeUTC: new Date().toISOString(),
    connections: {
      radar: dbManager.getConnection('curahHujan') ? 'Connected' : 'Down',
      prediction: dbManager.getConnection('prediksi') ? 'Connected' : 'Down',
    }
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 3000;

initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🕒 Server Time (UTC): ${new Date().toISOString()}`);
  });
});

process.on('SIGINT', async () => {
  await dbManager.closeAll();
  process.exit(0);
});

export default app;

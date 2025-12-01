import express from 'express';
import dotenv from 'dotenv';
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './config/swagger';
import { dbManager } from './config/database';
import rainfallRoutes from './routes/rainfall.routes';
import openMeteoRoutes from './routes/openMeteo.routes';
import rainfallService from './services/rainfall.service';
import openMeteoService from './services/openMeteo.service';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
app.use(express.json());

// ==========================================
// 1. INITIALIZE APP & DATABASE
// ==========================================
const initializeApp = async () => {
  try {
    await dbManager.connectAll();

    const mainConn = dbManager.getConnection('main');     // db_curah_hujan
    const predictConn = dbManager.getConnection('predict'); // db-predict-ch

    rainfallService.setConnections(mainConn as any, mainConn as any);
    openMeteoService.setConnections(mainConn as any, predictConn as any);

    console.log('✅ All Services initialized successfully');

  } catch (error) {
    console.error('Failed to connect to databases:', error);
    process.exit(1);
  }
};

// ==========================================
// 2. REGISTER ROUTES
// ==========================================

// API Routes
app.use('/api/rainfall', rainfallRoutes);
app.use('/api/open-meteo', openMeteoRoutes);

// Health Check
app.use('/health', (req, res) => {
    const main = dbManager.getConnection('main');
    const predict = dbManager.getConnection('predict');
    res.json({
        status: 'OK',
        timestamp: new Date(),
        db_main: main && (main as any).readyState === 1 ? 'UP' : 'DOWN',
        db_predict: predict && (predict as any).readyState === 1 ? 'UP' : 'DOWN'
    });
});

// ==========================================
// 3. SWAGGER (ROOT /)
// ==========================================
// Diletakkan di bawah route API agar tidak mengganggu route lain
// Akses dokumentasi langsung di http://IP:PORT/
app.use('/', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Global Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// ==========================================
// 4. START SERVER
// ==========================================
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    // Update Log Info
    console.log(`📄 Swagger Docs available at http://192.168.5.173:${PORT}/`);
  });
});

export default app;

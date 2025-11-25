// src/index.ts
import express from 'express';
import dotenv from 'dotenv';
import { dbManager } from './config/database';
import rainfallRoutes from './routes/rainfall.routes';
import rainfallService from './services/rainfall.service';
import { errorHandler } from './middleware/errorHandler';

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(express.json());

// Initialize Database Connection
const initializeApp = async () => {
  try {
    // Connect to default database (db_curah_hujan)
    const connection = await dbManager.connectDefault();

    // Set connection to service
    rainfallService.setConnection(connection as any);

    // Optional: Connect to multiple databases
    // await dbManager.connectMultiple([
    //   { name: 'db_curah_hujan', connectionName: 'curahHujan' },
    //   { name: 'db_pompa', connectionName: 'pompa' },
    // ]);

  } catch (error) {
    console.error('Failed to connect to database');
    process.exit(1);
  }
};

// Routes
app.use('/api/rainfall', rainfallRoutes);

// Health check
app.get('/health', (req, res) => {
  const connection = dbManager.getConnection('curahHujan');
  const isConnected = connection && (connection as any).readyState === 1;

  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    mongodb: isConnected ? 'Connected' : 'Disconnected',
    database: connection ? (connection as any).name : 'N/A'
  });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 3000;

// Start server
initializeApp().then(() => {
  app.listen(PORT, () => {
    console.log('');
    console.log('🚀 Server running on http://localhost:' + PORT);
    console.log('');
    console.log('📊 API Endpoints:');
    console.log('   GET /api/rainfall/today');
    console.log('   GET /api/rainfall/date/:date');
    console.log('   GET /api/rainfall/pump-house/:name');
    console.log('   GET /api/rainfall/latest');
    console.log('   GET /api/rainfall/pump-houses');
    console.log('   GET /api/rainfall/summary/today');
    console.log('   GET /api/rainfall/station/:station');
    console.log('   GET /api/rainfall/alerts');
    console.log('');
  });
});

// Handle shutdown gracefully
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...');
  await dbManager.closeAll();
  process.exit(0);
});

export default app;

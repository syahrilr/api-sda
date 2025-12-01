// index.ts atau swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';
import dotenv from 'dotenv';

dotenv.config();

const PORT = process.env.PORT || 8001;
const API_URL = process.env.API_URL || `http://localhost:${PORT}`;

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'API Backend Curah Hujan & OpenMeteo',
      version: '1.0.0',
      description: 'Dokumentasi API untuk monitoring curah hujan real-time dan prediksi.',
      contact: {
        name: 'Tim Developer',
      },
    },
    servers: [
      {
        url: API_URL,
        description: process.env.NODE_ENV === 'production'
          ? 'Production Server'
          : 'Development Server',
      },
      // Opsional: tampilkan semua server untuk fleksibilitas
      ...(process.env.SHOW_ALL_SERVERS === 'true' ? [
        {
          url: `http://localhost:${PORT}`,
          description: 'Local Development',
        },
        {
          url: 'http://192.168.5.173:8001',
          description: 'Server Kantor',
        },
      ] : []),
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

export const swaggerSpec = swaggerJsdoc(options);

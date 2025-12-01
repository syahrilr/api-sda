import swaggerJsdoc from 'swagger-jsdoc';

const PORT = process.env.PORT || 8001;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Tentukan server URL berdasarkan environment
const getServerUrl = () => {
  if (NODE_ENV === 'production') {
    return 'http://192.168.5.173:8001';
  }
  return `http://localhost:${PORT}`;
};

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
        url: getServerUrl(),
        description: NODE_ENV === 'production'
          ? 'Production Server'
          : 'Local Development Server',
      },
    ],
  },
  apis: ['./src/routes/*.ts', './dist/routes/*.js'],
};

console.log(`🌐 Swagger Server URL: ${getServerUrl()} (${NODE_ENV})`);

export const swaggerSpec = swaggerJsdoc(options);

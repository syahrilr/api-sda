import mongoose from 'mongoose';

interface DatabaseConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  authSource: string;
}

interface DatabaseConnections {
  curahHujan: typeof mongoose; // Untuk RainfallRecord (Radar)
  prediksi: typeof mongoose;   // Untuk Prediction (Forecast) - SEKARANG DI DB YANG SAMA
}

class DatabaseManager {
  private config: DatabaseConfig;
  public connections: Partial<DatabaseConnections> = {};

  constructor() {
    this.config = {
      host: process.env.MONGODB_HOST || '192.168.5.192',
      port: process.env.MONGODB_PORT || '27017',
      user: process.env.MONGODB_USER || 'sda',
      password: process.env.MONGODB_PASSWORD || '',
      authSource: process.env.MONGODB_AUTH_SOURCE || 'admin',
    };
  }

  private generateURI(dbName: string): string {
    const { host, port, user, password, authSource } = this.config;
    if (user && password) {
      return `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=${authSource}&directConnection=true`;
    }
    return `mongodb://${host}:${port}/${dbName}?directConnection=true`;
  }

  async connect(dbName: string, connectionName: keyof DatabaseConnections) {
    try {
      const uri = this.generateURI(dbName);
      const connection = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }).asPromise();

      this.connections[connectionName] = connection as any;
      console.log(`✅ Connected to MongoDB: ${dbName} (${connectionName})`);
      return connection;
    } catch (error) {
      console.error(`❌ Connection error (${dbName}):`, error instanceof Error ? error.message : error);
      throw error;
    }
  }

  /**
   * Connect ke database
   */
  async connectAll() {
    const dbName = process.env.DB_CURAH_HUJAN || 'db_curah_hujan';

    // 1. Database Radar (db_curah_hujan)
    await this.connect(dbName, 'curahHujan');

    // 2. Database Prediksi (SEKARANG SAMA: db_curah_hujan)
    // Karena Python script menyimpannya di db_curah_hujan > prediksi
    await this.connect(dbName, 'prediksi');
  }

  getConnection(name: keyof DatabaseConnections) {
    return this.connections[name];
  }

  async closeAll() {
    const closePromises = Object.values(this.connections).map(conn => {
      if (conn) return conn.disconnect();
      return Promise.resolve();
    });
    await Promise.all(closePromises);
    console.log('🔌 All database connections closed');
  }
}

export const dbManager = new DatabaseManager();

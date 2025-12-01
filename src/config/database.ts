import mongoose from 'mongoose';

interface DatabaseConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  authSource: string;
}

interface DatabaseConnections {
  main: typeof mongoose;    // db_curah_hujan (Berisi: Radar History, Radar Prediksi, OpenMeteo History)
  predict: typeof mongoose; // db-predict-ch (Berisi: OpenMeteo Prediksi)
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

  async connectAll() {
    const dbMainName = process.env.DB_CURAH_HUJAN || 'db_curah_hujan';
    const dbPredictName = 'db-predict-ch';

    // 1. Koneksi Utama (Menampung data Radar & History OpenMeteo)
    await this.connect(dbMainName, 'main');

    // 2. Koneksi Khusus Prediksi OpenMeteo
    await this.connect(dbPredictName, 'predict');
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

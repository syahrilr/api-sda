import mongoose from 'mongoose';

interface DatabaseConfig {
  host: string;
  port: string;
  user: string;
  password: string;
  authSource: string;
}

interface DatabaseConnections {
  curahHujan: typeof mongoose;
  // Tambahkan database lain di sini
  // pompa?: typeof mongoose;
  // monitoring?: typeof mongoose;
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

  /**
   * Generate MongoDB connection URI
   */
  private generateURI(dbName: string): string {
    const { host, port, user, password, authSource } = this.config;

    if (user && password) {
      return `mongodb://${user}:${password}@${host}:${port}/${dbName}?authSource=${authSource}&directConnection=true`;
    }

    return `mongodb://${host}:${port}/${dbName}?directConnection=true`;
  }

  /**
   * Connect to a specific database
   */
  async connect(dbName: string, connectionName: keyof DatabaseConnections = 'curahHujan') {
    try {
      const uri = this.generateURI(dbName);

      const connection = await mongoose.createConnection(uri, {
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      }).asPromise();

      this.connections[connectionName] = connection as any;

      console.log(`✅ Connected to MongoDB: ${dbName}`);
      console.log(`📍 Database: ${connection.name}`);
      console.log(`🔗 Host: ${connection.host}:${connection.port}`);

      return connection;
    } catch (error) {
      console.error(`❌ MongoDB connection error (${dbName}):`, error instanceof Error ? error.message : error);
      this.printTroubleshooting();
      throw error;
    }
  }

  /**
   * Connect to default database (db_curah_hujan)
   */
  async connectDefault() {
    const dbName = process.env.DB_CURAH_HUJAN || 'db_curah_hujan';
    return this.connect(dbName, 'curahHujan');
  }

  /**
   * Connect to multiple databases
   */
  async connectMultiple(databases: { name: string; connectionName: keyof DatabaseConnections }[]) {
    const promises = databases.map(db => this.connect(db.name, db.connectionName));
    return Promise.all(promises);
  }

  /**
   * Get connection by name
   */
  getConnection(name: keyof DatabaseConnections) {
    return this.connections[name];
  }

  /**
   * Close all connections
   */
  async closeAll() {
    const closePromises = Object.values(this.connections).map(conn => {
      if (conn) return conn.disconnect();
      return Promise.resolve();
    });

    await Promise.all(closePromises);
    console.log('🔌 All database connections closed');
  }

  /**
   * Print troubleshooting tips
   */
  private printTroubleshooting() {
    console.log('');
    console.log('💡 Troubleshooting Tips:');
    console.log('   1. Check if MongoDB is running');
    console.log('   2. Verify credentials in .env file');
    console.log('   3. Check network connectivity');
    console.log('   4. Verify authSource is correct (usually "admin")');
    console.log('   5. Check if user has access to the database');
    console.log('');
  }
}

// Export singleton instance
export const dbManager = new DatabaseManager();

// Export simple connect function for backward compatibility
export const connectDB = async () => {
  return dbManager.connectDefault();
};

import { Schema, Connection, Document } from 'mongoose';

// --- MODEL HISTORY (db_curah_hujan) ---
// Format: { date: "2025-11-01", hourly: { "10": { time: "...", rain: 0 } } }
export interface IHistoryOM extends Document {
  date: string;
  hourly: Record<string, {
    time: string;
    rain: number;
    precipitation: number;
  }>;
  timezone: string;
}

const HistoryOMSchema = new Schema<IHistoryOM>({
  date: String,
  hourly: Schema.Types.Mixed,
  timezone: String
}, { strict: false });

// --- MODEL PREDIKSI (db-predict-ch) ---
// Format: { pumpName: "...", hourly: { time: [], rain: [] } }
export interface IPredictOM extends Document {
  pumpName: string;
  pumpLat: number;
  pumpLng: number;
  hourly: {
    time: string[];
    rain: number[];
  };
  fetchedAt: Date;
}

const PredictOMSchema = new Schema<IPredictOM>({
  pumpName: String,
  pumpLat: Number,
  pumpLng: Number,
  hourly: {
    time: [String],
    rain: [Number]
  },
  fetchedAt: Date
}, { strict: false });

// Helper Functions
export const getHistoryModel = (conn: Connection, collectionName: string) => {
  return conn.model<IHistoryOM>(collectionName, HistoryOMSchema, collectionName);
};

export const getPredictModel = (conn: Connection, collectionName: string) => {
  return conn.model<IPredictOM>(collectionName, PredictOMSchema, collectionName);
};

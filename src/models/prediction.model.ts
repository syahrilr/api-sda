import { Schema, Connection, Document } from 'mongoose';

// Interface untuk satu lokasi di dalam array prediksi
export interface IPredictionLocation {
  name: string;
  lat: number;
  lng: number;
  rain_rate: number;
  intensity: string;
  confidence: number;
  pixel_x: number;
  pixel_y: number;
  dbz: number;
}

// Interface Dokumen Utama
export interface IPrediction extends Document {
  timestamp: string; // String waktu pembuatan prediksi (WIB)
  task_id: string;
  createdAt: Date;
  // Struktur dinamis: { "10": [Array Lokasi], "20": [Array Lokasi], ... }
  predictions: Record<string, IPredictionLocation[]>;
}

const PredictionSchema = new Schema<IPrediction>({
  timestamp: String,
  task_id: String,
  createdAt: Date,
  predictions: Schema.Types.Mixed // Menggunakan Mixed karena key-nya dinamis angka ("10", "20")
}, {
  collection: 'prediksi',
  strict: false
});

export const getPredictionModel = (connection: Connection) => {
  return connection.model<IPrediction>('Prediction', PredictionSchema);
};

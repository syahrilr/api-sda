// src/types/response.types.ts

export interface TimeSeriesData {
  time: string;  // ISO String time atau String format Radar
  value: number; // Rain Rate (mm/jam)
}

export interface RainfallSummary {
  total_accumulation: number; // Estimasi total curah hujan (mm)
  intensity_count: {
    no_rain: number;    // 0 mm
    light: number;      // 0.1 - 5 mm
    moderate: number;   // 5 - 10 mm
    heavy: number;      // 10 - 20 mm
    very_heavy: number; // > 20 mm
  };
}

// Struktur response khusus untuk chart/mapping
export interface RainfallDataResult {
  pumpHouse: string;
  bounds: number[][];    // [[sw_lat, sw_lng], [ne_lat, ne_lng]]
  location: number[];    // [lat, lng]

  // Update: Data dipisah
  history: TimeSeriesData[];  // Data Aktual (Histori)
  forecast: TimeSeriesData[]; // Data Prediksi (Masa Depan)

  // Update: Summary statistik
  summary: RainfallSummary;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  result?: RainfallDataResult;
  // Field legacy (opsional)
  data?: any;
}

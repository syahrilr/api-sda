export interface TimeSeriesData {
  time: string;  // ISO String time
  value: number; // Rain Rate
}

// Struktur response khusus untuk chart/mapping
export interface RainfallDataResult {
  pumpHouse: string;
  bounds: number[][];    // [[sw_lat, sw_lng], [ne_lat, ne_lng]]
  location: number[];    // [lat, lng]
  data: TimeSeriesData[];
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  // Result fleksibel, bisa berisi single object atau list, tapi untuk request ini kita pakai result
  result?: RainfallDataResult;
  // Field lama untuk backward compatibility jika perlu
  count?: number;
  date?: string;
  data?: any;
}

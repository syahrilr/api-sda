export interface ApiResponse {
  success: boolean;
  count?: number;
  date?: string;
  pumpHouse?: string;
  station?: string;
  minRainRate?: number;
  data?: any;
  error?: string;
  message?: string;
}

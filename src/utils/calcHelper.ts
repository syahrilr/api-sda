// src/utils/calcHelper.ts
import { TimeSeriesData, RainfallSummary } from '../types/response.types';

export const calculateSummary = (data: TimeSeriesData[]): RainfallSummary => {
  const summary: RainfallSummary = {
    total_accumulation: 0,
    intensity_count: {
      no_rain: 0,
      light: 0,
      moderate: 0,
      heavy: 0,
      very_heavy: 0
    }
  };

  data.forEach(item => {
    const val = item.value;

    // Hitung akumulasi
    // Catatan: Jika data per 10 menit, dan value adalah mm/jam (rain rate),
    // maka curah hujan real = value / 6.
    // Namun untuk statistik sederhana kita jumlahkan nilai raw dulu atau sesuaikan kebutuhan.
    // Di sini kita pakai asumsi penjumlahan nilai rate untuk indikator kasar.
    summary.total_accumulation += val;

    // Klasifikasi BMKG (Berbasis intensitas mm/jam)
    if (val <= 0.1) {
      summary.intensity_count.no_rain++;
    } else if (val <= 5) {
      summary.intensity_count.light++;
    } else if (val <= 10) {
      summary.intensity_count.moderate++;
    } else if (val <= 20) {
      summary.intensity_count.heavy++;
    } else {
      summary.intensity_count.very_heavy++;
    }
  });

  // Bulatkan akumulasi 2 desimal
  summary.total_accumulation = parseFloat(summary.total_accumulation.toFixed(2));

  return summary;
};

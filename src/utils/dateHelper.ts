// src/utils/dateHelper.ts

export const getTimeWindow = (date: Date = new Date()) => {
  // UBAH JADI 60 MENIT (1 JAM)
  // Agar jika data radar telat update (gap > 32 menit), tetap bisa terambil.
  const windowSize = 60 * 60 * 1000;

  const startTime = new Date(date.getTime() - windowSize);
  const endTime = new Date(date.getTime() + windowSize);

  return { startTime, endTime };
};

export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime());
};

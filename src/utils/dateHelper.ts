/**
 * Get start and end of day for a given date
 * @param date - Target date (defaults to today)
 * @returns Object containing startOfDay and endOfDay
 */
export const getDayRange = (date: Date = new Date()) => {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  return { startOfDay, endOfDay };
};

/**
 * Format date to YYYY-MM-DD
 * @param date - Date to format
 * @returns Formatted date string
 */
export const formatDate = (date: Date): string => {
  return date.toISOString().split('T')[0];
};

/**
 * Validate date string format (YYYY-MM-DD)
 * @param dateString - Date string to validate
 * @returns Boolean indicating if date is valid
 */
export const isValidDateString = (dateString: string): boolean => {
  const date = new Date(dateString);
  return !isNaN(date.getTime()) && /^\d{4}-\d{2}-\d{2}$/.test(dateString);
};

/**
 * Get date range for the last N days
 * @param days - Number of days to go back
 * @returns Object containing startDate and endDate
 */
export const getLastNDaysRange = (days: number) => {
  const endDate = new Date();
  endDate.setHours(23, 59, 59, 999);

  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  startDate.setHours(0, 0, 0, 0);

  return { startDate, endDate };
};

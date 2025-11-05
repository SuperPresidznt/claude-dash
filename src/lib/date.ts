import { utcToZonedTime, zonedTimeToUtc, format } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export const DEFAULT_TIMEZONE = 'America/Chicago';

export const toZonedDate = (date: Date | string, tz = DEFAULT_TIMEZONE) => {
  return utcToZonedTime(date, tz);
};

export const formatZoned = (date: Date, fmt: string, tz = DEFAULT_TIMEZONE) => {
  return format(date, fmt, { timeZone: tz });
};

export const todayRange = (tz = DEFAULT_TIMEZONE) => {
  const now = new Date();
  const start = zonedTimeToUtc(startOfDay(utcToZonedTime(now, tz)), tz);
  const end = zonedTimeToUtc(endOfDay(utcToZonedTime(now, tz)), tz);
  return { start, end };
};

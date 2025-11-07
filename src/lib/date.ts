import { toZonedTime, fromZonedTime, formatInTimeZone } from 'date-fns-tz';
import { startOfDay, endOfDay } from 'date-fns';

export const DEFAULT_TIMEZONE = 'America/Chicago';

export const toZonedDate = (date: Date | string, tz = DEFAULT_TIMEZONE) => {
  return toZonedTime(date, tz);
};

export const formatZoned = (date: Date, fmt: string, tz = DEFAULT_TIMEZONE) => {
  return formatInTimeZone(date, tz, fmt);
};

export const todayRange = (tz = DEFAULT_TIMEZONE) => {
  const now = new Date();
  const zonedNow = toZonedTime(now, tz);
  const start = fromZonedTime(startOfDay(zonedNow), tz);
  const end = fromZonedTime(endOfDay(zonedNow), tz);
  return { start, end };
};

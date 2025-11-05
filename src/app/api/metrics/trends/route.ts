import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { subDays, startOfDay, formatISO, startOfWeek } from 'date-fns';
import { DEFAULT_TIMEZONE, toZonedDate } from '@/lib/date';

const median = (values: number[]) => {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export async function GET() {
  const user = await requireUser();
  const tz = user.timezone ?? DEFAULT_TIMEZONE;
  const since = subDays(new Date(), 30);

  const [starts, studies, actions, cashSnapshots, macroGoals] = await Promise.all([
    prisma.startEvent.findMany({
      where: { userId: user.id, timestamp: { gte: since } },
      orderBy: { timestamp: 'asc' }
    }),
    prisma.studySession.findMany({
      where: { userId: user.id, startAt: { gte: since } },
      orderBy: { startAt: 'asc' }
    }),
    prisma.action.findMany({
      where: { userId: user.id, completedAt: { gte: since } },
      include: { idea: true },
      orderBy: { completedAt: 'asc' }
    }),
    prisma.cashSnapshot.findMany({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' },
      take: 10
    }),
    prisma.macroGoal.findMany({ where: { userId: user.id }, orderBy: { title: 'asc' } })
  ]);

  const startBuckets = new Map<string, number>();
  starts.forEach((start) => {
    const local = toZonedDate(start.timestamp, tz);
    const key = formatISO(startOfDay(local), { representation: 'date' });
    startBuckets.set(key, (startBuckets.get(key) ?? 0) + 1);
  });

  const startsPerDay = Array.from({ length: 14 }).map((_, idx) => {
    const day = subDays(new Date(), 13 - idx);
    const local = toZonedDate(day, tz);
    const key = formatISO(startOfDay(local), { representation: 'date' });
    return { date: key, value: startBuckets.get(key) ?? 0 };
  });

  const studyBuckets = new Map<string, number>();
  studies.forEach((session) => {
    const local = toZonedDate(session.startAt, tz);
    const key = formatISO(startOfWeek(local, { weekStartsOn: 1 }), { representation: 'date' });
    studyBuckets.set(key, (studyBuckets.get(key) ?? 0) + session.minutes);
  });

  const studyTrend = Array.from(studyBuckets.entries())
    .map(([week, minutes]) => ({ week, minutes }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));

  const latencyBuckets = new Map<string, number[]>();
  actions.forEach((action) => {
    const local = toZonedDate(action.completedAt, tz);
    const key = formatISO(startOfWeek(local, { weekStartsOn: 1 }), { representation: 'date' });
    const latencyDays = Math.max(
      0,
      Math.round((action.completedAt.getTime() - action.idea.createdAt.getTime()) / (1000 * 60 * 60 * 24))
    );
    latencyBuckets.set(key, [...(latencyBuckets.get(key) ?? []), latencyDays]);
  });

  const latencyTrend = Array.from(latencyBuckets.entries())
    .map(([week, values]) => ({ week, medianLatency: median(values) }))
    .sort((a, b) => (a.week < b.week ? -1 : 1));

  const cashSeries = cashSnapshots
    .map((snapshot) => ({
      timestamp: snapshot.timestamp.toISOString(),
      cash: snapshot.cashOnHandCents
    }))
    .reverse();

  const weeklyChange = cashSeries.length >= 2 ? cashSeries[cashSeries.length - 1].cash - cashSeries[0].cash : 0;

  return NextResponse.json({
    startsPerDay,
    studyTrend,
    latencyTrend,
    cashSeries,
    weeklyChange,
    macroGoals
  });
}

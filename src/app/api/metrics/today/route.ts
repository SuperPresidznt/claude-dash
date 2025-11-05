import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { todayRange } from '@/lib/date';

export async function GET() {
  const user = await requireUser();
  const { start, end } = todayRange(user.timezone ?? undefined);

  const [starts, studyMinutesAgg, latestCash] = await Promise.all([
    prisma.startEvent.count({
      where: { userId: user.id, timestamp: { gte: start, lte: end } }
    }),
    prisma.studySession.aggregate({
      where: { userId: user.id, startAt: { gte: start, lte: end } },
      _sum: { minutes: true }
    }),
    prisma.cashSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' }
    })
  ]);

  return NextResponse.json({
    starts,
    studyMinutes: studyMinutesAgg._sum.minutes ?? 0,
    cash: latestCash?.cashOnHandCents ?? null,
    currency: user.currency
  });
}

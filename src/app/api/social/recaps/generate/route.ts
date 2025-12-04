import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { startOfWeek, endOfWeek, subWeeks } from 'date-fns';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { weekOffset = 0 } = await request.json();
  const targetDate = subWeeks(new Date(), weekOffset);
  const weekStart = startOfWeek(targetDate);
  const weekEnd = endOfWeek(targetDate);

  // Aggregate data from the week
  const [tasks, habits, pomodoros, checkIns, transactions] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id, completedAt: { gte: weekStart, lte: weekEnd } } }),
    prisma.habitCompletion.findMany({ where: { userId: user.id, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.pomodoroSession.findMany({ where: { userId: user.id, startTime: { gte: weekStart, lte: weekEnd }, completed: true } }),
    prisma.wellbeingCheckIn.findMany({ where: { userId: user.id, date: { gte: weekStart, lte: weekEnd } } }),
    prisma.cashflowTxn.findMany({ where: { userId: user.id, date: { gte: weekStart, lte: weekEnd } } }),
  ]);

  const content = {
    tasks: { completed: tasks.length, highPriority: tasks.filter(t => t.priority === 'urgent' || t.priority === 'high').length },
    habits: { completions: habits.length },
    focus: { pomodoroSessions: pomodoros.length, totalMinutes: pomodoros.reduce((sum, p) => sum + p.durationMinutes, 0) },
    wellbeing: { checkIns: checkIns.length, avgSleep: checkIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / checkIns.length || 0 },
    finance: {
      inflow: transactions.filter(t => t.direction === 'inflow').reduce((sum, t) => sum + t.amountCents, 0),
      outflow: transactions.filter(t => t.direction === 'outflow').reduce((sum, t) => sum + t.amountCents, 0),
    },
  };

  const recap = await prisma.weeklyRecap.create({
    data: { userId: user.id, weekStart, weekEnd, content },
  });

  // TODO: Send email to accountability partners

  return NextResponse.json(recap, { status: 201 });
}

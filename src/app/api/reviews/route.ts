import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from 'date-fns';

const createReviewSchema = z.object({
  type: z.enum(['weekly', 'monthly', 'quarterly', 'yearly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  highlights: z.array(z.string()).optional(),
  lowlights: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
});

async function generateReviewData(userId: string, startDate: Date, endDate: Date) {
  // Fetch finance summary
  const cashflowTxns = await prisma.cashflowTxn.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const income = cashflowTxns
    .filter(t => t.direction === 'inflow')
    .reduce((sum, t) => sum + t.amountCents, 0) / 100;

  const expenses = cashflowTxns
    .filter(t => t.direction === 'outflow')
    .reduce((sum, t) => sum + t.amountCents, 0) / 100;

  const financeSummary = {
    income,
    expenses,
    netCashflow: income - expenses,
    transactionCount: cashflowTxns.length,
  };

  // Fetch task summary
  const tasks = await prisma.task.findMany({
    where: {
      userId,
      createdAt: {
        lte: endDate,
      },
    },
  });

  const completedTasks = tasks.filter(t =>
    t.status === 'completed' &&
    t.completedAt &&
    t.completedAt >= startDate &&
    t.completedAt <= endDate
  );

  const taskSummary = {
    completed: completedTasks.length,
    total: tasks.filter(t => t.createdAt >= startDate).length,
    completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
  };

  // Fetch habit summary
  const habits = await prisma.habit.findMany({
    where: {
      userId,
      isActive: true,
    },
  });

  const habitCompletions = await prisma.habitCompletion.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const habitSummary = {
    totalHabits: habits.length,
    completions: habitCompletions.length,
    completionRate: habits.length > 0 ? (habitCompletions.length / habits.length) * 100 : 0,
  };

  // Fetch journal summary
  const journalEntries = await prisma.journalEntry.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
  });

  const avgSentiment = journalEntries.length > 0
    ? journalEntries.reduce((sum, e) => sum + (e.sentimentScore || 0), 0) / journalEntries.length
    : 0;

  const journalSummary = {
    entryCount: journalEntries.length,
    avgSentiment,
    sentimentTrend: avgSentiment > 0.2 ? 'positive' : avgSentiment < -0.2 ? 'negative' : 'neutral',
  };

  // Fetch pomodoro summary
  const pomodoroSessions = await prisma.pomodoroSession.findMany({
    where: {
      userId,
      startTime: {
        gte: startDate,
        lte: endDate,
      },
      completed: true,
    },
  });

  const pomodoroSummary = {
    sessionsCompleted: pomodoroSessions.length,
    totalMinutes: pomodoroSessions.reduce((sum, s) => sum + s.durationMinutes, 0),
  };

  return {
    financeSummary,
    taskSummary,
    habitSummary,
    journalSummary,
    pomodoroSummary,
  };
}

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');

    let where: any = { userId: session.user.id };

    if (type) {
      where.type = type;
    }

    const reviews = await prisma.review.findMany({
      where,
      orderBy: { startDate: 'desc' },
      take: 50,
    });

    return NextResponse.json(reviews);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createReviewSchema.parse(body);

    const startDate = new Date(validated.startDate);
    const endDate = new Date(validated.endDate);

    // Generate review data
    const reviewData = await generateReviewData(session.user.id, startDate, endDate);

    // Generate period label
    let period = '';
    if (validated.type === 'weekly') {
      period = `Week ${format(startDate, 'w yyyy')}`;
    } else if (validated.type === 'monthly') {
      period = format(startDate, 'MMMM yyyy');
    } else if (validated.type === 'quarterly') {
      period = `Q${Math.ceil((startDate.getMonth() + 1) / 3)} ${format(startDate, 'yyyy')}`;
    } else {
      period = format(startDate, 'yyyy');
    }

    const review = await prisma.review.create({
      data: {
        userId: session.user.id,
        type: validated.type,
        period,
        startDate,
        endDate,
        financeSummary: reviewData.financeSummary,
        taskSummary: reviewData.taskSummary,
        habitSummary: reviewData.habitSummary,
        journalSummary: reviewData.journalSummary,
        pomodoroSummary: reviewData.pomodoroSummary,
        highlights: validated.highlights || [],
        lowlights: validated.lowlights || [],
        actionItems: validated.actionItems || [],
      },
    });

    return NextResponse.json(review, { status: 201 });
  });
}

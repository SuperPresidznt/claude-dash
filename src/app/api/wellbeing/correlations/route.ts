import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { startOfDay, subDays } from 'date-fns';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const startDate = startOfDay(subDays(new Date(), days));

    // Fetch wellbeing data
    const checkIns = await prisma.wellbeingCheckIn.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate },
      },
      orderBy: { date: 'asc' },
    });

    // Fetch productivity metrics (tasks, pomodoros, habits)
    const tasks = await prisma.task.findMany({
      where: {
        userId: user.id,
        completedAt: { gte: startDate },
      },
      select: {
        completedAt: true,
      },
    });

    const pomodoros = await prisma.pomodoroSession.findMany({
      where: {
        userId: user.id,
        startTime: { gte: startDate },
        completed: true,
      },
      select: {
        startTime: true,
        durationMinutes: true,
      },
    });

    const habitCompletions = await prisma.habitCompletion.findMany({
      where: {
        userId: user.id,
        date: { gte: startDate },
      },
      select: {
        date: true,
      },
    });

    // Group productivity data by date
    const productivityByDate = new Map<string, any>();

    tasks.forEach(task => {
      if (!task.completedAt) return;
      const dateKey = startOfDay(task.completedAt).toISOString();
      if (!productivityByDate.has(dateKey)) {
        productivityByDate.set(dateKey, { tasksCompleted: 0, pomodoroMinutes: 0, habitsCompleted: 0 });
      }
      productivityByDate.get(dateKey).tasksCompleted += 1;
    });

    pomodoros.forEach(pom => {
      const dateKey = startOfDay(pom.startTime).toISOString();
      if (!productivityByDate.has(dateKey)) {
        productivityByDate.set(dateKey, { tasksCompleted: 0, pomodoroMinutes: 0, habitsCompleted: 0 });
      }
      productivityByDate.get(dateKey).pomodoroMinutes += pom.durationMinutes;
    });

    habitCompletions.forEach(habit => {
      const dateKey = startOfDay(habit.date).toISOString();
      if (!productivityByDate.has(dateKey)) {
        productivityByDate.set(dateKey, { tasksCompleted: 0, pomodoroMinutes: 0, habitsCompleted: 0 });
      }
      productivityByDate.get(dateKey).habitsCompleted += 1;
    });

    // Correlate wellbeing with productivity
    const correlations = checkIns.map(checkIn => {
      const dateKey = startOfDay(checkIn.date).toISOString();
      const productivity = productivityByDate.get(dateKey) || {
        tasksCompleted: 0,
        pomodoroMinutes: 0,
        habitsCompleted: 0,
      };

      return {
        date: checkIn.date,
        sleepHours: checkIn.sleepHours,
        sleepQuality: checkIn.sleepQuality,
        mood: checkIn.mood,
        energy: checkIn.energy,
        stressLevel: checkIn.stressLevel,
        ...productivity,
      };
    });

    // Calculate simple correlations
    const calculateCorrelation = (metric: string, productivityMetric: string) => {
      const pairs = correlations
        .filter(c => c[metric] != null && c[productivityMetric] > 0)
        .map(c => ({ x: c[metric], y: c[productivityMetric] }));

      if (pairs.length < 2) return null;

      const meanX = pairs.reduce((sum, p) => sum + p.x, 0) / pairs.length;
      const meanY = pairs.reduce((sum, p) => sum + p.y, 0) / pairs.length;

      const numerator = pairs.reduce((sum, p) => sum + (p.x - meanX) * (p.y - meanY), 0);
      const denomX = Math.sqrt(pairs.reduce((sum, p) => sum + Math.pow(p.x - meanX, 2), 0));
      const denomY = Math.sqrt(pairs.reduce((sum, p) => sum + Math.pow(p.y - meanY, 2), 0));

      if (denomX === 0 || denomY === 0) return null;
      return numerator / (denomX * denomY);
    };

    const correlationResults = {
      sleepVsTasks: calculateCorrelation('sleepHours', 'tasksCompleted'),
      sleepVsPomodoros: calculateCorrelation('sleepHours', 'pomodoroMinutes'),
      stressVsTasks: calculateCorrelation('stressLevel', 'tasksCompleted'),
      energyVsPomodoros: calculateCorrelation('energy', 'pomodoroMinutes'),
    };

    return NextResponse.json({
      dataPoints: correlations,
      correlations: correlationResults,
      insights: generateInsights(correlationResults),
    });
  } catch (error) {
    console.error('Error fetching correlations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch correlations' },
      { status: 500 }
    );
  }
}

function generateInsights(correlations: any): string[] {
  const insights: string[] = [];

  if (correlations.sleepVsTasks && correlations.sleepVsTasks > 0.3) {
    insights.push('Better sleep is positively correlated with task completion');
  }
  if (correlations.stressVsTasks && correlations.stressVsTasks < -0.3) {
    insights.push('Higher stress levels are associated with fewer completed tasks');
  }
  if (correlations.energyVsPomodoros && correlations.energyVsPomodoros > 0.3) {
    insights.push('Higher energy levels correlate with more focused work sessions');
  }

  return insights;
}

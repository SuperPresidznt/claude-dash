import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { HabitCadence } from '@prisma/client';
import { startOfDay, subDays } from 'date-fns';

const createHabitSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  cadence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  targetCount: z.number().int().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createHabitSchema.parse(json);

  const habit = await prisma.habit.create({
    data: {
      userId: user.id,
      name: body.name,
      description: body.description,
      cadence: body.cadence as HabitCadence | undefined,
      targetCount: body.targetCount,
      color: body.color,
      icon: body.icon,
    },
  });

  return NextResponse.json(habit);
}

export async function GET() {
  const user = await requireUser();

  const habits = await prisma.habit.findMany({
    where: {
      userId: user.id,
      isActive: true,
    },
    include: {
      completions: {
        where: {
          date: {
            gte: subDays(startOfDay(new Date()), 30),
          },
        },
        orderBy: {
          date: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate streak for each habit
  const habitsWithStreaks = habits.map((habit) => {
    const streak = calculateStreak(habit.completions.map((c) => c.date), habit.cadence);
    const completionsLast30Days = habit.completions.length;

    return {
      ...habit,
      currentStreak: streak,
      completionsLast30Days,
    };
  });

  return NextResponse.json(habitsWithStreaks);
}

// Calculate current streak based on cadence
function calculateStreak(completionDates: Date[], cadence: HabitCadence): number {
  if (completionDates.length === 0) return 0;

  const today = startOfDay(new Date());
  const sortedDates = completionDates
    .map((d) => startOfDay(d))
    .sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let checkDate = today;

  if (cadence === 'daily') {
    // Daily: must have completion for consecutive days
    for (const date of sortedDates) {
      if (date.getTime() === checkDate.getTime()) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else if (date.getTime() < checkDate.getTime()) {
        // Gap found, streak broken
        break;
      }
    }
  } else if (cadence === 'weekly') {
    // Weekly: must have at least one completion in consecutive weeks
    const weeksWithCompletions = new Set(
      sortedDates.map((d) => {
        const weekStart = new Date(d);
        weekStart.setDate(d.getDate() - d.getDay());
        return startOfDay(weekStart).getTime();
      })
    );

    let weekStart = new Date(today);
    weekStart.setDate(today.getDate() - today.getDay());
    let checkWeek = startOfDay(weekStart);

    while (weeksWithCompletions.has(checkWeek.getTime())) {
      streak++;
      checkWeek = subDays(checkWeek, 7);
    }
  } else {
    // Monthly: must have at least one completion in consecutive months
    const monthsWithCompletions = new Set(
      sortedDates.map((d) => `${d.getFullYear()}-${d.getMonth() + 1}`)
    );

    let checkMonth = `${today.getFullYear()}-${today.getMonth() + 1}`;
    let currentDate = new Date(today);

    while (monthsWithCompletions.has(checkMonth)) {
      streak++;
      currentDate.setMonth(currentDate.getMonth() - 1);
      checkMonth = `${currentDate.getFullYear()}-${currentDate.getMonth() + 1}`;
    }
  }

  return streak;
}

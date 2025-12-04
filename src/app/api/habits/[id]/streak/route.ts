import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { startOfDay, subDays, format, differenceInDays } from 'date-fns';
import { HabitCadence } from '@prisma/client';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  const habit = await prisma.habit.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      completions: {
        orderBy: {
          date: 'desc',
        },
      },
    },
  });

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  const completionDates = habit.completions.map((c) => startOfDay(c.date));
  const today = startOfDay(new Date());

  // Calculate current streak
  const currentStreak = calculateStreak(completionDates, habit.cadence);

  // Calculate longest streak ever
  const longestStreak = calculateLongestStreak(completionDates, habit.cadence);

  // Generate heatmap data for last 90 days
  const heatmapData = generateHeatmap(completionDates, 90);

  // Calculate completion rate
  const totalDaysSinceCreation = differenceInDays(today, startOfDay(habit.createdAt)) + 1;
  const totalCompletions = habit.completions.length;
  const completionRate = totalDaysSinceCreation > 0
    ? Number(((totalCompletions / totalDaysSinceCreation) * 100).toFixed(1))
    : 0;

  // Best day of week (for daily habits)
  const bestDayOfWeek = habit.cadence === 'daily' ? calculateBestDayOfWeek(completionDates) : null;

  return NextResponse.json({
    currentStreak,
    longestStreak,
    totalCompletions,
    completionRate,
    bestDayOfWeek,
    heatmap: heatmapData,
  });
}

function calculateStreak(completionDates: Date[], cadence: HabitCadence): number {
  if (completionDates.length === 0) return 0;

  const today = startOfDay(new Date());
  const sortedDates = completionDates.sort((a, b) => b.getTime() - a.getTime());

  let streak = 0;
  let checkDate = today;

  if (cadence === 'daily') {
    for (const date of sortedDates) {
      if (date.getTime() === checkDate.getTime()) {
        streak++;
        checkDate = subDays(checkDate, 1);
      } else if (date.getTime() < checkDate.getTime()) {
        break;
      }
    }
  } else if (cadence === 'weekly') {
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

function calculateLongestStreak(completionDates: Date[], cadence: HabitCadence): number {
  if (completionDates.length === 0) return 0;

  const sortedDates = completionDates.sort((a, b) => a.getTime() - b.getTime());
  let longestStreak = 0;
  let currentStreak = 1;
  let previousDate = sortedDates[0];

  for (let i = 1; i < sortedDates.length; i++) {
    const date = sortedDates[i];
    const expectedNext = cadence === 'daily'
      ? subDays(previousDate, -1)
      : cadence === 'weekly'
      ? subDays(previousDate, -7)
      : new Date(previousDate.getFullYear(), previousDate.getMonth() + 1, previousDate.getDate());

    if (Math.abs(differenceInDays(date, expectedNext)) <= 1) {
      currentStreak++;
    } else {
      longestStreak = Math.max(longestStreak, currentStreak);
      currentStreak = 1;
    }

    previousDate = date;
  }

  return Math.max(longestStreak, currentStreak);
}

function generateHeatmap(completionDates: Date[], days: number) {
  const today = startOfDay(new Date());
  const completionSet = new Set(completionDates.map((d) => d.getTime()));

  return Array.from({ length: days }, (_, i) => {
    const date = subDays(today, days - 1 - i);
    return {
      date: format(date, 'yyyy-MM-dd'),
      completed: completionSet.has(date.getTime()),
    };
  });
}

function calculateBestDayOfWeek(completionDates: Date[]): { day: string; count: number } | null {
  if (completionDates.length === 0) return null;

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const counts = new Array(7).fill(0);

  completionDates.forEach((date) => {
    counts[date.getDay()]++;
  });

  const maxCount = Math.max(...counts);
  const bestDayIndex = counts.indexOf(maxCount);

  return {
    day: dayNames[bestDayIndex],
    count: maxCount,
  };
}

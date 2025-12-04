import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { startOfDay, endOfDay, subDays, format } from 'date-fns';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  const project = await prisma.project.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          completedAt: true,
          createdAt: true,
          effort: true,
          impact: true,
        },
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Overall progress
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === 'completed').length;
  const inProgressTasks = project.tasks.filter((t) => t.status === 'in_progress').length;
  const blockedTasks = project.tasks.filter((t) => t.status === 'blocked').length;
  const todoTasks = project.tasks.filter((t) => t.status === 'todo').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Completion velocity (tasks completed per day over last 30 days)
  const thirtyDaysAgo = subDays(new Date(), 30);
  const recentCompletions = project.tasks.filter(
    (t) => t.completedAt && t.completedAt >= thirtyDaysAgo
  );
  const velocityPerDay = recentCompletions.length / 30;

  // Estimated completion date based on velocity
  const remainingTasks = totalTasks - completedTasks;
  const daysToComplete = velocityPerDay > 0 ? Math.ceil(remainingTasks / velocityPerDay) : null;
  const estimatedCompletionDate = daysToComplete
    ? new Date(Date.now() + daysToComplete * 24 * 60 * 60 * 1000)
    : null;

  // Task breakdown by status
  const statusBreakdown = {
    todo: todoTasks,
    in_progress: inProgressTasks,
    blocked: blockedTasks,
    completed: completedTasks,
  };

  // Timeline data (completions over time)
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    const dayStart = startOfDay(date);
    const dayEnd = endOfDay(date);

    const completionsOnDay = project.tasks.filter(
      (t) => t.completedAt && t.completedAt >= dayStart && t.completedAt <= dayEnd
    ).length;

    return {
      date: format(date, 'yyyy-MM-dd'),
      completions: completionsOnDay,
    };
  });

  // Effort/Impact analysis
  const tasksWithScores = project.tasks.filter((t) => t.effort && t.impact);
  const avgEffort = tasksWithScores.length > 0
    ? tasksWithScores.reduce((sum, t) => sum + (t.effort || 0), 0) / tasksWithScores.length
    : 0;
  const avgImpact = tasksWithScores.length > 0
    ? tasksWithScores.reduce((sum, t) => sum + (t.impact || 0), 0) / tasksWithScores.length
    : 0;

  return NextResponse.json({
    overview: {
      totalTasks,
      completedTasks,
      progressPercent,
      statusBreakdown,
    },
    velocity: {
      completionsLast30Days: recentCompletions.length,
      tasksPerDay: Number(velocityPerDay.toFixed(2)),
      estimatedCompletionDate: estimatedCompletionDate?.toISOString() || null,
      daysToComplete,
    },
    timeline: last7Days,
    metrics: {
      avgEffort: Number(avgEffort.toFixed(1)),
      avgImpact: Number(avgImpact.toFixed(1)),
    },
  });
}

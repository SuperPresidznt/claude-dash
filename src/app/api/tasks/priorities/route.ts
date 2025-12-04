import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

type PriorityQuadrant = 'quick_wins' | 'strategic' | 'fill_ins' | 'time_wasters';

interface TaskWithQuadrant {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string | null;
  effort: number | null;
  impact: number | null;
  dueDate: Date | null;
  projectId: string | null;
  tags: string[];
  quadrant: PriorityQuadrant;
  priorityScore: number;
}

export async function GET() {
  const user = await requireUser();

  // Get all non-completed tasks with effort and impact scores
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
      status: {
        notIn: ['completed', 'cancelled'],
      },
      effort: { not: null },
      impact: { not: null },
    },
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Categorize tasks into quadrants based on effort/impact
  const categorized = tasks.map((task) => {
    const effort = task.effort!;
    const impact = task.impact!;
    const priorityScore = impact * effort;

    let quadrant: PriorityQuadrant;

    // Quadrant logic:
    // High Impact + Low Effort = Quick Wins (priority 1)
    // High Impact + High Effort = Strategic (priority 2)
    // Low Impact + Low Effort = Fill-ins (priority 3)
    // Low Impact + High Effort = Time Wasters (priority 4 - avoid)

    if (impact >= 4 && effort <= 2) {
      quadrant = 'quick_wins';
    } else if (impact >= 4 && effort >= 3) {
      quadrant = 'strategic';
    } else if (impact <= 2 && effort <= 2) {
      quadrant = 'fill_ins';
    } else {
      quadrant = 'time_wasters';
    }

    return {
      ...task,
      quadrant,
      priorityScore,
    };
  });

  // Group by quadrant
  const byQuadrant = {
    quick_wins: categorized.filter((t) => t.quadrant === 'quick_wins'),
    strategic: categorized.filter((t) => t.quadrant === 'strategic'),
    fill_ins: categorized.filter((t) => t.quadrant === 'fill_ins'),
    time_wasters: categorized.filter((t) => t.quadrant === 'time_wasters'),
  };

  // Sort each quadrant by priority score (descending)
  Object.values(byQuadrant).forEach((tasks) => {
    tasks.sort((a, b) => b.priorityScore - a.priorityScore);
  });

  return NextResponse.json({
    quadrants: byQuadrant,
    stats: {
      quick_wins: byQuadrant.quick_wins.length,
      strategic: byQuadrant.strategic.length,
      fill_ins: byQuadrant.fill_ins.length,
      time_wasters: byQuadrant.time_wasters.length,
      total: categorized.length,
    },
  });
}

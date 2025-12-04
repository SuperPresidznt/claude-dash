import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { TaskStatus, TaskPriority } from '@prisma/client';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  effort: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  dueDate: z.string().datetime().optional(),
  projectId: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createTaskSchema.parse(json);

  const task = await prisma.task.create({
    data: {
      userId: user.id,
      title: body.title,
      description: body.description,
      status: body.status as TaskStatus | undefined,
      priority: body.priority as TaskPriority | undefined,
      effort: body.effort,
      impact: body.impact,
      dueDate: body.dueDate ? new Date(body.dueDate) : null,
      projectId: body.projectId,
      tags: body.tags || [],
    },
    include: {
      project: true,
    },
  });

  return NextResponse.json(task);
}

export async function GET(request: NextRequest) {
  const user = await requireUser();
  const { searchParams } = request.nextUrl;

  // Build filters from query parameters
  const status = searchParams.get('status');
  const priority = searchParams.get('priority');
  const projectId = searchParams.get('projectId');
  const tag = searchParams.get('tag');

  const where: any = { userId: user.id };

  if (status) {
    where.status = status as TaskStatus;
  }

  if (priority) {
    where.priority = priority as TaskPriority;
  }

  if (projectId) {
    where.projectId = projectId;
  }

  if (tag) {
    where.tags = { has: tag };
  }

  const tasks = await prisma.task.findMany({
    where,
    include: {
      project: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [
      { status: 'asc' },
      { dueDate: 'asc' },
      { createdAt: 'desc' },
    ],
  });

  // Calculate priority score for each task
  const tasksWithScore = tasks.map((task) => ({
    ...task,
    priorityScore: calculatePriorityScore(task.effort, task.impact),
  }));

  return NextResponse.json(tasksWithScore);
}

// Priority score calculation: impact × effort (higher is better)
// Effort represents complexity/time needed (1-5)
// Impact represents value delivered (1-5)
function calculatePriorityScore(effort: number | null, impact: number | null): number | null {
  if (effort === null || impact === null) return null;
  return impact * effort;
}

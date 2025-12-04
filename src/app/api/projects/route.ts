import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { ProjectStatus } from '@prisma/client';

const createProjectSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).optional(),
  macroGoalId: z.string().optional(),
  targetDate: z.string().datetime().optional(),
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createProjectSchema.parse(json);

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: body.name,
      description: body.description,
      status: body.status as ProjectStatus | undefined,
      macroGoalId: body.macroGoalId,
      targetDate: body.targetDate ? new Date(body.targetDate) : null,
    },
    include: {
      macroGoal: true,
      tasks: true,
    },
  });

  return NextResponse.json(project);
}

export async function GET() {
  const user = await requireUser();

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      macroGoal: {
        select: {
          id: true,
          title: true,
        },
      },
      tasks: {
        select: {
          id: true,
          title: true,
          status: true,
          dueDate: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Calculate progress for each project
  const projectsWithProgress = projects.map((project) => {
    const totalTasks = project.tasks.length;
    const completedTasks = project.tasks.filter((t) => t.status === 'completed').length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    return {
      ...project,
      stats: {
        totalTasks,
        completedTasks,
        progressPercent,
      },
    };
  });

  return NextResponse.json(projectsWithProgress);
}

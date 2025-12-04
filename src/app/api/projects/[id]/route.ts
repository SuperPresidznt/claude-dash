import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { ProjectStatus } from '@prisma/client';

const updateProjectSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['planning', 'active', 'paused', 'completed', 'cancelled']).optional(),
  macroGoalId: z.string().optional().nullable(),
  targetDate: z.string().datetime().optional().nullable(),
});

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
      macroGoal: true,
      tasks: {
        orderBy: [
          { status: 'asc' },
          { dueDate: 'asc' },
        ],
      },
    },
  });

  if (!project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Calculate progress
  const totalTasks = project.tasks.length;
  const completedTasks = project.tasks.filter((t) => t.status === 'completed').length;
  const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return NextResponse.json({
    ...project,
    stats: {
      totalTasks,
      completedTasks,
      progressPercent,
    },
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateProjectSchema.parse(json);

  // Verify project belongs to user
  const existing = await prisma.project.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Prepare update data
  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) updateData.status = body.status as ProjectStatus;
  if (body.macroGoalId !== undefined) updateData.macroGoalId = body.macroGoalId;
  if (body.targetDate !== undefined) {
    updateData.targetDate = body.targetDate ? new Date(body.targetDate) : null;
  }

  const project = await prisma.project.update({
    where: { id: params.id },
    data: updateData,
    include: {
      macroGoal: true,
      tasks: true,
    },
  });

  return NextResponse.json(project);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  // Verify project belongs to user
  const existing = await prisma.project.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  await prisma.project.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

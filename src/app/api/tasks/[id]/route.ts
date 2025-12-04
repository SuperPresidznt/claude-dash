import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { TaskStatus, TaskPriority } from '@prisma/client';

const updateTaskSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['todo', 'in_progress', 'blocked', 'completed', 'cancelled']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  effort: z.number().int().min(1).max(5).optional(),
  impact: z.number().int().min(1).max(5).optional(),
  dueDate: z.string().datetime().optional().nullable(),
  projectId: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
});

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  const task = await prisma.task.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
    include: {
      project: true,
    },
  });

  if (!task) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  return NextResponse.json(task);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateTaskSchema.parse(json);

  // Verify task belongs to user
  const existing = await prisma.task.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  // Prepare update data
  const updateData: any = {};

  if (body.title !== undefined) updateData.title = body.title;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.status !== undefined) {
    updateData.status = body.status as TaskStatus;

    // Set completedAt when status changes to completed
    if (body.status === 'completed' && existing.status !== 'completed') {
      updateData.completedAt = new Date();
    } else if (body.status !== 'completed') {
      updateData.completedAt = null;
    }
  }
  if (body.priority !== undefined) updateData.priority = body.priority as TaskPriority;
  if (body.effort !== undefined) updateData.effort = body.effort;
  if (body.impact !== undefined) updateData.impact = body.impact;
  if (body.dueDate !== undefined) {
    updateData.dueDate = body.dueDate ? new Date(body.dueDate) : null;
  }
  if (body.projectId !== undefined) updateData.projectId = body.projectId;
  if (body.tags !== undefined) updateData.tags = body.tags;

  const task = await prisma.task.update({
    where: { id: params.id },
    data: updateData,
    include: {
      project: true,
    },
  });

  return NextResponse.json(task);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  // Verify task belongs to user
  const existing = await prisma.task.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Task not found' }, { status: 404 });
  }

  await prisma.task.delete({
    where: { id: params.id },
  });

  return NextResponse.json({ success: true });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { HabitCadence } from '@prisma/client';

const updateHabitSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  cadence: z.enum(['daily', 'weekly', 'monthly']).optional(),
  targetCount: z.number().int().min(1).optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  isActive: z.boolean().optional(),
});

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
        take: 100,
      },
    },
  });

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  return NextResponse.json(habit);
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateHabitSchema.parse(json);

  // Verify habit belongs to user
  const existing = await prisma.habit.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  // Prepare update data
  const updateData: any = {};

  if (body.name !== undefined) updateData.name = body.name;
  if (body.description !== undefined) updateData.description = body.description;
  if (body.cadence !== undefined) updateData.cadence = body.cadence as HabitCadence;
  if (body.targetCount !== undefined) updateData.targetCount = body.targetCount;
  if (body.color !== undefined) updateData.color = body.color;
  if (body.icon !== undefined) updateData.icon = body.icon;
  if (body.isActive !== undefined) updateData.isActive = body.isActive;

  const habit = await prisma.habit.update({
    where: { id: params.id },
    data: updateData,
  });

  return NextResponse.json(habit);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  // Verify habit belongs to user
  const existing = await prisma.habit.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!existing) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  // Soft delete by marking as inactive
  await prisma.habit.update({
    where: { id: params.id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}

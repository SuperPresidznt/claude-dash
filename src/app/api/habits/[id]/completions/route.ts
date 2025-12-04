import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { startOfDay } from 'date-fns';

const createCompletionSchema = z.object({
  date: z.string().datetime().optional(),
  note: z.string().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const json = await request.json();
  const body = createCompletionSchema.parse(json);

  // Verify habit exists and belongs to user
  const habit = await prisma.habit.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  const completionDate = body.date ? startOfDay(new Date(body.date)) : startOfDay(new Date());

  // Create or update completion for this date
  const completion = await prisma.habitCompletion.upsert({
    where: {
      habitId_date: {
        habitId: params.id,
        date: completionDate,
      },
    },
    create: {
      habitId: params.id,
      userId: user.id,
      date: completionDate,
      note: body.note,
    },
    update: {
      note: body.note,
    },
  });

  return NextResponse.json(completion);
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  // Verify habit exists and belongs to user
  const habit = await prisma.habit.findUnique({
    where: {
      id: params.id,
      userId: user.id,
    },
  });

  if (!habit) {
    return NextResponse.json({ error: 'Habit not found' }, { status: 404 });
  }

  const completions = await prisma.habitCompletion.findMany({
    where: {
      habitId: params.id,
    },
    orderBy: {
      date: 'desc',
    },
  });

  return NextResponse.json(completions);
}

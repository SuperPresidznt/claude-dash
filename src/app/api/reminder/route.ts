import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  title: z.string().min(1),
  schedule: z.string().min(1),
  nextFireAt: z.string().datetime(),
  isActive: z.boolean().optional()
});

export async function GET() {
  const user = await requireUser();
  const reminders = await prisma.reminder.findMany({
    where: { userId: user.id },
    orderBy: { nextFireAt: 'asc' }
  });
  return NextResponse.json(reminders);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const reminder = await prisma.reminder.create({
    data: {
      userId: user.id,
      title: body.title,
      schedule: body.schedule,
      nextFireAt: new Date(body.nextFireAt),
      isActive: body.isActive ?? true
    }
  });

  return NextResponse.json(reminder);
}

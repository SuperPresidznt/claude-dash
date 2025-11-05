import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();

  const reminder = await prisma.reminder.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!reminder) {
    return new NextResponse('Reminder not found', { status: 404 });
  }

  const startEvent = await prisma.startEvent.create({
    data: {
      userId: user.id,
      durationSec: user.defaultStartDuration,
      context: `Reminder test: ${reminder.title}`,
      linkedEntityType: 'Other'
    }
  });

  return NextResponse.json({ reminder, startEvent });
}

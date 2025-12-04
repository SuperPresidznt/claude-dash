import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const completePomodoroSchema = z.object({
  endTime: z.string().datetime(),
  completed: z.boolean(),
  interrupted: z.boolean().optional(),
  note: z.string().optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const pomodoroSession = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        task: true,
        focusBlock: true,
      },
    });

    if (!pomodoroSession) {
      return NextResponse.json({ error: 'Pomodoro session not found' }, { status: 404 });
    }

    return NextResponse.json(pomodoroSession);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = completePomodoroSchema.parse(body);

    const existing = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pomodoro session not found' }, { status: 404 });
    }

    const pomodoroSession = await prisma.pomodoroSession.update({
      where: { id: params.id },
      data: {
        endTime: new Date(validated.endTime),
        completed: validated.completed,
        interrupted: validated.interrupted ?? false,
        note: validated.note,
      },
      include: {
        task: true,
        focusBlock: true,
      },
    });

    return NextResponse.json(pomodoroSession);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.pomodoroSession.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Pomodoro session not found' }, { status: 404 });
    }

    await prisma.pomodoroSession.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { startOfDay, endOfDay } from 'date-fns';

const createPomodoroSchema = z.object({
  taskId: z.string().optional(),
  focusBlockId: z.string().optional(),
  type: z.enum(['work', 'short_break', 'long_break']).default('work'),
  durationMinutes: z.number().int().min(1).default(25),
  startTime: z.string().datetime(),
});

const completePomodoroSchema = z.object({
  endTime: z.string().datetime(),
  completed: z.boolean(),
  interrupted: z.boolean().optional(),
  note: z.string().optional(),
});

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const taskId = searchParams.get('taskId');
    const focusBlockId = searchParams.get('focusBlockId');

    let where: any = { userId: session.user.id };

    if (date) {
      const targetDate = new Date(date);
      where.startTime = {
        gte: startOfDay(targetDate),
        lte: endOfDay(targetDate),
      };
    }

    if (taskId) {
      where.taskId = taskId;
    }

    if (focusBlockId) {
      where.focusBlockId = focusBlockId;
    }

    const sessions = await prisma.pomodoroSession.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
        focusBlock: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
      take: 100,
    });

    return NextResponse.json(sessions);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createPomodoroSchema.parse(body);

    const pomodoroSession = await prisma.pomodoroSession.create({
      data: {
        userId: session.user.id,
        taskId: validated.taskId,
        focusBlockId: validated.focusBlockId,
        type: validated.type,
        durationMinutes: validated.durationMinutes,
        startTime: new Date(validated.startTime),
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    return NextResponse.json(pomodoroSession, { status: 201 });
  });
}

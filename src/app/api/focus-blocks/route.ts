import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';
import { startOfDay, endOfDay } from 'date-fns';

const createFocusBlockSchema = z.object({
  taskId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
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

    const focusBlocks = await prisma.focusBlock.findMany({
      where,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
          },
        },
        pomodoroSessions: {
          select: {
            id: true,
            type: true,
            completed: true,
            durationMinutes: true,
          },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    return NextResponse.json(focusBlocks);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createFocusBlockSchema.parse(body);

    const focusBlock = await prisma.focusBlock.create({
      data: {
        userId: session.user.id,
        taskId: validated.taskId,
        title: validated.title,
        description: validated.description,
        startTime: new Date(validated.startTime),
        endTime: new Date(validated.endTime),
      },
      include: {
        task: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    });

    return NextResponse.json(focusBlock, { status: 201 });
  });
}

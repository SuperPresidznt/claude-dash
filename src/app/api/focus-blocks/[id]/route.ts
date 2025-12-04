import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const updateFocusBlockSchema = z.object({
  taskId: z.string().optional().nullable(),
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  startTime: z.string().datetime().optional(),
  endTime: z.string().datetime().optional(),
  actualStartTime: z.string().datetime().optional().nullable(),
  actualEndTime: z.string().datetime().optional().nullable(),
  completed: z.boolean().optional(),
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

    const focusBlock = await prisma.focusBlock.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        task: true,
        pomodoroSessions: {
          orderBy: { startTime: 'asc' },
        },
      },
    });

    if (!focusBlock) {
      return NextResponse.json({ error: 'Focus block not found' }, { status: 404 });
    }

    return NextResponse.json(focusBlock);
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
    const validated = updateFocusBlockSchema.parse(body);

    const existing = await prisma.focusBlock.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Focus block not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.taskId !== undefined) updateData.taskId = validated.taskId;
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.startTime) updateData.startTime = new Date(validated.startTime);
    if (validated.endTime) updateData.endTime = new Date(validated.endTime);
    if (validated.actualStartTime !== undefined) {
      updateData.actualStartTime = validated.actualStartTime ? new Date(validated.actualStartTime) : null;
    }
    if (validated.actualEndTime !== undefined) {
      updateData.actualEndTime = validated.actualEndTime ? new Date(validated.actualEndTime) : null;
    }
    if (validated.completed !== undefined) updateData.completed = validated.completed;

    const focusBlock = await prisma.focusBlock.update({
      where: { id: params.id },
      data: updateData,
      include: {
        task: true,
        pomodoroSessions: true,
      },
    });

    return NextResponse.json(focusBlock);
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

    const existing = await prisma.focusBlock.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Focus block not found' }, { status: 404 });
    }

    await prisma.focusBlock.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const enrichEventSchema = z.object({
  eventId: z.string().min(1),
  linkedTaskId: z.string().optional().nullable(),
  linkedHabitId: z.string().optional().nullable(),
  linkedProjectId: z.string().optional().nullable(),
  linkedFocusBlockId: z.string().optional().nullable(),
  linkedPomodoroId: z.string().optional().nullable(),
  linkedFinanceIds: z.array(z.string()).optional(),
  enrichedData: z.record(z.any()).optional(),
});

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = enrichEventSchema.parse(body);

    // Verify the event belongs to the user
    const event = await prisma.calendarEvent.findFirst({
      where: {
        id: validated.eventId,
        userId: session.user.id,
      },
    });

    if (!event) {
      return NextResponse.json({ error: 'Calendar event not found' }, { status: 404 });
    }

    // Build enriched data from linked entities
    const enrichedData: any = {};

    if (validated.linkedTaskId) {
      const task = await prisma.task.findFirst({
        where: { id: validated.linkedTaskId, userId: session.user.id },
        select: { id: true, title: true, status: true, priority: true, dueDate: true },
      });
      if (task) enrichedData.task = task;
    }

    if (validated.linkedProjectId) {
      const project = await prisma.project.findFirst({
        where: { id: validated.linkedProjectId, userId: session.user.id },
        select: { id: true, name: true, status: true, targetDate: true },
      });
      if (project) enrichedData.project = project;
    }

    if (validated.linkedFinanceIds && validated.linkedFinanceIds.length > 0) {
      const liabilities = await prisma.liability.findMany({
        where: {
          id: { in: validated.linkedFinanceIds },
          userId: session.user.id,
        },
        select: { id: true, name: true, balanceCents: true, minimumPayment: true },
      });
      if (liabilities.length > 0) enrichedData.liabilities = liabilities;
    }

    // Update the event
    const updateData: any = {};
    if (validated.linkedTaskId !== undefined) updateData.linkedTaskId = validated.linkedTaskId;
    if (validated.linkedHabitId !== undefined) updateData.linkedHabitId = validated.linkedHabitId;
    if (validated.linkedProjectId !== undefined) updateData.linkedProjectId = validated.linkedProjectId;
    if (validated.linkedFocusBlockId !== undefined) updateData.linkedFocusBlockId = validated.linkedFocusBlockId;
    if (validated.linkedPomodoroId !== undefined) updateData.linkedPomodoroId = validated.linkedPomodoroId;
    if (validated.linkedFinanceIds !== undefined) updateData.linkedFinanceIds = validated.linkedFinanceIds;

    // Merge with existing enriched data
    updateData.enrichedData = {
      ...(event.enrichedData as any || {}),
      ...enrichedData,
      ...(validated.enrichedData || {}),
    };

    const updatedEvent = await prisma.calendarEvent.update({
      where: { id: validated.eventId },
      data: updateData,
      include: {
        linkedProject: true,
        linkedFocusBlock: true,
        linkedPomodoro: true,
      },
    });

    return NextResponse.json(updatedEvent);
  });
}

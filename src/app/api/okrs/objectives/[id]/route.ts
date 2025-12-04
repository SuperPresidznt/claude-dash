import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const updateObjectiveSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  status: z.enum(['active', 'completed', 'cancelled']).optional(),
  confidenceRating: z.number().int().min(0).max(100).optional().nullable(),
  endDate: z.string().datetime().optional(),
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

    const objective = await prisma.objective.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        keyResults: {
          orderBy: { createdAt: 'asc' },
        },
        project: true,
        macroGoal: true,
      },
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    return NextResponse.json(objective);
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
    const validated = updateObjectiveSchema.parse(body);

    const existing = await prisma.objective.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.status !== undefined) updateData.status = validated.status;
    if (validated.confidenceRating !== undefined) updateData.confidenceRating = validated.confidenceRating;
    if (validated.endDate) updateData.endDate = new Date(validated.endDate);

    const objective = await prisma.objective.update({
      where: { id: params.id },
      data: updateData,
      include: {
        keyResults: true,
        project: true,
        macroGoal: true,
      },
    });

    return NextResponse.json(objective);
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

    const existing = await prisma.objective.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    await prisma.objective.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}

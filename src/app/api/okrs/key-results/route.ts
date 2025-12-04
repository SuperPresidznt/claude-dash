import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const createKeyResultSchema = z.object({
  objectiveId: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  targetValue: z.number(),
  currentValue: z.number().default(0),
  unit: z.string().optional(),
  confidenceRating: z.number().int().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const objectiveId = searchParams.get('objectiveId');

    let where: any = { userId: session.user.id };

    if (objectiveId) {
      where.objectiveId = objectiveId;
    }

    const keyResults = await prisma.keyResult.findMany({
      where,
      include: {
        objective: {
          select: {
            id: true,
            title: true,
            quarter: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(keyResults);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createKeyResultSchema.parse(body);

    // Verify the objective belongs to the user
    const objective = await prisma.objective.findFirst({
      where: {
        id: validated.objectiveId,
        userId: session.user.id,
      },
    });

    if (!objective) {
      return NextResponse.json({ error: 'Objective not found' }, { status: 404 });
    }

    const keyResult = await prisma.keyResult.create({
      data: {
        userId: session.user.id,
        objectiveId: validated.objectiveId,
        title: validated.title,
        description: validated.description,
        targetValue: validated.targetValue,
        currentValue: validated.currentValue,
        unit: validated.unit,
        confidenceRating: validated.confidenceRating,
      },
      include: {
        objective: true,
      },
    });

    return NextResponse.json(keyResult, { status: 201 });
  });
}

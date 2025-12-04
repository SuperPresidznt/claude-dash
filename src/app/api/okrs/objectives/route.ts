import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const createObjectiveSchema = z.object({
  projectId: z.string().optional(),
  macroGoalId: z.string().optional(),
  title: z.string().min(1),
  description: z.string().optional(),
  quarter: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  confidenceRating: z.number().int().min(0).max(100).optional(),
});

export async function GET(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const quarter = searchParams.get('quarter');
    const status = searchParams.get('status');
    const projectId = searchParams.get('projectId');

    let where: any = { userId: session.user.id };

    if (quarter) {
      where.quarter = quarter;
    }

    if (status) {
      where.status = status;
    }

    if (projectId) {
      where.projectId = projectId;
    }

    const objectives = await prisma.objective.findMany({
      where,
      include: {
        keyResults: {
          orderBy: { createdAt: 'asc' },
        },
        project: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
        macroGoal: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return NextResponse.json(objectives);
  });
}

export async function POST(req: NextRequest) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = createObjectiveSchema.parse(body);

    const objective = await prisma.objective.create({
      data: {
        userId: session.user.id,
        projectId: validated.projectId,
        macroGoalId: validated.macroGoalId,
        title: validated.title,
        description: validated.description,
        quarter: validated.quarter,
        startDate: new Date(validated.startDate),
        endDate: new Date(validated.endDate),
        confidenceRating: validated.confidenceRating,
      },
      include: {
        keyResults: true,
        project: true,
        macroGoal: true,
      },
    });

    return NextResponse.json(objective, { status: 201 });
  });
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const createSchema = z.object({
  title: z.string().min(1),
  hypothesis: z.string().min(1),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  status: z.enum(['planned', 'running', 'complete']).optional(),
  metric: z.string().min(1),
  targetValue: z.number(),
  resultValue: z.number().optional(),
  takeaway: z.string().optional(),
  decisionTag: z.string().optional()
});

export async function GET() {
  const user = await requireUser();
  const experiments = await prisma.routineExperiment.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'desc' }
  });
  return NextResponse.json(experiments);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createSchema.parse(json);

  const experiment = await prisma.routineExperiment.create({
    data: {
      userId: user.id,
      title: body.title,
      hypothesis: body.hypothesis,
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      status: body.status,
      metric: body.metric,
      targetValue: body.targetValue,
      resultValue: body.resultValue,
      takeaway: body.takeaway,
      decisionTag: body.decisionTag
    }
  });

  return NextResponse.json(experiment);
}

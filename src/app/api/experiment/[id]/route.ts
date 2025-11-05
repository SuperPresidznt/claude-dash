import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const updateSchema = z.object({
  title: z.string().optional(),
  hypothesis: z.string().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(['planned', 'running', 'complete']).optional(),
  metric: z.string().optional(),
  targetValue: z.number().optional(),
  resultValue: z.number().nullable().optional(),
  takeaway: z.string().nullable().optional(),
  decisionTag: z.string().nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateSchema.parse(json);

  const existing = await prisma.routineExperiment.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Not found', { status: 404 });
  }

  const experiment = await prisma.routineExperiment.update({
    where: { id: existing.id },
    data: {
      title: body.title ?? undefined,
      hypothesis: body.hypothesis ?? undefined,
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate:
        body.endDate === null ? null : body.endDate ? new Date(body.endDate) : undefined,
      status: body.status ?? undefined,
      metric: body.metric ?? undefined,
      targetValue: body.targetValue ?? undefined,
      resultValue: body.resultValue ?? undefined,
      takeaway: body.takeaway ?? undefined,
      decisionTag: body.decisionTag ?? undefined
    }
  });

  return NextResponse.json(experiment);
}

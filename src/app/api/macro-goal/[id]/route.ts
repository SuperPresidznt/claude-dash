import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  title: z.string().optional(),
  description: z.string().optional(),
  targetMetricType: z.enum(['count', 'money', 'custom']).optional(),
  targetValue: z.number().optional(),
  isActive: z.boolean().optional(),
  notes: z.string().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const existing = await prisma.macroGoal.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Not found', { status: 404 });
  }

  const macro = await prisma.macroGoal.update({
    where: { id: existing.id },
    data: {
      title: body.title ?? undefined,
      description: body.description ?? undefined,
      targetMetricType: body.targetMetricType ?? undefined,
      targetValue: body.targetValue ?? undefined,
      isActive: body.isActive ?? undefined,
      notes: body.notes ?? undefined
    }
  });

  return NextResponse.json(macro);
}

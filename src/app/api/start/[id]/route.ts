import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const updateSchema = z.object({
  context: z.string().optional(),
  linkedEntityType: z.enum(['Idea', 'RoutineExperiment', 'Study', 'Other']).nullable().optional(),
  linkedEntityId: z.string().nullable().optional()
});

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateSchema.parse(json);

  const existing = await prisma.startEvent.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Not found', { status: 404 });
  }

  const start = await prisma.startEvent.update({
    where: { id: existing.id },
    data: {
      context: body.context ?? undefined,
      linkedEntityType: body.linkedEntityType ?? undefined,
      linkedEntityId: body.linkedEntityId ?? undefined
    }
  });

  return NextResponse.json(start);
}

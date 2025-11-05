import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const bodySchema = z.object({
  durationSec: z.number().min(1),
  context: z.string().optional(),
  linkedEntityType: z.enum(['Idea', 'RoutineExperiment', 'Study', 'Other']).optional(),
  linkedEntityId: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = bodySchema.parse(json);

  const startEvent = await prisma.startEvent.create({
    data: {
      userId: user.id,
      durationSec: body.durationSec,
      context: body.context,
      linkedEntityType: body.linkedEntityType,
      linkedEntityId: body.linkedEntityId
    }
  });

  return NextResponse.json(startEvent);
}

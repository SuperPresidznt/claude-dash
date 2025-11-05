import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  title: z.string().optional(),
  schedule: z.string().optional(),
  nextFireAt: z.string().datetime().optional(),
  isActive: z.boolean().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const existing = await prisma.reminder.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Not found', { status: 404 });
  }

  const reminder = await prisma.reminder.update({
    where: { id: existing.id },
    data: {
      title: body.title ?? undefined,
      schedule: body.schedule ?? undefined,
      nextFireAt: body.nextFireAt ? new Date(body.nextFireAt) : undefined,
      isActive: body.isActive ?? undefined
    }
  });

  return NextResponse.json(reminder);
}

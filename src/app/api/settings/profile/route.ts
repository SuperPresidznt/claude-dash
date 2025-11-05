import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  timezone: z.string().optional(),
  currency: z.string().optional(),
  defaultStartDuration: z.number().int().min(1).max(600).optional()
});

export async function PATCH(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: body
  });

  return NextResponse.json(updated);
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  balanceCents: z.number().int().nonnegative().optional(),
  aprPercent: z.number().min(0).max(100).nullable().optional(),
  minimumPayment: z.number().int().nonnegative().nullable().optional(),
  note: z.string().max(2000).nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateSchema.parse(json);

  const db = prisma as any;
  const existing = await db.liability.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Liability not found', { status: 404 });
  }

  const liability = await db.liability.update({
    where: { id: params.id },
    data: {
      name: body.name ?? undefined,
      category: body.category ?? undefined,
      balanceCents: body.balanceCents ?? undefined,
      aprPercent: body.aprPercent ?? undefined,
      minimumPayment: body.minimumPayment ?? undefined,
      note: body.note ?? undefined
    }
  });

  return NextResponse.json(liability);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const db = prisma as any;
  const existing = await db.liability.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Liability not found', { status: 404 });
  }

  await db.liability.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

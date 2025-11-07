import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const updateSchema = z.object({
  description: z.string().min(1).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  category: z.string().min(1).optional(),
  direction: z.enum(['inflow', 'outflow']).optional(),
  date: z.string().datetime().optional(),
  note: z.string().max(2000).nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateSchema.parse(json);

  const db = prisma as any;
  const existing = await db.cashflowTxn.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Transaction not found', { status: 404 });
  }

  const txn = await db.cashflowTxn.update({
    where: { id: params.id },
    data: {
      description: body.description ?? undefined,
      amountCents: body.amountCents ?? undefined,
      category: body.category ?? undefined,
      direction: body.direction ?? undefined,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note ?? undefined
    }
  });

  return NextResponse.json(txn);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const db = prisma as any;
  const existing = await db.cashflowTxn.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Transaction not found', { status: 404 });
  }

  await db.cashflowTxn.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

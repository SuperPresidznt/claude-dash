import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';

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
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = updateSchema.parse(json);

    const existing = await db.cashflowTxn.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Cashflow transaction not found for update', withUserContext(user.id, { cashflowId: params.id }));
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

    logger.info('Updated cashflow transaction', withUserContext(user.id, { cashflowId: params.id }));
    return NextResponse.json(txn);
  } catch (error: unknown) {
    logger.error('Failed to update cashflow transaction', withUserContext(user.id, { cashflowId: params.id, error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid cashflow payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to update cashflow right now.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.cashflowTxn.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Cashflow transaction not found for deletion', withUserContext(user.id, { cashflowId: params.id }));
      return new NextResponse('Transaction not found', { status: 404 });
    }

    await db.cashflowTxn.delete({ where: { id: params.id } });

    logger.info('Deleted cashflow transaction', withUserContext(user.id, { cashflowId: params.id }));
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logger.error('Failed to delete cashflow transaction', withUserContext(user.id, { cashflowId: params.id, error }));
    return NextResponse.json({ message: 'Unable to delete cashflow right now.' }, { status: 500 });
  }
}

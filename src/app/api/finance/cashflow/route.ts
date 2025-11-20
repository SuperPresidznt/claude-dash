import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { apiHandler } from '@/lib/api-handler';

const createSchema = z.object({
  description: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  category: z.string().min(1),
  direction: z.enum(['inflow', 'outflow']),
  date: z.string().datetime().optional(),
  note: z.string().max(2000).optional()
});

export const GET = apiHandler('cashflow.list', async () => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const transactions = await db.cashflowTxn.findMany({
      where: { userId: user.id },
      orderBy: { date: 'desc' },
      take: 100
    });

    logger.info('Fetched cashflow transactions', withUserContext(user.id, { count: transactions.length }));
    return NextResponse.json(transactions);
  } catch (error) {
    logger.error('Failed to fetch cashflow transactions', withUserContext(user.id, { error }));
    return NextResponse.json({ message: 'Unable to load cashflow right now.' }, { status: 500 });
  }
});

export const POST = apiHandler('cashflow.create', async (request) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = createSchema.parse(json);

    const txn = await db.cashflowTxn.create({
      data: {
        userId: user.id,
        description: body.description,
        amountCents: body.amountCents,
        category: body.category,
        direction: body.direction,
        date: body.date ? new Date(body.date) : undefined,
        note: body.note
      }
    });

    logger.info('Created cashflow transaction', withUserContext(user.id, { cashflowId: txn.id }));
    return NextResponse.json(txn, { status: 201 });
  } catch (error: unknown) {
    logger.error('Failed to create cashflow transaction', withUserContext(user.id, { error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid cashflow payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create cashflow right now.' }, { status: 500 });
  }
});

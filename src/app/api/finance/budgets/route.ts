import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { enrichBudgetEnvelope, getBudgetEnvelopesWithActuals } from '@/lib/finance';
import { apiHandler } from '@/lib/api-handler';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  period: z.enum(['monthly', 'quarterly', 'yearly']).optional().default('monthly'),
  targetCents: z.number().int().nonnegative(),
  note: z.string().max(2000).optional()
});

export const GET = apiHandler('budgets.list', async () => {
  const user = await requireUser();

  try {
    const budgets = await getBudgetEnvelopesWithActuals(user.id);
    logger.info('Fetched budget envelopes', withUserContext(user.id, { count: budgets.length }));
    return NextResponse.json(budgets);
  } catch (error: unknown) {
    logger.error('Failed to fetch budget envelopes', withUserContext(user.id, { error }));
    return NextResponse.json({ message: 'Unable to load budgets right now.' }, { status: 500 });
  }
});

export const POST = apiHandler('budgets.create', async (request) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = createSchema.parse(json);

    const envelope = await db.budgetEnvelope.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        period: body.period,
        targetCents: body.targetCents,
        note: body.note
      }
    });

    const enriched = await enrichBudgetEnvelope(user.id, envelope);
    logger.info('Created budget envelope', withUserContext(user.id, { budgetId: envelope.id }));
    return NextResponse.json(enriched, { status: 201 });
  } catch (error: unknown) {
    logger.error('Failed to create budget envelope', withUserContext(user.id, { error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid budget payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create budget right now.' }, { status: 500 });
  }
});

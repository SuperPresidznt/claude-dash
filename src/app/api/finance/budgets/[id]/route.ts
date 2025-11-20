import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { enrichBudgetEnvelope } from '@/lib/finance';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  period: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
  targetCents: z.number().int().nonnegative().optional(),
  note: z.string().max(2000).nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.budgetEnvelope.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Budget envelope not found for update', withUserContext(user.id, { budgetId: params.id }));
      return new NextResponse('Budget envelope not found', { status: 404 });
    }

    const json = await request.json();
    const body = updateSchema.parse(json);

    const updated = await db.budgetEnvelope.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        period: body.period ?? undefined,
        targetCents: body.targetCents ?? undefined,
        note: body.note ?? undefined
      }
    });

    const enriched = await enrichBudgetEnvelope(user.id, updated);
    logger.info('Updated budget envelope', withUserContext(user.id, { budgetId: params.id }));
    return NextResponse.json(enriched);
  } catch (error: unknown) {
    logger.error('Failed to update budget envelope', withUserContext(user.id, { budgetId: params.id, error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid budget payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to update budget right now.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.budgetEnvelope.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Budget envelope not found for deletion', withUserContext(user.id, { budgetId: params.id }));
      return new NextResponse('Budget envelope not found', { status: 404 });
    }

    await db.budgetEnvelope.delete({ where: { id: params.id } });
    logger.info('Deleted budget envelope', withUserContext(user.id, { budgetId: params.id }));
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logger.error('Failed to delete budget envelope', withUserContext(user.id, { budgetId: params.id, error }));
    return NextResponse.json({ message: 'Unable to delete budget right now.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  direction: z.enum(['inflow', 'outflow']).optional(),
  amountCents: z.number().int().nonnegative().optional(),
  defaultNote: z.string().max(2000).nullable().optional(),
  dayOfMonth: z.number().int().min(1).max(31).nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.cashflowTemplate.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) {
      logger.warn('Template not found for update', withUserContext(user.id, { templateId: params.id }));
      return new NextResponse('Template not found', { status: 404 });
    }

    const body = updateSchema.parse(await request.json());
    const template = await db.cashflowTemplate.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        direction: body.direction ?? undefined,
        amountCents: body.amountCents ?? undefined,
        defaultNote: body.defaultNote ?? undefined,
        dayOfMonth: body.dayOfMonth ?? undefined
      }
    });

    logger.info('Updated cashflow template', withUserContext(user.id, { templateId: params.id }));
    return NextResponse.json(template);
  } catch (error) {
    logger.error('Failed to update cashflow template', withUserContext(user.id, { templateId: params.id, error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid template payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to update template right now.' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.cashflowTemplate.findFirst({ where: { id: params.id, userId: user.id } });
    if (!existing) {
      logger.warn('Template not found for deletion', withUserContext(user.id, { templateId: params.id }));
      return new NextResponse('Template not found', { status: 404 });
    }

    await db.cashflowTemplate.delete({ where: { id: params.id } });
    logger.info('Deleted cashflow template', withUserContext(user.id, { templateId: params.id }));
    return NextResponse.json({ ok: true });
  } catch (error) {
    logger.error('Failed to delete cashflow template', withUserContext(user.id, { templateId: params.id, error }));
    return NextResponse.json({ message: 'Unable to delete template right now.' }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { apiHandler } from '@/lib/api-handler';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required.'),
  category: z.string().min(1, 'Category is required.'),
  direction: z.enum(['inflow', 'outflow']).default('outflow'),
  amountCents: z.number().int().nonnegative(),
  defaultNote: z.string().max(2000).optional(),
  dayOfMonth: z.number().int().min(1).max(31).optional()
});

export const GET = apiHandler('cashflowTemplates.list', async () => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const templates = await db.cashflowTemplate.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' }
    });

    logger.info('Fetched cashflow templates', withUserContext(user.id, { count: templates.length }));
    return NextResponse.json(templates);
  } catch (error) {
    logger.error('Failed to fetch cashflow templates', withUserContext(user.id, { error }));
    return NextResponse.json({ message: 'Unable to load templates right now.' }, { status: 500 });
  }
});

export const POST = apiHandler('cashflowTemplates.create', async (request) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const body = templateSchema.parse(await request.json());

    const template = await db.cashflowTemplate.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        direction: body.direction,
        amountCents: body.amountCents,
        defaultNote: body.defaultNote,
        dayOfMonth: body.dayOfMonth
      }
    });

    logger.info('Created cashflow template', withUserContext(user.id, { templateId: template.id }));
    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    logger.error('Failed to create cashflow template', withUserContext(user.id, { error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid template payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create template right now.' }, { status: 500 });
  }
});

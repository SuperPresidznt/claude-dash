import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { apiHandler } from '@/lib/api-handler';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  balanceCents: z.number().int().nonnegative(),
  aprPercent: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().int().nonnegative().optional(),
  note: z.string().max(2000).optional()
});

export const GET = apiHandler('liabilities.list', async () => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const liabilities = await db.liability.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    logger.info('Fetched liabilities', withUserContext(user.id, { count: liabilities.length }));
    return NextResponse.json(liabilities);
  } catch (error) {
    logger.error('Failed to fetch liabilities', withUserContext(user.id, { error }));
    return NextResponse.json({ message: 'Unable to load liabilities right now.' }, { status: 500 });
  }
});

export const POST = apiHandler('liabilities.create', async (request) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = createSchema.parse(json);

    const liability = await db.liability.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        balanceCents: body.balanceCents,
        aprPercent: body.aprPercent,
        minimumPayment: body.minimumPayment,
        note: body.note
      }
    });

    logger.info('Created liability', withUserContext(user.id, { liabilityId: liability.id }));
    return NextResponse.json(liability, { status: 201 });
  } catch (error) {
    logger.error('Failed to create liability', withUserContext(user.id, { error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid liability payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create liability right now.' }, { status: 500 });
  }
});

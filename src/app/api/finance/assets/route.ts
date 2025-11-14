import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  valueCents: z.number().int().nonnegative(),
  isLiquid: z.boolean().optional(),
  note: z.string().max(2000).optional()
});

export async function GET() {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const assets = await db.asset.findMany({
      where: { userId: user.id },
      orderBy: { updatedAt: 'desc' }
    });

    logger.info('Fetched assets', withUserContext(user.id, { count: assets.length }));
    return NextResponse.json(assets);
  } catch (error: unknown) {
    logger.error('Failed to fetch assets', withUserContext(user.id, { error }));
    return NextResponse.json({ message: 'Unable to load assets right now.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = createSchema.parse(json);

    const asset = await db.asset.create({
      data: {
        userId: user.id,
        name: body.name,
        category: body.category,
        valueCents: body.valueCents,
        isLiquid: body.isLiquid ?? false,
        note: body.note
      }
    });

    logger.info('Created asset', withUserContext(user.id, { assetId: asset.id }));
    return NextResponse.json(asset, { status: 201 });
  } catch (error: unknown) {
    logger.error('Failed to create asset', withUserContext(user.id, { error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid asset payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to create asset right now.' }, { status: 500 });
  }
}

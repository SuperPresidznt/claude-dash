import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { logger, withUserContext } from '@/lib/logger';
import { apiHandler } from '@/lib/api-handler';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  valueCents: z.number().int().nonnegative().optional(),
  isLiquid: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional()
});

export const PATCH = apiHandler('assets.update', async (request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const json = await request.json();
    const body = updateSchema.parse(json);

    const existing = await db.asset.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Asset not found for update', withUserContext(user.id, { assetId: params.id }));
      return new NextResponse('Asset not found', { status: 404 });
    }

    const asset = await db.asset.update({
      where: { id: params.id },
      data: {
        name: body.name ?? undefined,
        category: body.category ?? undefined,
        valueCents: body.valueCents ?? undefined,
        isLiquid: body.isLiquid ?? undefined,
        note: body.note ?? undefined
      }
    });

    logger.info('Updated asset', withUserContext(user.id, { assetId: params.id }));
    return NextResponse.json(asset);
  } catch (error: unknown) {
    logger.error('Failed to update asset', withUserContext(user.id, { assetId: params.id, error }));

    if (error instanceof z.ZodError) {
      return NextResponse.json({ message: 'Invalid asset payload.', issues: error.issues }, { status: 400 });
    }

    return NextResponse.json({ message: 'Unable to update asset right now.' }, { status: 500 });
  }
});

export const DELETE = apiHandler('assets.delete', async (_: Request, { params }: { params: { id: string } }) => {
  const user = await requireUser();
  const db = prisma as any;

  try {
    const existing = await db.asset.findFirst({
      where: { id: params.id, userId: user.id }
    });

    if (!existing) {
      logger.warn('Asset not found for deletion', withUserContext(user.id, { assetId: params.id }));
      return new NextResponse('Asset not found', { status: 404 });
    }

    await db.asset.delete({ where: { id: params.id } });

    logger.info('Deleted asset', withUserContext(user.id, { assetId: params.id }));
    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    logger.error('Failed to delete asset', withUserContext(user.id, { assetId: params.id, error }));
    return NextResponse.json({ message: 'Unable to delete asset right now.' }, { status: 500 });
  }
});

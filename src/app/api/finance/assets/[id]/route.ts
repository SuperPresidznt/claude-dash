import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  category: z.string().min(1).optional(),
  valueCents: z.number().int().nonnegative().optional(),
  isLiquid: z.boolean().optional(),
  note: z.string().max(2000).nullable().optional()
});

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();
  const json = await request.json();
  const body = updateSchema.parse(json);

  const db = prisma as any;
  const existing = await db.asset.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
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

  return NextResponse.json(asset);
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  const user = await requireUser();

  const db = prisma as any;
  const existing = await db.asset.findFirst({
    where: { id: params.id, userId: user.id }
  });

  if (!existing) {
    return new NextResponse('Asset not found', { status: 404 });
  }

  await db.asset.delete({ where: { id: params.id } });

  return NextResponse.json({ ok: true });
}

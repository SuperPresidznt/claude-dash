import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

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
  const assets = await db.asset.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' }
  });

  return NextResponse.json(assets);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createSchema.parse(json);

  const db = prisma as any;
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

  return NextResponse.json(asset, { status: 201 });
}

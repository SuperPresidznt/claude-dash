import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const createSchema = z.object({
  name: z.string().min(1),
  category: z.string().min(1),
  balanceCents: z.number().int().nonnegative(),
  aprPercent: z.number().min(0).max(100).optional(),
  minimumPayment: z.number().int().nonnegative().optional(),
  note: z.string().max(2000).optional()
});

export async function GET() {
  const user = await requireUser();
  const db = prisma as any;
  const liabilities = await db.liability.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: 'desc' }
  });

  return NextResponse.json(liabilities);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createSchema.parse(json);

  const db = prisma as any;
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

  return NextResponse.json(liability, { status: 201 });
}

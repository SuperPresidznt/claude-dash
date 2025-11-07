import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const createSchema = z.object({
  description: z.string().min(1),
  amountCents: z.number().int().nonnegative(),
  category: z.string().min(1),
  direction: z.enum(['inflow', 'outflow']),
  date: z.string().datetime().optional(),
  note: z.string().max(2000).optional()
});

export async function GET() {
  const user = await requireUser();
  const db = prisma as any;
  const transactions = await db.cashflowTxn.findMany({
    where: { userId: user.id },
    orderBy: { date: 'desc' },
    take: 100
  });

  return NextResponse.json(transactions);
}

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createSchema.parse(json);

  const db = prisma as any;
  const txn = await db.cashflowTxn.create({
    data: {
      userId: user.id,
      description: body.description,
      amountCents: body.amountCents,
      category: body.category,
      direction: body.direction,
      date: body.date ? new Date(body.date) : undefined,
      note: body.note
    }
  });

  return NextResponse.json(txn, { status: 201 });
}

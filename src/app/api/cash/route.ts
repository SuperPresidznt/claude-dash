import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  timestamp: z.string().datetime(),
  cashOnHandCents: z.number().int().nonnegative(),
  note: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const snapshot = await prisma.cashSnapshot.create({
    data: {
      userId: user.id,
      timestamp: new Date(body.timestamp),
      cashOnHandCents: body.cashOnHandCents,
      note: body.note
    }
  });

  return NextResponse.json(snapshot);
}

export async function GET() {
  const user = await requireUser();
  const snapshots = await prisma.cashSnapshot.findMany({
    where: { userId: user.id },
    orderBy: { timestamp: 'desc' },
    take: 50
  });
  return NextResponse.json(snapshots);
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createPartnerSchema = z.object({
  partnerEmail: z.string().email(),
  permissions: z.array(z.enum(['dashboard_view', 'finance_summary', 'goals_view', 'habits_view', 'tasks_view', 'full_access'])),
  notes: z.string().optional(),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const partners = await prisma.accountabilityPartner.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(partners);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data = createPartnerSchema.parse(await request.json());
  const partner = await prisma.accountabilityPartner.create({
    data: { ...data, userId: user.id },
  });

  // TODO: Send invitation email

  return NextResponse.json(partner, { status: 201 });
}

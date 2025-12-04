import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  // TODO: Implement actual Plaid link token creation
  // const plaidClient = new PlaidApi(configuration);
  // const response = await plaidClient.linkTokenCreate({...});

  return NextResponse.json({
    link_token: 'mock-link-token-implement-plaid-sdk',
    expiration: new Date(Date.now() + 3600000).toISOString(),
  });
}

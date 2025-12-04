import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const exchangeSchema = z.object({
  publicToken: z.string(),
});

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { publicToken } = exchangeSchema.parse(await request.json());

  // TODO: Exchange public token for access token with Plaid
  // const response = await plaidClient.itemPublicTokenExchange({ public_token: publicToken });
  // const accessToken = response.data.access_token;
  // const itemId = response.data.item_id;

  const mockAccessToken = 'encrypted-access-token';
  const mockItemId = 'plaid-item-id';
  const mockInstitution = 'Mock Bank';

  const connection = await prisma.plaidConnection.create({
    data: {
      userId: user.id,
      plaidItemId: mockItemId,
      plaidAccessToken: mockAccessToken, // Should be encrypted in production
      institutionId: 'mock-inst',
      institutionName: mockInstitution,
      consentGivenAt: new Date(),
    },
  });

  // TODO: Fetch accounts and initial transactions
  return NextResponse.json({ connectionId: connection.id, institution: mockInstitution });
}

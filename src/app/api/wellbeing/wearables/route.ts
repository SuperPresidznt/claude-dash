import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createWearableSyncSchema = z.object({
  provider: z.enum(['apple_health', 'google_fit', 'fitbit', 'garmin']),
  encryptedAuth: z.string(),
});

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const wearableSyncs = await prisma.wearableSync.findMany({
      where: { userId: user.id },
      include: {
        metrics: {
          orderBy: { date: 'desc' },
          take: 30,
        },
      },
    });

    return NextResponse.json(wearableSyncs);
  } catch (error) {
    console.error('Error fetching wearable syncs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wearable syncs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const data = createWearableSyncSchema.parse(body);

    const wearableSync = await prisma.wearableSync.create({
      data: {
        ...data,
        userId: user.id,
      },
    });

    return NextResponse.json(wearableSync, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating wearable sync:', error);
    return NextResponse.json(
      { error: 'Failed to create wearable sync' },
      { status: 500 }
    );
  }
}

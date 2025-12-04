import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createReadingSessionSchema = z.object({
  resourceId: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  minutes: z.number().int().positive(),
  progress: z.number().min(0).max(100).optional(),
  notes: z.string().optional(),
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

    const { searchParams } = new URL(request.url);
    const resourceId = searchParams.get('resourceId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { userId: user.id };
    if (resourceId) where.resourceId = resourceId;
    if (startDate || endDate) {
      where.startTime = {};
      if (startDate) where.startTime.gte = new Date(startDate);
      if (endDate) where.startTime.lte = new Date(endDate);
    }

    const sessions = await prisma.readingSession.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
            type: true,
          },
        },
      },
      orderBy: { startTime: 'desc' },
    });

    // Calculate total reading time
    const totalMinutes = sessions.reduce((sum, s) => sum + s.minutes, 0);

    return NextResponse.json({
      sessions,
      totalMinutes,
      count: sessions.length,
    });
  } catch (error) {
    console.error('Error fetching reading sessions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reading sessions' },
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
    const data = createReadingSessionSchema.parse(body);

    const readingSession = await prisma.readingSession.create({
      data: {
        ...data,
        startTime: new Date(data.startTime),
        endTime: new Date(data.endTime),
        userId: user.id,
      },
      include: {
        resource: true,
      },
    });

    return NextResponse.json(readingSession, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating reading session:', error);
    return NextResponse.json(
      { error: 'Failed to create reading session' },
      { status: 500 }
    );
  }
}

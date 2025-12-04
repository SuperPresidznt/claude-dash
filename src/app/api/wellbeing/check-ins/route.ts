import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createCheckInSchema = z.object({
  date: z.string().datetime(),
  sleepHours: z.number().min(0).max(24).optional(),
  sleepQuality: z.number().int().min(1).max(10).optional(),
  mood: z.enum(['very_low', 'low', 'neutral', 'good', 'excellent']).optional(),
  energy: z.enum(['exhausted', 'low', 'moderate', 'high', 'energized']).optional(),
  stressLevel: z.number().int().min(1).max(10).optional(),
  physicalHealth: z.number().int().min(1).max(10).optional(),
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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const where: any = { userId: user.id };
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = new Date(startDate);
      if (endDate) where.date.lte = new Date(endDate);
    }

    const checkIns = await prisma.wellbeingCheckIn.findMany({
      where,
      orderBy: { date: 'desc' },
    });

    // Calculate averages
    const avgSleep = checkIns.reduce((sum, c) => sum + (c.sleepHours || 0), 0) / checkIns.length || 0;
    const avgStress = checkIns.reduce((sum, c) => sum + (c.stressLevel || 0), 0) / checkIns.length || 0;

    return NextResponse.json({
      checkIns,
      averages: {
        sleepHours: avgSleep,
        stressLevel: avgStress,
      },
    });
  } catch (error) {
    console.error('Error fetching wellbeing check-ins:', error);
    return NextResponse.json(
      { error: 'Failed to fetch wellbeing check-ins' },
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
    const data = createCheckInSchema.parse(body);

    const checkIn = await prisma.wellbeingCheckIn.upsert({
      where: {
        userId_date: {
          userId: user.id,
          date: new Date(data.date),
        },
      },
      create: {
        ...data,
        date: new Date(data.date),
        userId: user.id,
      },
      update: {
        ...data,
        date: new Date(data.date),
      },
    });

    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating wellbeing check-in:', error);
    return NextResponse.json(
      { error: 'Failed to create wellbeing check-in' },
      { status: 500 }
    );
  }
}

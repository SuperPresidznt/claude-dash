import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { addMinutes } from 'date-fns';

const createMicroBreakSchema = z.object({
  scheduledAt: z.string().datetime(),
  type: z.string().default('mindful'),
  duration: z.number().int().positive().default(5),
  note: z.string().optional(),
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
    const upcoming = searchParams.get('upcoming') === 'true';

    const where: any = { userId: user.id };
    if (upcoming) {
      where.scheduledAt = { gte: new Date() };
      where.completedAt = null;
    }

    const microBreaks = await prisma.microBreak.findMany({
      where,
      orderBy: { scheduledAt: upcoming ? 'asc' : 'desc' },
      take: 50,
    });

    return NextResponse.json(microBreaks);
  } catch (error) {
    console.error('Error fetching micro breaks:', error);
    return NextResponse.json(
      { error: 'Failed to fetch micro breaks' },
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

    // Support auto-scheduling
    if (body.autoSchedule) {
      const { interval, count, startTime } = body;
      const breaks = [];
      let currentTime = new Date(startTime || new Date());

      for (let i = 0; i < count; i++) {
        breaks.push({
          scheduledAt: currentTime,
          type: body.type || 'mindful',
          duration: body.duration || 5,
          userId: user.id,
        });
        currentTime = addMinutes(currentTime, interval);
      }

      const created = await prisma.microBreak.createMany({
        data: breaks,
      });

      return NextResponse.json({ created: created.count }, { status: 201 });
    }

    const data = createMicroBreakSchema.parse(body);

    const microBreak = await prisma.microBreak.create({
      data: {
        ...data,
        scheduledAt: new Date(data.scheduledAt),
        userId: user.id,
      },
    });

    return NextResponse.json(microBreak, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating micro break:', error);
    return NextResponse.json(
      { error: 'Failed to create micro break' },
      { status: 500 }
    );
  }
}

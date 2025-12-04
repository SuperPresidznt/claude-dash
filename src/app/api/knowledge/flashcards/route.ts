import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createFlashCardSchema = z.object({
  resourceId: z.string().optional(),
  front: z.string().min(1),
  back: z.string().min(1),
  tags: z.array(z.string()).default([]),
});

const reviewFlashCardSchema = z.object({
  quality: z.number().int().min(0).max(5), // 0-5 SM-2 algorithm rating
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
    const status = searchParams.get('status');
    const dueOnly = searchParams.get('dueOnly') === 'true';

    const where: any = { userId: user.id };
    if (status) where.status = status;
    if (dueOnly) {
      where.nextReviewAt = { lte: new Date() };
    }

    const flashCards = await prisma.flashCard.findMany({
      where,
      include: {
        resource: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { nextReviewAt: 'asc' },
    });

    return NextResponse.json(flashCards);
  } catch (error) {
    console.error('Error fetching flash cards:', error);
    return NextResponse.json(
      { error: 'Failed to fetch flash cards' },
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
    const data = createFlashCardSchema.parse(body);

    const flashCard = await prisma.flashCard.create({
      data: {
        ...data,
        userId: user.id,
        nextReviewAt: new Date(), // Available for review immediately
      },
    });

    return NextResponse.json(flashCard, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error creating flash card:', error);
    return NextResponse.json(
      { error: 'Failed to create flash card' },
      { status: 500 }
    );
  }
}

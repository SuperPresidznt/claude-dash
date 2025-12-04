import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const reviewSchema = z.object({
  quality: z.number().int().min(0).max(5), // 0-5 SM-2 algorithm rating
});

// SM-2 Spaced Repetition Algorithm
function calculateNextReview(
  easeFactor: number,
  interval: number,
  repetitions: number,
  quality: number
): { easeFactor: number; interval: number; repetitions: number } {
  let newEaseFactor = easeFactor;
  let newInterval = interval;
  let newRepetitions = repetitions;

  if (quality >= 3) {
    // Correct response
    if (newRepetitions === 0) {
      newInterval = 1;
    } else if (newRepetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
    newRepetitions += 1;
  } else {
    // Incorrect response - reset
    newRepetitions = 0;
    newInterval = 1;
  }

  // Update ease factor
  newEaseFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) {
    newEaseFactor = 1.3;
  }

  return {
    easeFactor: newEaseFactor,
    interval: newInterval,
    repetitions: newRepetitions,
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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
    const { quality } = reviewSchema.parse(body);

    const flashCard = await prisma.flashCard.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!flashCard) {
      return NextResponse.json({ error: 'Flash card not found' }, { status: 404 });
    }

    // Calculate next review using SM-2
    const { easeFactor, interval, repetitions } = calculateNextReview(
      flashCard.easeFactor,
      flashCard.interval,
      flashCard.repetitions,
      quality
    );

    // Determine status based on repetitions
    let status = flashCard.status;
    if (repetitions === 0) {
      status = 'new';
    } else if (repetitions < 3) {
      status = 'learning';
    } else if (repetitions < 10) {
      status = 'review';
    } else {
      status = 'mastered';
    }

    const now = new Date();
    const nextReviewAt = new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);

    const updated = await prisma.flashCard.update({
      where: { id: params.id },
      data: {
        easeFactor,
        interval,
        repetitions,
        status,
        lastReviewedAt: now,
        nextReviewAt,
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error reviewing flash card:', error);
    return NextResponse.json(
      { error: 'Failed to review flash card' },
      { status: 500 }
    );
  }
}

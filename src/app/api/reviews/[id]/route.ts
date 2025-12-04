import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const updateReviewSchema = z.object({
  highlights: z.array(z.string()).optional(),
  lowlights: z.array(z.string()).optional(),
  actionItems: z.array(z.string()).optional(),
});

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const review = await prisma.review.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!review) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    return NextResponse.json(review);
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const validated = updateReviewSchema.parse(body);

    const existing = await prisma.review.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.highlights !== undefined) updateData.highlights = validated.highlights;
    if (validated.lowlights !== undefined) updateData.lowlights = validated.lowlights;
    if (validated.actionItems !== undefined) updateData.actionItems = validated.actionItems;

    const review = await prisma.review.update({
      where: { id: params.id },
      data: updateData,
    });

    return NextResponse.json(review);
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  return apiHandler(req, async () => {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const existing = await prisma.review.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 });
    }

    await prisma.review.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}

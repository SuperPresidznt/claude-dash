import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from '@/lib/server-session';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { apiHandler } from '@/lib/api-handler';

const updateKeyResultSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional().nullable(),
  currentValue: z.number().optional(),
  isCompleted: z.boolean().optional(),
  confidenceRating: z.number().int().min(0).max(100).optional().nullable(),
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

    const keyResult = await prisma.keyResult.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
      include: {
        objective: true,
      },
    });

    if (!keyResult) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    return NextResponse.json(keyResult);
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
    const validated = updateKeyResultSchema.parse(body);

    const existing = await prisma.keyResult.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    const updateData: any = {};
    if (validated.title !== undefined) updateData.title = validated.title;
    if (validated.description !== undefined) updateData.description = validated.description;
    if (validated.currentValue !== undefined) updateData.currentValue = validated.currentValue;
    if (validated.isCompleted !== undefined) updateData.isCompleted = validated.isCompleted;
    if (validated.confidenceRating !== undefined) updateData.confidenceRating = validated.confidenceRating;

    const keyResult = await prisma.keyResult.update({
      where: { id: params.id },
      data: updateData,
      include: {
        objective: true,
      },
    });

    return NextResponse.json(keyResult);
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

    const existing = await prisma.keyResult.findFirst({
      where: {
        id: params.id,
        userId: session.user.id,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Key result not found' }, { status: 404 });
    }

    await prisma.keyResult.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ success: true });
  });
}

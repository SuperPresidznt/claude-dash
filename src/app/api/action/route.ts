import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const schema = z.object({
  ideaId: z.string(),
  description: z.string().min(1),
  completedAt: z.string().datetime().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = schema.parse(json);

  const idea = await prisma.idea.findFirst({
    where: { id: body.ideaId, userId: user.id }
  });

  if (!idea) {
    return new NextResponse('Idea not found', { status: 404 });
  }

  const completedAt = body.completedAt ? new Date(body.completedAt) : new Date();

  const action = await prisma.action.create({
    data: {
      userId: user.id,
      ideaId: body.ideaId,
      description: body.description,
      completedAt
    }
  });

  const latencyDays = Math.round(
    (completedAt.getTime() - idea.createdAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({ action, latencyDays });
}

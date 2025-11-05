import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const createSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  linkedMacroGoalId: z.string().optional()
});

export async function POST(request: Request) {
  const user = await requireUser();
  const json = await request.json();
  const body = createSchema.parse(json);

  const idea = await prisma.idea.create({
    data: {
      userId: user.id,
      title: body.title,
      description: body.description,
      linkedMacroGoalId: body.linkedMacroGoalId
    }
  });

  return NextResponse.json(idea);
}

export async function GET() {
  const user = await requireUser();

  const ideas = await prisma.idea.findMany({
    where: { userId: user.id },
    include: {
      macroGoal: true,
      actions: { orderBy: { completedAt: 'asc' } }
    },
    orderBy: { createdAt: 'desc' }
  });

  const serialized = ideas.map((idea) => ({
    ...idea,
    latencyDays: idea.actions[0]
      ? Math.round((idea.actions[0].completedAt.getTime() - idea.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null
  }));

  return NextResponse.json(serialized);
}

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

const createRuleSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  conditionType: z.enum(['runway_low', 'habit_streak_broken', 'budget_exceeded', 'task_overdue', 'goal_progress_stalled', 'wellbeing_declining', 'custom']),
  conditionConfig: z.any(),
  actionType: z.enum(['send_alert', 'create_task', 'schedule_review', 'send_email', 'trigger_webhook', 'custom']),
  actionConfig: z.any(),
  isEnabled: z.boolean().default(true),
});

export async function GET(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const rules = await prisma.automationRule.findMany({
    where: { userId: user.id },
    include: { executionLogs: { orderBy: { triggeredAt: 'desc' }, take: 5 } },
  });

  return NextResponse.json(rules);
}

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const data = createRuleSchema.parse(await request.json());
  const rule = await prisma.automationRule.create({
    data: { ...data, userId: user.id },
  });

  return NextResponse.json(rule, { status: 201 });
}

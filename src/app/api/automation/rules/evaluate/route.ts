import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { subMonths } from 'date-fns';

export async function POST(request: NextRequest) {
  const session = await getServerSession();
  if (!session?.user?.email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { email: session.user.email } });
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const rules = await prisma.automationRule.findMany({
    where: { userId: user.id, isEnabled: true },
  });

  const results = [];

  for (const rule of rules) {
    const shouldTrigger = await evaluateCondition(user.id, rule.conditionType, rule.conditionConfig);

    if (shouldTrigger) {
      const actionResult = await executeAction(user.id, rule.actionType, rule.actionConfig);

      await prisma.automationRule.update({
        where: { id: rule.id },
        data: { lastTriggeredAt: new Date(), triggerCount: { increment: 1 } },
      });

      await prisma.ruleExecutionLog.create({
        data: {
          ruleId: rule.id,
          userId: user.id,
          success: actionResult.success,
          result: actionResult,
        },
      });

      results.push({ ruleId: rule.id, ruleName: rule.name, triggered: true, actionResult });
    }
  }

  return NextResponse.json({ evaluatedRules: rules.length, triggeredRules: results.length, results });
}

async function evaluateCondition(userId: string, type: string, config: any): Promise<boolean> {
  switch (type) {
    case 'runway_low': {
      const assets = await prisma.asset.findMany({ where: { userId, isLiquid: true } });
      const totalLiquid = assets.reduce((sum, a) => sum + a.valueCents, 0);
      const sixMonthsAgo = subMonths(new Date(), 6);
      const txns = await prisma.cashflowTxn.findMany({ where: { userId, date: { gte: sixMonthsAgo } } });
      const avgBurn = txns.filter(t => t.direction === 'outflow').reduce((sum, t) => sum + t.amountCents, 0) / 6;
      const runway = totalLiquid / avgBurn;
      return runway < (config.threshold || 3);
    }
    case 'habit_streak_broken': {
      const habits = await prisma.habit.findMany({ where: { userId, isActive: true } });
      for (const habit of habits) {
        const lastCompletion = await prisma.habitCompletion.findFirst({
          where: { habitId: habit.id },
          orderBy: { date: 'desc' },
        });
        if (!lastCompletion || (new Date().getTime() - lastCompletion.date.getTime()) > 48 * 60 * 60 * 1000) {
          return true;
        }
      }
      return false;
    }
    case 'budget_exceeded': {
      const budgets = await prisma.budgetEnvelope.findMany({ where: { userId } });
      const now = new Date();
      for (const budget of budgets) {
        const spent = await prisma.cashflowTxn.aggregate({
          where: {
            userId,
            category: budget.category,
            direction: 'outflow',
            date: { gte: new Date(now.getFullYear(), now.getMonth(), 1) },
          },
          _sum: { amountCents: true },
        });
        if ((spent._sum.amountCents || 0) > budget.targetCents) return true;
      }
      return false;
    }
    default:
      return false;
  }
}

async function executeAction(userId: string, type: string, config: any): Promise<any> {
  switch (type) {
    case 'create_task':
      const task = await prisma.task.create({
        data: {
          userId,
          title: config.taskTitle || 'Automated Task',
          description: config.taskDescription,
          priority: config.priority || 'medium',
          status: 'todo',
        },
      });
      return { success: true, taskId: task.id };
    case 'send_alert':
      // TODO: Implement notification system
      return { success: true, message: 'Alert would be sent' };
    case 'schedule_review':
      // TODO: Create review task
      return { success: true, message: 'Review scheduled' };
    default:
      return { success: false, message: 'Unknown action type' };
  }
}

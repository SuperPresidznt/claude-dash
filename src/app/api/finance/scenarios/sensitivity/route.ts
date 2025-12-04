import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';
import { subMonths, format } from 'date-fns';

const sensitivitySchema = z.object({
  incomeChangePercent: z.number().min(-100).max(500),
  expenseChangePercent: z.number().min(-100).max(500),
  timeHorizonMonths: z.number().int().positive().default(12),
});

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
    const { incomeChangePercent, expenseChangePercent, timeHorizonMonths } =
      sensitivitySchema.parse(body);

    // Get current liquid assets
    const assets = await prisma.asset.findMany({
      where: { userId: user.id, isLiquid: true },
    });
    const currentLiquidCents = assets.reduce((sum, a) => sum + a.valueCents, 0);

    // Calculate baseline income and expenses from last 3 months
    const threeMonthsAgo = subMonths(new Date(), 3);
    const transactions = await prisma.cashflowTxn.findMany({
      where: {
        userId: user.id,
        date: { gte: threeMonthsAgo },
      },
    });

    const totalInflow = transactions
      .filter(t => t.direction === 'inflow')
      .reduce((sum, t) => sum + t.amountCents, 0);

    const totalOutflow = transactions
      .filter(t => t.direction === 'outflow')
      .reduce((sum, t) => sum + t.amountCents, 0);

    const avgMonthlyIncome = totalInflow / 3;
    const avgMonthlyExpenses = totalOutflow / 3;

    // Calculate new scenario
    const newMonthlyIncome = avgMonthlyIncome * (1 + incomeChangePercent / 100);
    const newMonthlyExpenses = avgMonthlyExpenses * (1 + expenseChangePercent / 100);
    const newMonthlyNet = newMonthlyIncome - newMonthlyExpenses;

    // Project balances
    const projections = [];
    let balance = currentLiquidCents;

    for (let month = 0; month <= timeHorizonMonths; month++) {
      projections.push({
        month,
        balanceCents: Math.round(balance),
        incomeCents: Math.round(newMonthlyIncome),
        expensesCents: Math.round(newMonthlyExpenses),
        netCents: Math.round(newMonthlyNet),
      });

      balance += newMonthlyNet;

      if (balance < 0) {
        projections[projections.length - 1].alert = 'Balance reaches zero';
        break;
      }
    }

    // Compare to baseline
    const baselineNet = avgMonthlyIncome - avgMonthlyExpenses;
    const impactCents = newMonthlyNet - baselineNet;
    const impactPercent = baselineNet !== 0 ? (impactCents / baselineNet) * 100 : 0;

    return NextResponse.json({
      baseline: {
        monthlyIncomeCents: Math.round(avgMonthlyIncome),
        monthlyExpensesCents: Math.round(avgMonthlyExpenses),
        monthlyNetCents: Math.round(baselineNet),
      },
      scenario: {
        incomeChangePercent,
        expenseChangePercent,
        monthlyIncomeCents: Math.round(newMonthlyIncome),
        monthlyExpensesCents: Math.round(newMonthlyExpenses),
        monthlyNetCents: Math.round(newMonthlyNet),
      },
      impact: {
        monthlyCents: Math.round(impactCents),
        annualCents: Math.round(impactCents * 12),
        percentChange: Math.round(impactPercent * 10) / 10,
      },
      projections,
      insights: generateInsights(
        baselineNet,
        newMonthlyNet,
        projections,
        incomeChangePercent,
        expenseChangePercent
      ),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }
    console.error('Error calculating sensitivity:', error);
    return NextResponse.json(
      { error: 'Failed to calculate sensitivity' },
      { status: 500 }
    );
  }
}

function generateInsights(
  baselineNet: number,
  scenarioNet: number,
  projections: any[],
  incomeChange: number,
  expenseChange: number
): string[] {
  const insights: string[] = [];

  if (scenarioNet < 0 && baselineNet >= 0) {
    insights.push('Warning: This scenario would result in negative cash flow');
  }

  if (projections.some(p => p.balanceCents <= 0)) {
    const monthsToZero = projections.findIndex(p => p.balanceCents <= 0);
    insights.push(`Balance would reach zero in ${monthsToZero} months`);
  }

  if (incomeChange < 0 && Math.abs(incomeChange) > 20) {
    insights.push(`Significant income reduction of ${Math.abs(incomeChange)}% would require substantial expense cuts`);
  }

  if (expenseChange < -20) {
    insights.push(`Reducing expenses by ${Math.abs(expenseChange)}% could significantly improve financial health`);
  }

  if (scenarioNet > baselineNet * 2) {
    insights.push('This scenario would dramatically improve your financial position');
  }

  return insights;
}

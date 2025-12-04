import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { subMonths, format } from 'date-fns';

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

    // Get liquid assets
    const assets = await prisma.asset.findMany({
      where: {
        userId: user.id,
        isLiquid: true,
      },
    });

    const totalLiquidCents = assets.reduce((sum, asset) => sum + asset.valueCents, 0);

    // Calculate average monthly burn rate from last 6 months
    const sixMonthsAgo = subMonths(new Date(), 6);
    const transactions = await prisma.cashflowTxn.findMany({
      where: {
        userId: user.id,
        date: { gte: sixMonthsAgo },
      },
    });

    // Group by month and calculate net flow
    const monthlyFlows = new Map<string, number>();
    transactions.forEach(txn => {
      const monthKey = format(txn.date, 'yyyy-MM');
      const current = monthlyFlows.get(monthKey) || 0;
      const amount = txn.direction === 'inflow' ? txn.amountCents : -txn.amountCents;
      monthlyFlows.set(monthKey, current + amount);
    });

    const netFlows = Array.from(monthlyFlows.values());
    const avgMonthlyNetCents = netFlows.length > 0
      ? netFlows.reduce((sum, val) => sum + val, 0) / netFlows.length
      : 0;

    // Calculate runway
    let runwayMonths = 0;
    if (avgMonthlyNetCents < 0) {
      // Burning money
      runwayMonths = totalLiquidCents / Math.abs(avgMonthlyNetCents);
    }

    // Project future balance month by month
    const projections = [];
    let currentBalance = totalLiquidCents;
    for (let i = 0; i < 24; i++) {
      currentBalance += avgMonthlyNetCents;
      projections.push({
        month: i + 1,
        balanceCents: Math.max(0, currentBalance),
        date: format(new Date(new Date().setMonth(new Date().getMonth() + i + 1)), 'yyyy-MM'),
      });

      if (currentBalance <= 0) break;
    }

    return NextResponse.json({
      currentLiquidCents: totalLiquidCents,
      avgMonthlyNetCents,
      avgMonthlyBurnRateCents: avgMonthlyNetCents < 0 ? Math.abs(avgMonthlyNetCents) : 0,
      runwayMonths: runwayMonths > 0 ? runwayMonths : null,
      runwayDate: runwayMonths > 0 ? projections[Math.floor(runwayMonths) - 1]?.date : null,
      projections,
      isHealthy: runwayMonths === 0 || runwayMonths > 6,
      alert: runwayMonths > 0 && runwayMonths < 3 ? 'Critical: Less than 3 months runway' : null,
    });
  } catch (error) {
    console.error('Error calculating runway:', error);
    return NextResponse.json(
      { error: 'Failed to calculate runway' },
      { status: 500 }
    );
  }
}

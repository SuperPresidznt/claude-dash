import { NextResponse } from 'next/server';
import { subDays } from 'date-fns';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';

const CASHFLOW_WINDOW_DAYS = 30;

export async function GET() {
  const user = await requireUser();
  const db = prisma as any;

  const [assets, liabilities, cashflowSample, latestSnapshot] = await Promise.all([
    db.asset.findMany({ where: { userId: user.id } }),
    db.liability.findMany({ where: { userId: user.id } }),
    db.cashflowTxn.findMany({
      where: { userId: user.id, date: { gte: subDays(new Date(), CASHFLOW_WINDOW_DAYS) } },
      orderBy: { date: 'desc' }
    }),
    db.cashSnapshot.findFirst({ where: { userId: user.id }, orderBy: { timestamp: 'desc' } })
  ]);

  const totalAssetsCents = assets.reduce((sum: number, asset: any) => sum + asset.valueCents, 0);
  const liquidAssetsCents = assets.reduce((sum: number, asset: any) => sum + (asset.isLiquid ? asset.valueCents : 0), 0);
  const totalLiabilitiesCents = liabilities.reduce((sum: number, liability: any) => sum + liability.balanceCents, 0);

  const totalInflowCents = cashflowSample
    .filter((txn: any) => txn.direction === 'inflow')
    .reduce((sum: number, txn: any) => sum + txn.amountCents, 0);
  const totalOutflowCents = cashflowSample
    .filter((txn: any) => txn.direction === 'outflow')
    .reduce((sum: number, txn: any) => sum + txn.amountCents, 0);

  const averageDailyBurnCents = CASHFLOW_WINDOW_DAYS > 0 ? totalOutflowCents / CASHFLOW_WINDOW_DAYS : 0;
  const monthlyBurnCents = Math.round(averageDailyBurnCents * 30);

  const cashOnHandCents = latestSnapshot?.cashOnHandCents ?? liquidAssetsCents;
  const rawRunwayMonths = averageDailyBurnCents > 0 ? cashOnHandCents / averageDailyBurnCents / 30 : null;
  const runwayMonths = rawRunwayMonths != null ? Number(rawRunwayMonths.toFixed(1)) : null;

  const debtServiceCents = liabilities.reduce((sum: number, liability: any) => sum + (liability.minimumPayment ?? 0), 0);
  const dscr = debtServiceCents > 0 ? Number((totalInflowCents / debtServiceCents).toFixed(2)) : null;

  const debtUtilization = totalAssetsCents > 0 ? Number((totalLiabilitiesCents / totalAssetsCents).toFixed(2)) : null;

  const summary = {
    netWorthCents: totalAssetsCents - totalLiabilitiesCents,
    liquidNetCents: liquidAssetsCents - totalLiabilitiesCents,
    cashOnHandCents,
    runwayMonths,
    dscr,
    debtUtilization
  };

  const totals = {
    assetsCents: totalAssetsCents,
    liquidAssetsCents,
    liabilitiesCents: totalLiabilitiesCents,
    inflowCents: totalInflowCents,
    outflowCents: totalOutflowCents,
    monthlyBurnCents,
    windowDays: CASHFLOW_WINDOW_DAYS
  };

  return NextResponse.json({
    currency: user.currency,
    summary,
    totals
  });
}

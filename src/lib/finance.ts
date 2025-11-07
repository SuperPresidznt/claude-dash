import { subDays } from 'date-fns';
import { prisma } from './prisma';

export const CASHFLOW_WINDOW_DAYS = 30;

export type AssetRecord = {
  id: string;
  userId: string;
  name: string;
  category: string;
  valueCents: number;
  isLiquid: boolean;
  note: string | null;
  updatedAt: Date;
};

export type LiabilityRecord = {
  id: string;
  userId: string;
  name: string;
  category: string;
  balanceCents: number;
  aprPercent: number | null;
  minimumPayment: number | null;
  note: string | null;
  updatedAt: Date;
};

export type CashflowRecord = {
  id: string;
  userId: string;
  description: string;
  amountCents: number;
  date: Date;
  category: string;
  direction: 'inflow' | 'outflow';
  note: string | null;
};

export type FinanceSummary = {
  netWorthCents: number;
  liquidNetCents: number;
  cashOnHandCents: number;
  runwayMonths: number | null;
  dscr: number | null;
  debtUtilization: number | null;
};

export type FinanceTotals = {
  assetsCents: number;
  liquidAssetsCents: number;
  liabilitiesCents: number;
  inflowCents: number;
  outflowCents: number;
  monthlyBurnCents: number;
  windowDays: number;
};

export type SerializedAsset = Omit<AssetRecord, 'updatedAt'> & { updatedAt: string };
export type SerializedLiability = Omit<LiabilityRecord, 'updatedAt'> & { updatedAt: string };
export type SerializedCashflow = Omit<CashflowRecord, 'date'> & { date: string };

const db = prisma as any;

export async function getAssets(userId: string): Promise<AssetRecord[]> {
  return db.asset.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }) as Promise<AssetRecord[]>;
}

export async function getLiabilities(userId: string): Promise<LiabilityRecord[]> {
  return db.liability.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }) as Promise<LiabilityRecord[]>;
}

export async function getCashflow(userId: string, limit = 100): Promise<CashflowRecord[]> {
  return db.cashflowTxn.findMany({ where: { userId }, orderBy: { date: 'desc' }, take: limit }) as Promise<CashflowRecord[]>;
}

export function serializeAsset(record: AssetRecord): SerializedAsset {
  return { ...record, updatedAt: record.updatedAt.toISOString() };
}

export function serializeLiability(record: LiabilityRecord): SerializedLiability {
  return { ...record, updatedAt: record.updatedAt.toISOString() };
}

export function serializeCashflow(record: CashflowRecord): SerializedCashflow {
  return { ...record, date: record.date.toISOString() };
}

export async function computeFinanceSummary(userId: string): Promise<{ summary: FinanceSummary; totals: FinanceTotals }>
{
  const [assets, liabilities, cashflows, latestSnapshot] = await Promise.all([
    getAssets(userId),
    getLiabilities(userId),
    db.cashflowTxn.findMany({
      where: { userId, date: { gte: subDays(new Date(), CASHFLOW_WINDOW_DAYS) } },
      orderBy: { date: 'desc' }
    }),
    db.cashSnapshot.findFirst({ where: { userId }, orderBy: { timestamp: 'desc' } })
  ]);

  const totalAssetsCents = assets.reduce((sum: number, asset: AssetRecord) => sum + asset.valueCents, 0);
  const liquidAssetsCents = assets.reduce(
    (sum: number, asset: AssetRecord) => sum + (asset.isLiquid ? asset.valueCents : 0),
    0
  );
  const totalLiabilitiesCents = liabilities.reduce(
    (sum: number, liability: LiabilityRecord) => sum + liability.balanceCents,
    0
  );

  const totalInflowCents = cashflows
    .filter((txn: CashflowRecord) => txn.direction === 'inflow')
    .reduce((sum: number, txn: CashflowRecord) => sum + txn.amountCents, 0);
  const totalOutflowCents = cashflows
    .filter((txn: CashflowRecord) => txn.direction === 'outflow')
    .reduce((sum: number, txn: CashflowRecord) => sum + txn.amountCents, 0);

  const averageDailyBurnCents = CASHFLOW_WINDOW_DAYS > 0 ? totalOutflowCents / CASHFLOW_WINDOW_DAYS : 0;
  const monthlyBurnCents = Math.round(averageDailyBurnCents * 30);

  const cashOnHandCents = latestSnapshot?.cashOnHandCents ?? liquidAssetsCents;
  const rawRunwayMonths = averageDailyBurnCents > 0 ? cashOnHandCents / averageDailyBurnCents / 30 : null;
  const runwayMonths = rawRunwayMonths != null ? Number(rawRunwayMonths.toFixed(1)) : null;

  const debtServiceCents = liabilities.reduce(
    (sum: number, liability: LiabilityRecord) => sum + (liability.minimumPayment ?? 0),
    0
  );
  const dscr = debtServiceCents > 0 ? Number((totalInflowCents / debtServiceCents).toFixed(2)) : null;

  const debtUtilization = totalAssetsCents > 0 ? Number((totalLiabilitiesCents / totalAssetsCents).toFixed(2)) : null;

  return {
    summary: {
      netWorthCents: totalAssetsCents - totalLiabilitiesCents,
      liquidNetCents: liquidAssetsCents - totalLiabilitiesCents,
      cashOnHandCents,
      runwayMonths,
      dscr,
      debtUtilization
    },
    totals: {
      assetsCents: totalAssetsCents,
      liquidAssetsCents,
      liabilitiesCents: totalLiabilitiesCents,
      inflowCents: totalInflowCents,
      outflowCents: totalOutflowCents,
      monthlyBurnCents,
      windowDays: CASHFLOW_WINDOW_DAYS
    }
  };
}

export async function getFinanceInitialData(userId: string) {
  const [assets, liabilities, cashflow, { summary, totals }] = await Promise.all([
    getAssets(userId),
    getLiabilities(userId),
    getCashflow(userId),
    computeFinanceSummary(userId)
  ]);

  return {
    assets: assets.map(serializeAsset),
    liabilities: liabilities.map(serializeLiability),
    cashflow: cashflow.map(serializeCashflow),
    summary,
    totals
  };
}

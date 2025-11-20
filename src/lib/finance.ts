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

export type CashflowTemplateRecord = {
  id: string;
  userId: string;
  name: string;
  category: string;
  direction: 'inflow' | 'outflow';
  amountCents: number;
  defaultNote: string | null;
  dayOfMonth: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type BudgetPeriod = 'monthly' | 'quarterly' | 'yearly';

export type BudgetEnvelopeRecord = {
  id: string;
  userId: string;
  name: string;
  category: string;
  period: BudgetPeriod;
  targetCents: number;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
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
export type SerializedCashflowTemplate = Omit<CashflowTemplateRecord, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};
export type SerializedBudgetEnvelope = Omit<BudgetEnvelopeRecord, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

export type BudgetEnvelopeWithActuals = SerializedBudgetEnvelope & {
  periodStart: string;
  actualSpentCents: number;
  remainingCents: number;
  variancePercent: number | null;
};

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

export async function getCashflowTemplates(userId: string): Promise<CashflowTemplateRecord[]> {
  return db.cashflowTemplate.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }) as Promise<CashflowTemplateRecord[]>;
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

export function serializeCashflowTemplate(record: CashflowTemplateRecord): SerializedCashflowTemplate {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

export function serializeBudgetEnvelope(record: BudgetEnvelopeRecord): SerializedBudgetEnvelope {
  return {
    ...record,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

const getPeriodStart = (period: BudgetPeriod) => {
  const now = new Date();
  if (period === 'monthly') {
    return new Date(now.getFullYear(), now.getMonth(), 1);
  }
  if (period === 'quarterly') {
    const quarterStartMonth = Math.floor(now.getMonth() / 3) * 3;
    return new Date(now.getFullYear(), quarterStartMonth, 1);
  }
  return new Date(now.getFullYear(), 0, 1);
};

export async function enrichBudgetEnvelope(
  userId: string,
  envelope: BudgetEnvelopeRecord
): Promise<BudgetEnvelopeWithActuals> {
  const periodStart = getPeriodStart(envelope.period);

  const aggregate = await db.cashflowTxn.aggregate({
    where: {
      userId,
      direction: 'outflow',
      category: envelope.category,
      date: { gte: periodStart }
    },
    _sum: { amountCents: true }
  });

  const actualSpentCents = aggregate._sum.amountCents ?? 0;
  const remainingCents = envelope.targetCents - actualSpentCents;
  const variancePercent = envelope.targetCents > 0
    ? Number(((actualSpentCents - envelope.targetCents) / envelope.targetCents).toFixed(2))
    : null;

  return {
    ...serializeBudgetEnvelope(envelope),
    periodStart: periodStart.toISOString(),
    actualSpentCents,
    remainingCents,
    variancePercent
  };
}

export async function getBudgetEnvelopesWithActuals(userId: string): Promise<BudgetEnvelopeWithActuals[]> {
  const envelopes = (await db.budgetEnvelope.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' }
  })) as BudgetEnvelopeRecord[];

  return Promise.all(envelopes.map((envelope) => enrichBudgetEnvelope(userId, envelope)));
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
  const [assets, liabilities, cashflow, templates, budgets, { summary, totals }] = await Promise.all([
    getAssets(userId),
    getLiabilities(userId),
    getCashflow(userId),
    getCashflowTemplates(userId),
    getBudgetEnvelopesWithActuals(userId),
    computeFinanceSummary(userId)
  ]);

  return {
    assets: assets.map(serializeAsset),
    liabilities: liabilities.map(serializeLiability),
    cashflow: cashflow.map(serializeCashflow),
    templates: templates.map(serializeCashflowTemplate),
    budgets,
    summary,
    totals
  };
}

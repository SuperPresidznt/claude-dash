import { describe, it, expect, vi, beforeEach } from 'vitest';
import { subDays } from 'date-fns';
import * as finance from '../finance';
import { prisma } from '../prisma';

// Mock Prisma
vi.mock('../prisma', () => ({
  prisma: {
    asset: {
      findMany: vi.fn(),
    },
    liability: {
      findMany: vi.fn(),
    },
    cashflowTxn: {
      findMany: vi.fn(),
      aggregate: vi.fn(),
    },
    cashflowTemplate: {
      findMany: vi.fn(),
    },
    budgetEnvelope: {
      findMany: vi.fn(),
    },
    cashSnapshot: {
      findFirst: vi.fn(),
    },
  },
}));

describe('Finance Library', () => {
  const userId = 'test-user-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('serializeAsset', () => {
    it('should convert asset updatedAt to ISO string', () => {
      const asset = {
        id: 'asset-1',
        userId,
        name: 'Savings',
        category: 'cash',
        valueCents: 100000,
        isLiquid: true,
        note: null,
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      const serialized = finance.serializeAsset(asset);

      expect(serialized.updatedAt).toBe('2025-01-01T00:00:00.000Z');
      expect(serialized.name).toBe('Savings');
      expect(serialized.valueCents).toBe(100000);
    });
  });

  describe('serializeLiability', () => {
    it('should convert liability updatedAt to ISO string', () => {
      const liability = {
        id: 'liability-1',
        userId,
        name: 'Credit Card',
        category: 'credit',
        balanceCents: 50000,
        aprPercent: 15.99,
        minimumPayment: 2500,
        note: null,
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      const serialized = finance.serializeLiability(liability);

      expect(serialized.updatedAt).toBe('2025-01-01T00:00:00.000Z');
      expect(serialized.balanceCents).toBe(50000);
    });
  });

  describe('serializeCashflow', () => {
    it('should convert cashflow date to ISO string', () => {
      const cashflow = {
        id: 'txn-1',
        userId,
        description: 'Groceries',
        amountCents: 5000,
        date: new Date('2025-01-01T00:00:00Z'),
        category: 'food',
        direction: 'outflow' as const,
        note: null,
      };

      const serialized = finance.serializeCashflow(cashflow);

      expect(serialized.date).toBe('2025-01-01T00:00:00.000Z');
      expect(serialized.direction).toBe('outflow');
    });
  });

  describe('getAssets', () => {
    it('should fetch and return assets for user', async () => {
      const mockAssets = [
        {
          id: 'asset-1',
          userId,
          name: 'Savings',
          category: 'cash',
          valueCents: 100000,
          isLiquid: true,
          note: null,
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);

      const result = await finance.getAssets(userId);

      expect(prisma.asset.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockAssets);
    });
  });

  describe('getLiabilities', () => {
    it('should fetch and return liabilities for user', async () => {
      const mockLiabilities = [
        {
          id: 'liability-1',
          userId,
          name: 'Credit Card',
          category: 'credit',
          balanceCents: 50000,
          aprPercent: 15.99,
          minimumPayment: 2500,
          note: null,
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.liability.findMany).mockResolvedValue(mockLiabilities as any);

      const result = await finance.getLiabilities(userId);

      expect(prisma.liability.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
      });
      expect(result).toEqual(mockLiabilities);
    });
  });

  describe('getCashflow', () => {
    it('should fetch cashflow transactions with default limit', async () => {
      const mockTxns = [
        {
          id: 'txn-1',
          userId,
          description: 'Groceries',
          amountCents: 5000,
          date: new Date(),
          category: 'food',
          direction: 'outflow',
          note: null,
        },
      ];

      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue(mockTxns as any);

      const result = await finance.getCashflow(userId);

      expect(prisma.cashflowTxn.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 100,
      });
      expect(result).toEqual(mockTxns);
    });

    it('should respect custom limit', async () => {
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue([]);

      await finance.getCashflow(userId, 50);

      expect(prisma.cashflowTxn.findMany).toHaveBeenCalledWith({
        where: { userId },
        orderBy: { date: 'desc' },
        take: 50,
      });
    });
  });

  describe('computeFinanceSummary', () => {
    it('should calculate net worth correctly', async () => {
      const mockAssets = [
        { valueCents: 100000, isLiquid: true },
        { valueCents: 50000, isLiquid: false },
      ];
      const mockLiabilities = [
        { balanceCents: 30000, minimumPayment: 1000 },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue(mockLiabilities as any);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(null);

      const { summary, totals } = await finance.computeFinanceSummary(userId);

      // Net worth = 150000 - 30000 = 120000
      expect(summary.netWorthCents).toBe(120000);
      // Liquid net = 100000 - 30000 = 70000
      expect(summary.liquidNetCents).toBe(70000);
      expect(totals.assetsCents).toBe(150000);
      expect(totals.liquidAssetsCents).toBe(100000);
      expect(totals.liabilitiesCents).toBe(30000);
    });

    it('should calculate runway months correctly', async () => {
      const now = new Date();
      const mockAssets = [
        { valueCents: 300000, isLiquid: true },
      ];
      const mockLiabilities = [];

      // Create outflow of 100,000 cents over 30 days
      // Daily burn = 100000 / 30 = 3333.33 cents
      // Runway = 300000 / 3333.33 / 30 = 3 months
      const mockCashflows = Array.from({ length: 30 }, (_, i) => ({
        direction: 'outflow',
        amountCents: Math.floor(100000 / 30),
        date: subDays(now, i),
      }));

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue(mockLiabilities as any);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue(mockCashflows as any);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(null);

      const { summary } = await finance.computeFinanceSummary(userId);

      // Runway should be approximately 3 months
      expect(summary.runwayMonths).toBeGreaterThan(2.5);
      expect(summary.runwayMonths).toBeLessThan(3.5);
    });

    it('should calculate DSCR correctly', async () => {
      const now = new Date();
      const mockAssets = [];
      const mockLiabilities = [
        { balanceCents: 50000, minimumPayment: 1000 },
        { balanceCents: 30000, minimumPayment: 500 },
      ];
      const mockCashflows = [
        { direction: 'inflow', amountCents: 3000, date: now },
        { direction: 'outflow', amountCents: 500, date: now },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue(mockLiabilities as any);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue(mockCashflows as any);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(null);

      const { summary } = await finance.computeFinanceSummary(userId);

      // DSCR = 3000 / (1000 + 500) = 2.0
      expect(summary.dscr).toBe(2.0);
    });

    it('should calculate debt utilization correctly', async () => {
      const mockAssets = [
        { valueCents: 100000, isLiquid: true },
      ];
      const mockLiabilities = [
        { balanceCents: 25000, minimumPayment: 1000 },
      ];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue(mockLiabilities as any);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(null);

      const { summary } = await finance.computeFinanceSummary(userId);

      // Debt utilization = 25000 / 100000 = 0.25
      expect(summary.debtUtilization).toBe(0.25);
    });

    it('should use cash snapshot when available', async () => {
      const mockAssets = [
        { valueCents: 100000, isLiquid: true },
      ];
      const mockSnapshot = {
        cashOnHandCents: 80000,
        timestamp: new Date(),
      };

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(mockSnapshot as any);

      const { summary } = await finance.computeFinanceSummary(userId);

      expect(summary.cashOnHandCents).toBe(80000);
    });

    it('should handle no liabilities', async () => {
      const mockAssets = [{ valueCents: 100000, isLiquid: true }];

      vi.mocked(prisma.asset.findMany).mockResolvedValue(mockAssets as any);
      vi.mocked(prisma.liability.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashflowTxn.findMany).mockResolvedValue([]);
      vi.mocked(prisma.cashSnapshot.findFirst).mockResolvedValue(null);

      const { summary } = await finance.computeFinanceSummary(userId);

      expect(summary.netWorthCents).toBe(100000);
      expect(summary.dscr).toBeNull();
      expect(summary.debtUtilization).toBeNull();
    });
  });

  describe('enrichBudgetEnvelope', () => {
    it('should calculate budget actuals for monthly period', async () => {
      const now = new Date('2025-01-15T00:00:00Z');
      vi.setSystemTime(now);

      const envelope = {
        id: 'envelope-1',
        userId,
        name: 'Groceries',
        category: 'food',
        period: 'monthly' as const,
        targetCents: 50000,
        note: null,
        createdAt: new Date('2025-01-01T00:00:00Z'),
        updatedAt: new Date('2025-01-01T00:00:00Z'),
      };

      vi.mocked(prisma.cashflowTxn.aggregate).mockResolvedValue({
        _sum: { amountCents: 30000 },
      } as any);

      const result = await finance.enrichBudgetEnvelope(userId, envelope);

      expect(result.actualSpentCents).toBe(30000);
      expect(result.remainingCents).toBe(20000); // 50000 - 30000
      expect(result.variancePercent).toBe(-0.4); // (30000 - 50000) / 50000
      expect(prisma.cashflowTxn.aggregate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            userId,
            direction: 'outflow',
            category: 'food',
            date: { gte: new Date('2025-01-01T00:00:00.000Z') },
          }),
        })
      );

      vi.useRealTimers();
    });

    it('should handle over-budget scenarios', async () => {
      const envelope = {
        id: 'envelope-1',
        userId,
        name: 'Groceries',
        category: 'food',
        period: 'monthly' as const,
        targetCents: 50000,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Spent 60000, over by 10000
      vi.mocked(prisma.cashflowTxn.aggregate).mockResolvedValue({
        _sum: { amountCents: 60000 },
      } as any);

      const result = await finance.enrichBudgetEnvelope(userId, envelope);

      expect(result.actualSpentCents).toBe(60000);
      expect(result.remainingCents).toBe(-10000); // Over budget
      expect(result.variancePercent).toBe(0.2); // (60000 - 50000) / 50000
    });

    it('should handle no spending', async () => {
      const envelope = {
        id: 'envelope-1',
        userId,
        name: 'Groceries',
        category: 'food',
        period: 'monthly' as const,
        targetCents: 50000,
        note: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.cashflowTxn.aggregate).mockResolvedValue({
        _sum: { amountCents: null },
      } as any);

      const result = await finance.enrichBudgetEnvelope(userId, envelope);

      expect(result.actualSpentCents).toBe(0);
      expect(result.remainingCents).toBe(50000);
      expect(result.variancePercent).toBe(-1); // -100%
    });
  });
});

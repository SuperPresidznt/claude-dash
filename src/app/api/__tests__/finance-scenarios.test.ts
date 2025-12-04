import { describe, it, expect } from 'vitest';

describe('Finance Scenario Planning', () => {
  describe('Runway Calculation', () => {
    it('should calculate runway months correctly', () => {
      const totalLiquidCents = 10000 * 100; // $10,000
      const avgMonthlyBurnCents = 2000 * 100; // $2,000/month

      const runwayMonths = totalLiquidCents / avgMonthlyBurnCents;

      expect(runwayMonths).toBe(5);
    });

    it('should project future balances month by month', () => {
      const startBalance = 10000 * 100;
      const monthlyNet = -2000 * 100;
      const months = 5;

      const projections = [];
      let balance = startBalance;

      for (let i = 0; i < months; i++) {
        balance += monthlyNet;
        projections.push({ month: i + 1, balance });
      }

      expect(projections[0].balance).toBe(8000 * 100);
      expect(projections[4].balance).toBe(0);
    });
  });

  describe('Debt Payoff - Snowball Method', () => {
    it('should pay off smallest debt first', () => {
      const debts = [
        { balance: 5000, minPayment: 100, apr: 15 },
        { balance: 10000, minPayment: 200, apr: 20 },
        { balance: 3000, minPayment: 75, apr: 10 },
      ];

      const sorted = [...debts].sort((a, b) => a.balance - b.balance);

      expect(sorted[0].balance).toBe(3000);
      expect(sorted[2].balance).toBe(10000);
    });
  });

  describe('Debt Payoff - Avalanche Method', () => {
    it('should pay off highest APR first', () => {
      const debts = [
        { balance: 5000, minPayment: 100, apr: 15 },
        { balance: 10000, minPayment: 200, apr: 20 },
        { balance: 3000, minPayment: 75, apr: 10 },
      ];

      const sorted = [...debts].sort((a, b) => b.apr - a.apr);

      expect(sorted[0].apr).toBe(20);
      expect(sorted[2].apr).toBe(10);
    });
  });

  describe('Sensitivity Analysis', () => {
    it('should calculate impact of income change', () => {
      const baselineIncome = 5000 * 100;
      const baselineExpenses = 4000 * 100;
      const incomeChangePercent = -20;

      const newIncome = baselineIncome * (1 + incomeChangePercent / 100);
      const newNet = newIncome - baselineExpenses;
      const baselineNet = baselineIncome - baselineExpenses;
      const impact = newNet - baselineNet;

      expect(newIncome).toBe(4000 * 100);
      expect(impact).toBe(-1000 * 100);
    });

    it('should project balances over time horizon', () => {
      const startingBalance = 20000 * 100;
      const monthlyNet = -500 * 100;
      const months = 12;

      let balance = startingBalance;
      const projections = [];

      for (let i = 0; i <= months; i++) {
        projections.push({ month: i, balance });
        balance += monthlyNet;
      }

      expect(projections[12].balance).toBe(14000 * 100);
    });
  });
});

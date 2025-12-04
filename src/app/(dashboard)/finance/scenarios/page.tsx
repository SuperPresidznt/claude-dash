'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function FinanceScenariosPage() {
  const [view, setView] = useState<'runway' | 'debt' | 'sensitivity'>('runway');

  const { data: runwayData } = useQuery({
    queryKey: ['runway'],
    queryFn: async () => {
      const res = await fetch('/api/finance/scenarios/runway');
      if (!res.ok) throw new Error('Failed to fetch runway');
      return res.json();
    },
  });

  const calculateDebtPayoff = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/finance/scenarios/debt-payoff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to calculate debt payoff');
      return res.json();
    },
  });

  const calculateSensitivity = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch('/api/finance/scenarios/sensitivity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to calculate sensitivity');
      return res.json();
    },
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold mb-8">Financial Scenarios</h1>

      <div className="flex gap-4 mb-8">
        <button
          onClick={() => setView('runway')}
          className={`px-4 py-2 rounded ${view === 'runway' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Runway Projection
        </button>
        <button
          onClick={() => setView('debt')}
          className={`px-4 py-2 rounded ${view === 'debt' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Debt Payoff
        </button>
        <button
          onClick={() => setView('sensitivity')}
          className={`px-4 py-2 rounded ${view === 'sensitivity' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          Sensitivity Analysis
        </button>
      </div>

      {view === 'runway' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Financial Runway</h2>
          {runwayData?.alert && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
              {runwayData.alert}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Current Liquid Assets</p>
              <p className="text-2xl font-bold">${(runwayData?.currentLiquidCents / 100 || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Monthly Burn Rate</p>
              <p className="text-2xl font-bold">${(runwayData?.avgMonthlyBurnRateCents / 100 || 0).toFixed(2)}</p>
            </div>
            <div className="bg-gray-50 p-4 rounded">
              <p className="text-sm text-gray-600">Runway</p>
              <p className="text-2xl font-bold">
                {runwayData?.runwayMonths ? `${runwayData.runwayMonths.toFixed(1)} months` : 'Positive'}
              </p>
            </div>
          </div>
          <div className="mt-6">
            <h3 className="font-bold mb-2">12-Month Projection</h3>
            <div className="space-y-2">
              {runwayData?.projections?.slice(0, 12).map((proj: any) => (
                <div key={proj.month} className="flex justify-between items-center">
                  <span className="text-sm">{proj.date}</span>
                  <span className="text-sm font-medium">${(proj.balanceCents / 100).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {view === 'debt' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Debt Payoff Calculator</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            calculateDebtPayoff.mutate({
              strategy: formData.get('strategy'),
              monthlyPaymentCents: parseFloat(formData.get('monthlyPayment') as string) * 100,
            });
          }}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Strategy</label>
                <select name="strategy" className="w-full border rounded px-3 py-2">
                  <option value="snowball">Snowball (Smallest First)</option>
                  <option value="avalanche">Avalanche (Highest APR First)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Monthly Payment ($)</label>
                <input type="number" name="monthlyPayment" step="0.01" className="w-full border rounded px-3 py-2" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Calculate Payoff
              </button>
            </div>
          </form>

          {calculateDebtPayoff.data && (
            <div className="mt-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Total Debt</p>
                  <p className="text-xl font-bold">${(calculateDebtPayoff.data.totalDebtCents / 100).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Months to Payoff</p>
                  <p className="text-xl font-bold">{calculateDebtPayoff.data.monthsToPayoff}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600">Total Interest</p>
                  <p className="text-xl font-bold">${(calculateDebtPayoff.data.totalInterestPaidCents / 100).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {view === 'sensitivity' && (
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-bold mb-4">Income Sensitivity Analysis</h2>
          <form onSubmit={(e) => {
            e.preventDefault();
            const formData = new FormData(e.currentTarget);
            calculateSensitivity.mutate({
              incomeChangePercent: parseFloat(formData.get('incomeChange') as string),
              expenseChangePercent: parseFloat(formData.get('expenseChange') as string),
              timeHorizonMonths: parseInt(formData.get('timeHorizon') as string),
            });
          }}>
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">Income Change (%)</label>
                <input type="number" name="incomeChange" step="1" defaultValue="0" className="w-full border rounded px-3 py-2" />
                <p className="text-xs text-gray-500 mt-1">e.g., -20 for 20% decrease, 50 for 50% increase</p>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Expense Change (%)</label>
                <input type="number" name="expenseChange" step="1" defaultValue="0" className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time Horizon (months)</label>
                <input type="number" name="timeHorizon" step="1" defaultValue="12" className="w-full border rounded px-3 py-2" />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                Run Analysis
              </button>
            </div>
          </form>

          {calculateSensitivity.data && (
            <div className="mt-6 space-y-4">
              {calculateSensitivity.data.insights?.map((insight: string, idx: number) => (
                <div key={idx} className="bg-yellow-50 border border-yellow-200 p-3 rounded text-sm">
                  {insight}
                </div>
              ))}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">Baseline</p>
                  <p>Monthly Net: ${(calculateSensitivity.data.baseline?.monthlyNetCents / 100 || 0).toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded">
                  <p className="text-sm text-gray-600 mb-2">Scenario</p>
                  <p>Monthly Net: ${(calculateSensitivity.data.scenario?.monthlyNetCents / 100 || 0).toFixed(2)}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

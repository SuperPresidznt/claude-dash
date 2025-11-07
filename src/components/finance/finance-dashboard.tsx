'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { MetricCard } from '@/components/metric-card';
import type {
  SerializedAsset,
  SerializedLiability,
  SerializedCashflow,
  FinanceSummary,
  FinanceTotals
} from '@/lib/finance';

const fetchJson = async <T,>(url: string): Promise<T> => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

const centsToCurrency = (value: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);

const percentFormatter = new Intl.NumberFormat(undefined, {
  style: 'percent',
  minimumFractionDigits: 0,
  maximumFractionDigits: 1
});

const numberFormatter = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

type SummaryResponse = {
  summary: FinanceSummary;
  totals: FinanceTotals;
  currency: string;
};

type FinanceDashboardProps = {
  currency: string;
  initialAssets: SerializedAsset[];
  initialLiabilities: SerializedLiability[];
  initialCashflow: SerializedCashflow[];
  initialSummary: FinanceSummary;
  initialTotals: FinanceTotals;
};

export function FinanceDashboard({
  currency,
  initialAssets,
  initialLiabilities,
  initialCashflow,
  initialSummary,
  initialTotals
}: FinanceDashboardProps) {
  const { data: assets } = useQuery({
    queryKey: ['finance', 'assets'],
    queryFn: () => fetchJson<SerializedAsset[]>('/api/finance/assets'),
    initialData: initialAssets
  });

  const { data: liabilities } = useQuery({
    queryKey: ['finance', 'liabilities'],
    queryFn: () => fetchJson<SerializedLiability[]>('/api/finance/liabilities'),
    initialData: initialLiabilities
  });

  const { data: cashflow } = useQuery({
    queryKey: ['finance', 'cashflow'],
    queryFn: () => fetchJson<SerializedCashflow[]>('/api/finance/cashflow'),
    initialData: initialCashflow
  });

  const { data: summaryResponse } = useQuery({
    queryKey: ['finance', 'summary'],
    queryFn: () => fetchJson<SummaryResponse>('/api/finance/summary'),
    initialData: { summary: initialSummary, totals: initialTotals, currency }
  });

  const { summary, totals } = summaryResponse ?? {
    summary: initialSummary,
    totals: initialTotals
  };

  const kpIs = useMemo(
    () => [
      {
        label: 'Net Worth',
        value: centsToCurrency(summary.netWorthCents, currency),
        helper: `Assets ${centsToCurrency(totals.assetsCents, currency)} – Liabilities ${centsToCurrency(
          totals.liabilitiesCents,
          currency
        )}`
      },
      {
        label: 'Liquid Net Worth',
        value: centsToCurrency(summary.liquidNetCents, currency),
        helper: `${numberFormatter.format(totals.windowDays)}d liquid runway`
      },
      {
        label: 'Cash on Hand',
        value: centsToCurrency(summary.cashOnHandCents, currency),
        helper: totals.monthlyBurnCents
          ? `${centsToCurrency(totals.monthlyBurnCents, currency)} / month burn`
          : 'No burn recorded yet'
      },
      {
        label: 'Runway',
        value: summary.runwayMonths != null ? `${summary.runwayMonths.toFixed(1)} months` : '—',
        helper: summary.runwayMonths != null ? 'Runway based on 30d cashflow window' : 'Log outflows to estimate runway'
      },
      {
        label: 'DSCR',
        value: summary.dscr != null ? summary.dscr.toFixed(2) : '—',
        helper: summary.dscr != null ? 'Target ≥ 1.25 for healthy coverage' : 'Add income & debt payments to see DSCR'
      },
      {
        label: 'Debt Utilization',
        value: summary.debtUtilization != null ? percentFormatter.format(summary.debtUtilization) : '—',
        helper: summary.debtUtilization != null ? 'Liabilities / Assets' : 'Add assets & liabilities to compute utilization'
      }
    ],
    [currency, summary, totals]
  );

  return (
    <div className="space-y-6">
      <section>
        <div className="grid gap-4 md:grid-cols-3">
          {kpIs.map((item) => (
            <MetricCard key={item.label} label={item.label} value={item.value} helper={item.helper} />
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Assets</h2>
              <p className="text-xs text-slate-400">Tracked holdings and their latest values.</p>
            </div>
            <span className="text-xs text-slate-500">{assets?.length ?? 0} items</span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4 text-right">Value</th>
                  <th className="py-2 pr-4 text-center">Liquid</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {assets?.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4 font-medium text-white">{asset.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{asset.category}</td>
                    <td className="py-2 pr-4 text-right font-medium text-emerald-300">
                      {centsToCurrency(asset.valueCents, currency)}
                    </td>
                    <td className="py-2 pr-4 text-center">
                      {asset.isLiquid ? <span className="text-emerald-300">Yes</span> : <span className="text-slate-500">No</span>}
                    </td>
                    <td className="py-2 text-slate-400">{new Date(asset.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(assets?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                      No assets tracked yet. Add your first asset to see it here.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-white">Liabilities</h2>
              <p className="text-xs text-slate-400">Monitor outstanding balances and required payments.</p>
            </div>
            <span className="text-xs text-slate-500">{liabilities?.length ?? 0} items</span>
          </header>
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm text-slate-200">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 pr-4">Name</th>
                  <th className="py-2 pr-4">Category</th>
                  <th className="py-2 pr-4 text-right">Balance</th>
                  <th className="py-2 pr-4 text-right">APR</th>
                  <th className="py-2 pr-4 text-right">Min Payment</th>
                  <th className="py-2">Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {liabilities?.map((liability) => (
                  <tr key={liability.id} className="hover:bg-slate-800/40">
                    <td className="py-2 pr-4 font-medium text-white">{liability.name}</td>
                    <td className="py-2 pr-4 text-slate-300">{liability.category}</td>
                    <td className="py-2 pr-4 text-right font-medium text-rose-300">
                      {centsToCurrency(liability.balanceCents, currency)}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {liability.aprPercent != null ? `${liability.aprPercent.toFixed(2)}%` : '—'}
                    </td>
                    <td className="py-2 pr-4 text-right">
                      {liability.minimumPayment != null
                        ? centsToCurrency(liability.minimumPayment, currency)
                        : '—'}
                    </td>
                    <td className="py-2 text-slate-400">{new Date(liability.updatedAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {(liabilities?.length ?? 0) === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-slate-500">
                      No liabilities tracked yet. Add credit lines, loans, or payables.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-5">
        <header className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Cashflow (last 100)</h2>
            <p className="text-xs text-slate-400">Track inflows versus outflows to understand burn.</p>
          </div>
          <div className="flex gap-3 text-xs text-slate-400">
            <span>Inflow: {centsToCurrency(totals.inflowCents, currency)}</span>
            <span>Outflow: {centsToCurrency(totals.outflowCents, currency)}</span>
            <span>Burn (30d avg): {centsToCurrency(totals.monthlyBurnCents, currency)}</span>
          </div>
        </header>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm text-slate-200">
            <thead className="text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Description</th>
                <th className="py-2 pr-4">Category</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2">Direction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {cashflow?.map((txn) => (
                <tr key={txn.id} className="hover:bg-slate-800/40">
                  <td className="py-2 pr-4 text-slate-400">{new Date(txn.date).toLocaleDateString()}</td>
                  <td className="py-2 pr-4 font-medium text-white">{txn.description}</td>
                  <td className="py-2 pr-4 text-slate-300">{txn.category}</td>
                  <td
                    className={`py-2 pr-4 text-right font-medium ${
                      txn.direction === 'inflow' ? 'text-emerald-300' : 'text-rose-300'
                    }`}
                  >
                    {centsToCurrency(txn.amountCents, currency)}
                  </td>
                  <td className="py-2 capitalize text-slate-400">{txn.direction}</td>
                </tr>
              ))}
              {(cashflow?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-sm text-slate-500">
                    No cashflow transactions recorded yet. Log inflows and outflows to see trends.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

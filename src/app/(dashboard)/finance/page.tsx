import { requireUser } from '@/lib/server-session';
import { FinanceDashboard } from '@/components/finance/finance-dashboard';
import { getFinanceInitialData } from '@/lib/finance';

export default async function FinancePage() {
  const user = await requireUser();
  const data = await getFinanceInitialData(user.id);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-semibold text-white">Finance</h1>
        <p className="mt-1 text-sm text-slate-400">
          Track assets, liabilities, and cashflow trends while monitoring key stability metrics.
        </p>
      </header>
      <FinanceDashboard
        userId={user.id}
        currency={user.currency}
        initialAssets={data.assets}
        initialLiabilities={data.liabilities}
        initialCashflow={data.cashflow}
        initialTemplates={data.templates}
        initialBudgets={data.budgets}
        initialSummary={data.summary}
        initialTotals={data.totals}
      />
    </div>
  );
}

import { auth } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { MetricsDashboard } from '@/components/metrics-dashboard';

export default async function MetricsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect('/signin');
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Metrics Dashboard</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review trendlines for starts, study minutes, latency, cash, and macro goals.
        </p>
      </header>
      <MetricsDashboard currency={user.currency} />
    </div>
  );
}

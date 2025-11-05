import { auth } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { SettingsPanel } from '@/components/settings-panel';

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { macroGoals: { orderBy: { title: 'asc' } } }
  });

  if (!user) {
    redirect('/signin');
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Settings</h1>
        <p className="mt-1 text-sm text-slate-400">
          Tune defaults, timezone, currency, and macro goal labels.
        </p>
      </header>
      <SettingsPanel
        user={{
          id: user.id,
          email: user.email,
          timezone: user.timezone,
          currency: user.currency,
          defaultStartDuration: user.defaultStartDuration
        }}
        macroGoals={user.macroGoals.map((goal) => ({
          id: goal.id,
          title: goal.title,
          description: goal.description ?? '',
          targetValue: goal.targetValue ?? undefined,
          targetMetricType: goal.targetMetricType
        }))}
      />
    </div>
  );
}

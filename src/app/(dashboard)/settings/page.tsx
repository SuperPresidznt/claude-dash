import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { SettingsPanel } from '@/components/settings-panel';

export default async function SettingsPage() {
  const user = await requireUser();

  const userWithGoals = await prisma.user.findUnique({
    where: { id: user.id },
    include: { macroGoals: { orderBy: { title: 'asc' } } }
  });

  if (!userWithGoals) {
    throw new Error('No user record available to render settings.');
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
          id: userWithGoals.id,
          email: userWithGoals.email,
          timezone: userWithGoals.timezone,
          currency: userWithGoals.currency,
          defaultStartDuration: userWithGoals.defaultStartDuration
        }}
        macroGoals={userWithGoals.macroGoals.map((goal) => ({
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

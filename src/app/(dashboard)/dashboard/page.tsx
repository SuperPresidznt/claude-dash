import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { formatZoned, todayRange } from '@/lib/date';
import { StartControls } from '@/components/start-controls';
import { TodayMetrics } from '@/components/today-metrics';
import { IdeaQuickAdd, StudyQuickAdd, CashQuickAdd } from '@/components/quick-add';

export default async function DashboardPage() {
  const session = await auth().catch(() => null);
  const seedEmail = process.env.SEED_USER_EMAIL ?? 'owner@example.com';
  const userInclude = {
    macroGoals: {
      where: { isActive: true },
      orderBy: { title: 'asc' as const }
    }
  };

  let user = session?.user?.id
    ? await prisma.user.findUnique({ where: { id: session.user.id }, include: userInclude })
    : null;

  if (!user) {
    user = await prisma.user.findFirst({ where: { email: seedEmail }, include: userInclude });
  }

  if (!user) {
    throw new Error('No user record available to render dashboard.');
  }

  const { start, end } = todayRange(user.timezone);
  const [starts, studyAggregate, latestCash] = await Promise.all([
    prisma.startEvent.count({
      where: { userId: user.id, timestamp: { gte: start, lte: end } }
    }),
    prisma.studySession.aggregate({
      where: { userId: user.id, startAt: { gte: start, lte: end } },
      _sum: { minutes: true }
    }),
    prisma.cashSnapshot.findFirst({
      where: { userId: user.id },
      orderBy: { timestamp: 'desc' }
    })
  ]);

  const todayMetrics = {
    starts,
    studyMinutes: studyAggregate._sum.minutes ?? 0,
    cash: latestCash?.cashOnHandCents ?? null,
    currency: user.currency
  };

  const formattedDate = formatZoned(new Date(), "EEEE, MMM d", user.timezone);

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm uppercase tracking-widest text-slate-500">Today</p>
          <h1 className="text-3xl font-semibold text-white">{formattedDate}</h1>
        </div>
      </header>
      <TodayMetrics initialData={todayMetrics} />
      <section className="rounded-3xl border border-slate-800 bg-surface/70 p-6 shadow-lg shadow-black/30">
        <StartControls macroGoals={user.macroGoals} defaultDuration={user.defaultStartDuration} />
      </section>
      <section>
        <h2 className="text-xl font-semibold text-white">Quick capture</h2>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          <IdeaQuickAdd macroGoals={user.macroGoals} />
          <StudyQuickAdd />
          <CashQuickAdd />
        </div>
      </section>
    </div>
  );
}

import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { RoutineExperimentBoard } from '@/components/routine-experiment-board';

export default async function ExperimentsPage() {
  const user = await requireUser();

  const experiments = await prisma.routineExperiment.findMany({
    where: { userId: user.id },
    orderBy: { startDate: 'desc' }
  });

  const serialized = experiments.map((exp) => ({
    ...exp,
    startDate: exp.startDate.toISOString(),
    endDate: exp.endDate ? exp.endDate.toISOString() : null
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Routine Experiments</h1>
        <p className="mt-1 text-sm text-slate-400">
          Run micro-pilots, capture takeaways, and decide to keep, kill, or modify.
        </p>
      </header>
      <RoutineExperimentBoard experiments={serialized} />
    </div>
  );
}

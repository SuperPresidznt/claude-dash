import { auth } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RoutineExperimentBoard } from '@/components/routine-experiment-board';

export default async function ExperimentsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const experiments = await prisma.routineExperiment.findMany({
    where: { userId: session.user.id },
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

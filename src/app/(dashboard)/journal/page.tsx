import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/server-session';
import { IdeaJournalTable } from '@/components/idea-journal-table';

export default async function JournalPage() {
  const user = await requireUser();

  const ideas = await prisma.idea.findMany({
    where: { userId: user.id },
    include: {
      macroGoal: true,
      actions: true
    },
    orderBy: { createdAt: 'desc' }
  });

  const serialized = ideas.map((idea) => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    createdAt: idea.createdAt.toISOString(),
    macroTitle: idea.macroGoal?.title ?? '—',
    actionDone: idea.actions.length > 0,
    completedAt: idea.actions[0]?.completedAt?.toISOString() ?? null,
    latencyDays: idea.actions[0]
      ? Math.round((idea.actions[0].completedAt.getTime() - idea.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      : null
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Idea → Action Journal</h1>
        <p className="mt-1 text-sm text-slate-400">
          Capture latency between inspiration and motion. Keep the loop tight.
        </p>
      </header>
      <IdeaJournalTable ideas={serialized} />
    </div>
  );
}

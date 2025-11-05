import { auth } from 'next-auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { RemindersPanel } from '@/components/reminders-panel';

export default async function RemindersPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect('/signin');
  }

  const reminders = await prisma.reminder.findMany({
    where: { userId: session.user.id },
    orderBy: { nextFireAt: 'asc' }
  });

  const serialized = reminders.map((reminder) => ({
    ...reminder,
    nextFireAt: reminder.nextFireAt.toISOString()
  }));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-semibold text-white">Reminders & cues</h1>
        <p className="mt-1 text-sm text-slate-400">
          Gentle prompts to begin again. Toggle, test-fire, and iterate with grace.
        </p>
      </header>
      <RemindersPanel reminders={serialized} />
    </div>
  );
}

'use client';

import { useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState } from 'react';

const postAction = async (ideaId: string) => {
  const response = await fetch('/api/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ideaId, description: 'Marked complete from journal' })
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

type IdeaRow = {
  id: string;
  title: string;
  description: string | null;
  createdAt: string;
  macroTitle: string;
  actionDone: boolean;
  completedAt: string | null;
  latencyDays: number | null;
};

const latencyTone = (latency: number | null) => {
  if (latency == null) return 'bg-slate-700/30 text-slate-300';
  if (latency <= 3) return 'bg-emerald-500/10 text-emerald-200';
  if (latency <= 7) return 'bg-amber-500/10 text-amber-200';
  return 'bg-rose-500/10 text-rose-200';
};

export const IdeaJournalTable = ({ ideas }: { ideas: IdeaRow[] }) => {
  const [rows, setRows] = useState(ideas);

  useEffect(() => {
    setRows(ideas);
  }, [ideas]);

  const mutation = useMutation({
    mutationFn: (ideaId: string) => postAction(ideaId),
    onSuccess: ({ action, latencyDays }) => {
      setRows((prev) =>
        prev.map((row) =>
          row.id === action.ideaId
            ? {
                ...row,
                actionDone: true,
                completedAt: action.completedAt,
                latencyDays
              }
            : row
        )
      );
    }
  });

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-surface/70">
      <table className="min-w-full divide-y divide-slate-800 text-sm">
        <thead className="bg-slate-900/60 text-slate-400">
          <tr>
            <th className="px-4 py-3 text-left font-medium">Idea</th>
            <th className="px-4 py-3 text-left font-medium">Created</th>
            <th className="px-4 py-3 text-left font-medium">Macro</th>
            <th className="px-4 py-3 text-left font-medium">Action done?</th>
            <th className="px-4 py-3 text-left font-medium">Completed</th>
            <th className="px-4 py-3 text-left font-medium">Latency</th>
            <th className="px-4 py-3 text-right font-medium">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/80">
          {rows.map((idea) => (
            <tr key={idea.id} className="hover:bg-slate-900/40">
              <td className="px-4 py-3">
                <div className="font-medium text-white">{idea.title}</div>
                {idea.description && <p className="text-xs text-slate-400">{idea.description}</p>}
              </td>
              <td className="px-4 py-3 text-slate-300">
                {formatDistanceToNow(new Date(idea.createdAt), { addSuffix: true })}
              </td>
              <td className="px-4 py-3 text-slate-300">{idea.macroTitle}</td>
              <td className="px-4 py-3 text-slate-300">{idea.actionDone ? 'Yes' : 'Not yet'}</td>
              <td className="px-4 py-3 text-slate-300">
                {idea.completedAt ? formatDistanceToNow(new Date(idea.completedAt), { addSuffix: true }) : '—'}
              </td>
              <td className="px-4 py-3">
                <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${latencyTone(idea.latencyDays)}`}>
                  {idea.latencyDays != null ? `${idea.latencyDays}d` : 'Pending'}
                </span>
              </td>
              <td className="px-4 py-3 text-right">
                {!idea.actionDone && (
                  <button
                    onClick={() => mutation.mutate(idea.id)}
                    className="rounded-full bg-primary/90 px-4 py-2 text-xs font-semibold text-slate-900 shadow hover:bg-emerald-300"
                  >
                    Mark action completed
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

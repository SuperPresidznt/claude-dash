'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const postJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

type MacroGoal = {
  id: string;
  title: string;
};

export const IdeaQuickAdd = ({ macroGoals }: { macroGoals: MacroGoal[] }) => {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [macro, setMacro] = useState('');
  const mutation = useMutation({
    mutationFn: () =>
      postJson('/api/idea', {
        title,
        description: description || undefined,
        linkedMacroGoalId: macro || undefined
      }),
    onSuccess: () => {
      setTitle('');
      setDescription('');
      setMacro('');
      queryClient.invalidateQueries();
    }
  });
  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-800 bg-surface/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title) return;
        mutation.mutate();
      }}
    >
      <div className="flex items-center justify-between text-sm">
        <h3 className="font-semibold text-slate-200">Quick Idea</h3>
        <span className="text-xs text-slate-500">N</span>
      </div>
      <input
        id="new-idea-input"
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="Idea headline"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <textarea
        value={description}
        onChange={(event) => setDescription(event.target.value)}
        placeholder="Optional details"
        rows={2}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <select
        value={macro}
        onChange={(event) => setMacro(event.target.value)}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      >
        <option value="">No macro link</option>
        {macroGoals.map((goal) => (
          <option key={goal.id} value={goal.id}>
            {goal.title}
          </option>
        ))}
      </select>
      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
        disabled={mutation.isLoading || !title}
      >
        Log idea
      </button>
    </form>
  );
};

export const StudyQuickAdd = () => {
  const queryClient = useQueryClient();
  const [topic, setTopic] = useState('');
  const [minutes, setMinutes] = useState(25);
  const mutation = useMutation({
    mutationFn: () => {
      const endAt = new Date();
      const startAt = new Date(endAt.getTime() - minutes * 60000);
      return postJson('/api/study', {
        topic,
        startAt: startAt.toISOString(),
        endAt: endAt.toISOString()
      });
    },
    onSuccess: () => {
      setTopic('');
      queryClient.invalidateQueries();
    }
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-800 bg-surface/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!topic) return;
        mutation.mutate();
      }}
    >
      <div className="text-sm font-semibold text-slate-200">Quick Study</div>
      <input
        value={topic}
        onChange={(event) => setTopic(event.target.value)}
        placeholder="Topic"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <input
        type="number"
        value={minutes}
        onChange={(event) => setMinutes(Math.max(1, Number(event.target.value) || 1))}
        min={1}
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
        disabled={mutation.isLoading || !topic}
      >
        Log study session
      </button>
    </form>
  );
};

export const CashQuickAdd = () => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const mutation = useMutation({
    mutationFn: () => {
      const cents = Math.round(parseFloat(amount || '0') * 100);
      return postJson('/api/cash', {
        cashOnHandCents: cents,
        timestamp: new Date().toISOString(),
        note: note || undefined
      });
    },
    onSuccess: () => {
      setAmount('');
      setNote('');
      queryClient.invalidateQueries();
    }
  });

  return (
    <form
      className="space-y-3 rounded-2xl border border-slate-800 bg-surface/60 p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (amount.trim() === '') return;
        mutation.mutate();
      }}
    >
      <div className="text-sm font-semibold text-slate-200">Cash Snapshot</div>
      <input
        inputMode="decimal"
        value={amount}
        onChange={(event) => setAmount(event.target.value)}
        placeholder="Amount in USD"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <input
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder="Optional note"
        className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        type="submit"
        className="w-full rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
        disabled={mutation.isLoading || !amount}
      >
        Save snapshot
      </button>
    </form>
  );
};

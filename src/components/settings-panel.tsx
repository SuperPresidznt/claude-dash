'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const patchProfile = async (body: any) => {
  const response = await fetch('/api/settings/profile', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to update settings');
  return response.json();
};

const patchMacro = async (id: string, body: any) => {
  const response = await fetch(`/api/macro-goal/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to update macro goal');
  return response.json();
};

type MacroGoal = {
  id: string;
  title: string;
  description: string;
  targetValue?: number;
  targetMetricType: 'count' | 'money' | 'custom';
};

type SettingsPanelProps = {
  user: {
    id: string;
    email: string;
    timezone: string;
    currency: string;
    defaultStartDuration: number;
  };
  macroGoals: MacroGoal[];
};

export const SettingsPanel = ({ user, macroGoals }: SettingsPanelProps) => {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState(user.timezone);
  const [currency, setCurrency] = useState(user.currency);
  const [defaultStart, setDefaultStart] = useState(user.defaultStartDuration.toString());

  const profileMutation = useMutation({
    mutationFn: () =>
      patchProfile({
        timezone,
        currency,
        defaultStartDuration: Number(defaultStart)
      }),
    onSuccess: () => queryClient.invalidateQueries()
  });

  const macroMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: any }) => patchMacro(id, body),
    onSuccess: () => queryClient.invalidateQueries()
  });

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-6">
        <h2 className="text-lg font-semibold text-white">Profile defaults</h2>
        <p className="text-xs text-slate-400">Set timezone, currency, and default start duration.</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Timezone</label>
            <input
              value={timezone}
              onChange={(event) => setTimezone(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Currency</label>
            <input
              value={currency}
              onChange={(event) => setCurrency(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Default start duration (sec)</label>
            <input
              value={defaultStart}
              onChange={(event) => setDefaultStart(event.target.value)}
              type="number"
              min={10}
              max={600}
              className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        </div>
        <button
          onClick={() => profileMutation.mutate()}
          className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
        >
          Save defaults
        </button>
      </section>
      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Macro goals</h2>
        {macroGoals.map((goal) => (
          <div key={goal.id} className="space-y-3 rounded-2xl border border-slate-800 bg-surface/60 p-5">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label className="text-xs uppercase tracking-widest text-slate-500">Title</label>
                <input
                  defaultValue={goal.title}
                  onBlur={(event) =>
                    macroMutation.mutate({ id: goal.id, body: { title: event.target.value } })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
              <div>
                <label className="text-xs uppercase tracking-widest text-slate-500">Target value</label>
                <input
                  defaultValue={goal.targetValue ?? ''}
                  onBlur={(event) =>
                    macroMutation.mutate({
                      id: goal.id,
                      body: {
                        targetValue: event.target.value ? Number(event.target.value) : undefined
                      }
                    })
                  }
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                />
              </div>
            </div>
            <label className="text-xs uppercase tracking-widest text-slate-500">Description</label>
            <textarea
              defaultValue={goal.description}
              onBlur={(event) =>
                macroMutation.mutate({ id: goal.id, body: { description: event.target.value } })
              }
              className="mt-1 h-20 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
          </div>
        ))}
      </section>
    </div>
  );
};

'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts';
import { useEffect, useState } from 'react';

const fetchMetrics = async () => {
  const response = await fetch('/api/metrics/trends');
  if (!response.ok) throw new Error('Failed to load metrics');
  return response.json();
};

const patchMacro = async (id: string, notes: string) => {
  const response = await fetch(`/api/macro-goal/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes })
  });
  if (!response.ok) throw new Error('Failed to update macro goal');
  return response.json();
};

type MetricsDashboardProps = {
  currency: string;
};

export const MetricsDashboard = ({ currency }: MetricsDashboardProps) => {
  const queryClient = useQueryClient();
  const { data } = useQuery({ queryKey: ['metrics', 'trends'], queryFn: fetchMetrics, refetchInterval: 120_000 });
  const macroMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) => patchMacro(id, notes),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['metrics', 'trends'] })
  });

  if (!data) return null;

  const cashFormatter = (value: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(value / 100);

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Starts per day (14d)" subtitle="Keep the bar chart green.">
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.startsPerDay}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => value.slice(5)} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: 12, border: '1px solid #1f2937' }} />
              <Bar dataKey="value" fill="#4ade80" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Study minutes (weekly)" subtitle="Line chart across weeks.">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.studyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => value.slice(5)} />
              <YAxis stroke="#94a3b8" fontSize={12} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: 12, border: '1px solid #1f2937' }} />
              <Line type="monotone" dataKey="minutes" stroke="#60a5fa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ChartCard title="Latency trend" subtitle="Median idea → action latency per week.">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.latencyTrend}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="week" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => value.slice(5)} />
              <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
              <Tooltip contentStyle={{ backgroundColor: '#111827', borderRadius: 12, border: '1px solid #1f2937' }} />
              <Line type="monotone" dataKey="medianLatency" stroke="#f97316" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
        <ChartCard
          title="Cash on hand"
          subtitle={`Sparkline of last ${data.cashSeries.length} snapshots (Δ ${cashFormatter(data.weeklyChange)})`}
        >
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={data.cashSeries}>
              <defs>
                <linearGradient id="cashGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34d399" stopOpacity={0.6} />
                  <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="timestamp" stroke="#94a3b8" fontSize={12} tickFormatter={(value) => value.slice(5, 10)} />
              <YAxis stroke="#94a3b8" fontSize={12} tickFormatter={(value) => (value / 1000).toFixed(0)} />
              <Tooltip formatter={(value: number) => cashFormatter(value)} contentStyle={{ background: '#0f172a', borderRadius: 12 }} />
              <Area type="monotone" dataKey="cash" stroke="#34d399" fill="url(#cashGradient)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
      <section className="rounded-2xl border border-slate-800 bg-surface/70 p-4">
        <h3 className="text-sm font-semibold uppercase tracking-widest text-slate-400">Macro Goals progress</h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          {data.macroGoals.map((goal: any) => (
            <MacroGoalCard
              key={goal.id}
              goal={goal}
              onSave={(notes) => macroMutation.mutate({ id: goal.id, notes })}
            />
          ))}
        </div>
      </section>
    </div>
  );
};

const ChartCard = ({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-surface/70 p-4 shadow-lg shadow-black/30">
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-xs text-slate-400">{subtitle}</p>
      <div className="mt-4 h-56">{children}</div>
    </div>
  );
};

const MacroGoalCard = ({
  goal,
  onSave
}: {
  goal: any;
  onSave: (notes: string) => void;
}) => {
  const [notes, setNotes] = useState(goal.notes ?? '');

  useEffect(() => {
    setNotes(goal.notes ?? '');
  }, [goal.notes]);

  return (
    <div className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4">
      <div>
        <h4 className="font-semibold text-white">{goal.title}</h4>
        {goal.description && <p className="text-xs text-slate-400">{goal.description}</p>}
      </div>
      <p className="text-xs text-slate-400">Target: {goal.targetValue ?? '—'} ({goal.targetMetricType})</p>
      <textarea
        value={notes}
        onChange={(event) => setNotes(event.target.value)}
        placeholder="Progress notes"
        className="h-24 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
      />
      <button
        onClick={() => onSave(notes)}
        className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
      >
        Save notes
      </button>
    </div>
  );
};

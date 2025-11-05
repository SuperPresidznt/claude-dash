'use client';

import { useMutation } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';

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

const patchJson = async (url: string, body: unknown) => {
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

type Experiment = {
  id: string;
  title: string;
  hypothesis: string;
  startDate: string;
  endDate: string | null;
  status: 'planned' | 'running' | 'complete';
  metric: string;
  targetValue: number;
  resultValue: number | null;
  takeaway: string | null;
  decisionTag: string | null;
};

const columns: Array<{
  key: Experiment['status'];
  label: string;
}> = [
  { key: 'planned', label: 'Planned' },
  { key: 'running', label: 'Running' },
  { key: 'complete', label: 'Complete' }
];

export const RoutineExperimentBoard = ({ experiments }: { experiments: Experiment[] }) => {
  const [items, setItems] = useState(experiments);
  const [modal, setModal] = useState<Experiment | null>(null);
  const [resultValue, setResultValue] = useState('');
  const [takeaway, setTakeaway] = useState('');
  const [decisionTag, setDecisionTag] = useState('keep');

  useEffect(() => {
    setItems(experiments);
  }, [experiments]);

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Experiment>) =>
      postJson('/api/experiment', {
        title: payload.title,
        hypothesis: payload.hypothesis,
        startDate: payload.startDate,
        endDate: payload.endDate,
        status: payload.status,
        metric: payload.metric,
        targetValue: payload.targetValue,
        resultValue: payload.resultValue,
        takeaway: payload.takeaway,
        decisionTag: payload.decisionTag
      }),
    onSuccess: (created) => {
      setItems((prev) => [
        {
          ...created,
          startDate: created.startDate,
          endDate: created.endDate
        },
        ...prev
      ]);
    }
  });

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<Experiment> & { id: string }) =>
      patchJson(`/api/experiment/${payload.id}`, payload),
    onSuccess: (updated) => {
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item))
      );
    }
  });

  const grouped = useMemo(() => {
    return columns.map((column) => ({
      column,
      items: items.filter((experiment) => experiment.status === column.key)
    }));
  }, [items]);

  const openModal = (experiment: Experiment) => {
    setModal(experiment);
    setResultValue(experiment.resultValue?.toString() ?? '');
    setTakeaway(experiment.takeaway ?? '');
    setDecisionTag(experiment.decisionTag ?? 'keep');
  };

  return (
    <div className="space-y-6">
      <NewExperimentForm onCreate={(payload) => createMutation.mutate(payload)} />
      <div className="grid gap-4 md:grid-cols-3">
        {grouped.map(({ column, items: columnItems }) => (
          <div key={column.key} className="rounded-2xl border border-slate-800 bg-surface/60 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-400">{column.label}</h3>
            <div className="mt-4 space-y-3">
              {columnItems.length === 0 && <p className="text-xs text-slate-500">No experiments.</p>}
              {columnItems.map((experiment) => (
                <article
                  key={experiment.id}
                  className="space-y-3 rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                >
                  <div>
                    <h4 className="font-semibold text-white">{experiment.title}</h4>
                    <p className="text-xs text-slate-400">{experiment.hypothesis}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 text-xs text-slate-400">
                    <span>Metric: {experiment.metric}</span>
                    <span>Target: {experiment.targetValue}</span>
                    {experiment.resultValue != null && <span>Result: {experiment.resultValue}</span>}
                    <span>Start: {format(new Date(experiment.startDate), 'MMM d')}</span>
                    {experiment.endDate && <span>End: {format(new Date(experiment.endDate), 'MMM d')}</span>}
                  </div>
                  {experiment.status !== 'complete' ? (
                    <div className="flex gap-2 text-xs">
                      {experiment.status === 'planned' && (
                        <button
                          onClick={() =>
                            updateMutation.mutate({ id: experiment.id, status: 'running', startDate: new Date().toISOString() })
                          }
                          className="rounded-full bg-primary/90 px-3 py-1 font-semibold text-slate-900 hover:bg-emerald-300"
                        >
                          Start experiment
                        </button>
                      )}
                      {experiment.status === 'running' && (
                        <button
                          onClick={() => openModal(experiment)}
                          className="rounded-full border border-slate-600 px-3 py-1 font-semibold text-slate-200 hover:border-primary hover:text-white"
                        >
                          End experiment
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-1 text-xs text-slate-400">
                      <p>Takeaway: {experiment.takeaway ?? '—'}</p>
                      <p>Decision: {experiment.decisionTag ?? '—'}</p>
                    </div>
                  )}
                </article>
              ))}
            </div>
          </div>
        ))}
      </div>
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-surface p-6">
            <h2 className="text-lg font-semibold text-white">Wrap experiment</h2>
            <p className="text-sm text-slate-400">Capture the result and takeaway before deciding the next move.</p>
            <input
              value={resultValue}
              onChange={(event) => setResultValue(event.target.value)}
              placeholder="Result value"
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <textarea
              value={takeaway}
              onChange={(event) => setTakeaway(event.target.value)}
              placeholder="Takeaway (required)"
              rows={3}
              className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
            />
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-widest text-slate-500">Decision</label>
              <select
                value={decisionTag}
                onChange={(event) => setDecisionTag(event.target.value)}
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
              >
                <option value="keep">Keep</option>
                <option value="modify">Modify</option>
                <option value="kill">Kill</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 text-sm">
              <button
                onClick={() => setModal(null)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-slate-300 hover:border-slate-500"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  updateMutation.mutate({
                    id: modal.id,
                    status: 'complete',
                    endDate: new Date().toISOString(),
                    resultValue: resultValue ? Number(resultValue) : null,
                    takeaway,
                    decisionTag
                  });
                  setModal(null);
                }}
                className="rounded-lg bg-primary px-4 py-2 font-semibold text-slate-900 hover:bg-emerald-300 disabled:opacity-60"
                disabled={!takeaway}
              >
                Save outcome
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const NewExperimentForm = ({
  onCreate
}: {
  onCreate: (payload: Partial<Experiment>) => void;
}) => {
  const [title, setTitle] = useState('');
  const [hypothesis, setHypothesis] = useState('');
  const [metric, setMetric] = useState('starts_per_day');
  const [target, setTarget] = useState('1');

  return (
    <form
      className="grid gap-3 rounded-2xl border border-slate-800 bg-surface/60 p-4 md:grid-cols-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (!title || !hypothesis) return;
        onCreate({
          title,
          hypothesis,
          metric,
          targetValue: Number(target),
          startDate: new Date().toISOString(),
          status: 'planned'
        });
        setTitle('');
        setHypothesis('');
        setTarget('1');
      }}
    >
      <div className="md:col-span-2">
        <label className="text-xs uppercase tracking-widest text-slate-500">Title</label>
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-slate-500">Metric</label>
        <input
          value={metric}
          onChange={(event) => setMetric(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div>
        <label className="text-xs uppercase tracking-widest text-slate-500">Target</label>
        <input
          value={target}
          onChange={(event) => setTarget(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="md:col-span-3">
        <label className="text-xs uppercase tracking-widest text-slate-500">Hypothesis</label>
        <input
          value={hypothesis}
          onChange={(event) => setHypothesis(event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>
      <div className="flex items-end justify-end">
        <button
          type="submit"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 hover:bg-emerald-300"
        >
          Add experiment
        </button>
      </div>
    </form>
  );
};

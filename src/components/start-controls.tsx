'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { clsx } from 'clsx';
import { useToast } from '@/components/ui/toast-provider';

type MacroGoal = {
  id: string;
  title: string;
};

type CompletionState = {
  id: string;
  durationSec: number;
  note: string;
  linkedEntityType: 'Idea' | 'RoutineExperiment' | 'Study' | 'Other' | '';
  linkedEntityId: string;
};

type StartControlsProps = {
  macroGoals: MacroGoal[];
  defaultDuration: number;
  onStarted?: () => void;
};

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

export const StartControls = ({ macroGoals, defaultDuration, onStarted }: StartControlsProps) => {
  const queryClient = useQueryClient();
  const [microWhy, setMicroWhy] = useState('');
  const [selectedMacroId, setSelectedMacroId] = useState<string>('');
  const [activeStart, setActiveStart] = useState<{ id: string; durationSec: number } | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [completionState, setCompletionState] = useState<CompletionState | null>(null);
  const { showToast } = useToast();

  const createMutation = useMutation({
    mutationFn: ({
      durationSec,
      context,
      macroId
    }: {
      durationSec: number;
      context?: string;
      macroId?: string;
    }) => {
      const payload: Record<string, unknown> = {
        durationSec,
        context
      };
      if (macroId) {
        payload.linkedEntityType = 'Other';
        payload.linkedEntityId = macroId;
      }
      return postJson('/api/start', payload);
    },
    onSuccess: (data, variables) => {
      setActiveStart({ id: data.id, durationSec: variables.durationSec });
      setCompletionState({
        id: data.id,
        durationSec: variables.durationSec,
        note: variables.context ?? '',
        linkedEntityType: variables.macroId ? 'Other' : '',
        linkedEntityId: variables.macroId ?? ''
      });
      setElapsed(0);
      setMicroWhy('');
      setSelectedMacroId('');
      showToast({ description: 'Start logged. Momentum unlocked.', variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['metrics', 'today'] });
      onStarted?.();
    },
    onError: (error: Error) => {
      showToast({
        description: error.message || 'Failed to log start.',
        variant: 'error'
      });
    }
  });

  const updateMutation = useMutation({
    mutationFn: async (state: CompletionState) => {
      return patchJson(`/api/start/${state.id}`, {
        context: state.note || undefined,
        linkedEntityType: state.linkedEntityType || undefined,
        linkedEntityId: state.linkedEntityId || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries();
      showToast({ description: 'Reflection saved.', variant: 'success' });
    },
    onError: (error: Error) => {
      showToast({ description: error.message || 'Failed to save reflection.', variant: 'error' });
    }
  });

  useEffect(() => {
    if (!activeStart) return;
    const startedAt = performance.now();
    const interval = window.setInterval(() => {
      const delta = (performance.now() - startedAt) / 1000;
      setElapsed(Math.min(delta, activeStart.durationSec));
    }, 50);
    return () => window.clearInterval(interval);
  }, [activeStart]);

  useEffect(() => {
    if (activeStart && elapsed >= activeStart.durationSec && completionState) {
      setActiveStart(null);
    }
  }, [activeStart, completionState, elapsed]);

  const progress = useMemo(() => {
    if (!activeStart) return 0;
    return Math.min(1, elapsed / activeStart.durationSec);
  }, [activeStart, elapsed]);

  const handleStart = useCallback(
    (duration: number) => {
      if (createMutation.isPending) return;
      createMutation.mutate({
        durationSec: duration,
        context: microWhy || undefined,
        macroId: selectedMacroId || undefined
      });
    },
    [createMutation, microWhy, selectedMacroId]
  );

  useEffect(() => {
    const handler10 = () => handleStart(10);
    const handler60 = () => handleStart(60);
    const handlerIdea = () => {
      const element = document.querySelector<HTMLInputElement>('#new-idea-input');
      element?.focus();
    };
    window.addEventListener('sig:start-10', handler10);
    window.addEventListener('sig:start-60', handler60);
    window.addEventListener('sig:new-idea', handlerIdea);
    return () => {
      window.removeEventListener('sig:start-10', handler10);
      window.removeEventListener('sig:start-60', handler60);
      window.removeEventListener('sig:new-idea', handlerIdea);
    };
  }, [handleStart]);

  const handleCompletionSubmit = async () => {
    if (!completionState) return;
    await updateMutation.mutateAsync(completionState);
    setCompletionState(null);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2 sm:col-span-2">
          <label className="text-xs uppercase tracking-wider text-slate-400">Micro why</label>
          <input
            value={microWhy}
            onChange={(event) => setMicroWhy(event.target.value)}
            placeholder="Why does this tiny start matter?"
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-4 py-3 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-slate-400">Link to macro goal</label>
          <select
            value={selectedMacroId}
            onChange={(event) => setSelectedMacroId(event.target.value)}
            className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-3 text-sm focus:border-primary focus:outline-none"
          >
            <option value="">Unlinked</option>
            {macroGoals.map((macro) => (
              <option key={macro.id} value={macro.id}>
                {macro.title}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <button
          onClick={() => handleStart(10)}
          className="rounded-full bg-primary px-6 py-3 text-sm font-semibold text-slate-900 shadow-lg transition hover:bg-emerald-300"
        >
          Start 10s (S)
        </button>
        <button
          onClick={() => handleStart(60)}
          className="rounded-full border border-slate-700 px-6 py-3 text-sm font-semibold text-slate-200 transition hover:border-primary hover:text-white"
        >
          Start 1m (M)
        </button>
        <span className="text-xs text-slate-500">Default start: {defaultDuration}s</span>
      </div>
      {activeStart && (
        <div className="relative mx-auto flex h-40 w-40 items-center justify-center">
          <svg className="h-full w-full -rotate-90" viewBox="0 0 100 100">
            <circle
              className="text-slate-800"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
            />
            <circle
              className="text-primary transition-all"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              fill="transparent"
              r="45"
              cx="50"
              cy="50"
              strokeDasharray={2 * Math.PI * 45}
              strokeDashoffset={(1 - progress) * 2 * Math.PI * 45}
            />
          </svg>
          <div className="absolute text-center text-lg font-semibold">
            {Math.max(0, Math.ceil((activeStart.durationSec - elapsed))).toString().padStart(2, '0')}s
          </div>
        </div>
      )}
      {completionState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl bg-surface p-6 shadow-xl">
            <h2 className="text-lg font-semibold">Capture the afterglow</h2>
            <div className="space-y-2">
              <label className="text-xs uppercase tracking-wider text-slate-400">Note</label>
              <input
                value={completionState.note}
                onChange={(event) =>
                  setCompletionState((state) =>
                    state ? { ...state, note: event.target.value } : state
                  )
                }
                className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                placeholder="What shifted?"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Link type</label>
                <select
                  value={completionState.linkedEntityType}
                  onChange={(event) =>
                    setCompletionState((state) =>
                      state
                        ? {
                            ...state,
                            linkedEntityType: event.target.value as CompletionState['linkedEntityType']
                          }
                        : state
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                >
                  <option value="">None</option>
                  <option value="Idea">Idea</option>
                  <option value="RoutineExperiment">Routine Experiment</option>
                  <option value="Study">Study</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase tracking-wider text-slate-400">Linked entity ID</label>
                <input
                  value={completionState.linkedEntityId}
                  onChange={(event) =>
                    setCompletionState((state) =>
                      state ? { ...state, linkedEntityId: event.target.value } : state
                    )
                  }
                  className="w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-primary focus:outline-none"
                  placeholder="Optional reference"
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setCompletionState(null)}
                className="rounded-lg border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:border-slate-500"
              >
                Skip
              </button>
              <button
                onClick={handleCompletionSubmit}
                className={clsx(
                  'rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-slate-900 transition',
                  updateMutation.isPending && 'opacity-70'
                )}
                disabled={updateMutation.isPending}
              >
                Save note
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

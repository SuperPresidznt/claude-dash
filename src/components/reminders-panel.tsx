'use client';

import { useMutation } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

const patchReminder = async (id: string, body: any) => {
  const response = await fetch(`/api/reminder/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error('Failed to update reminder');
  return response.json();
};

const testReminder = async (id: string) => {
  const response = await fetch(`/api/reminder/${id}/test`, { method: 'POST' });
  if (!response.ok) throw new Error('Failed to fire reminder');
  return response.json();
};

type Reminder = {
  id: string;
  title: string;
  schedule: string;
  nextFireAt: string;
  isActive: boolean;
};

export const RemindersPanel = ({ reminders }: { reminders: Reminder[] }) => {
  const [items, setItems] = useState(reminders);

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: any }) => patchReminder(id, patch),
    onSuccess: (data) => {
      setItems((prev) => prev.map((item) => (item.id === data.id ? { ...item, ...data, nextFireAt: data.nextFireAt } : item)));
    }
  });

  const testMutation = useMutation({
    mutationFn: (id: string) => testReminder(id),
    onSuccess: async (data) => {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const title = data.reminder.title ?? 'Structure Is Grace Reminder';
          new Notification(title, {
            body: 'Ready for a 10-second start?',
            tag: data.reminder.id
          });
        }
      }
    }
  });

  return (
    <div className="space-y-4">
      {items.map((reminder) => (
        <div
          key={reminder.id}
          className="flex flex-col gap-3 rounded-2xl border border-slate-800 bg-surface/70 p-4 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <h3 className="font-semibold text-white">{reminder.title}</h3>
            <p className="text-xs text-slate-400">Schedule: {reminder.schedule}</p>
            <p className="text-xs text-slate-500">
              Next cue {formatDistanceToNow(new Date(reminder.nextFireAt), { addSuffix: true })}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 text-xs text-slate-400">
              <input
                type="checkbox"
                checked={reminder.isActive}
                onChange={(event) =>
                  updateMutation.mutate({ id: reminder.id, patch: { isActive: event.target.checked } })
                }
                className="h-4 w-4 rounded border border-slate-600 bg-slate-900"
              />
              Active
            </label>
            <button
              onClick={() => testMutation.mutate(reminder.id)}
              className="rounded-full border border-primary px-4 py-2 text-xs font-semibold text-primary hover:bg-primary/10"
            >
              Test fire
            </button>
            <button
              onClick={() =>
                updateMutation.mutate({
                  id: reminder.id,
                  patch: { nextFireAt: new Date(Date.now() + 60 * 60 * 1000).toISOString() }
                })
              }
              className="rounded-full border border-slate-700 px-3 py-2 text-xs text-slate-300 hover:border-slate-500"
            >
              Snooze +1h
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};

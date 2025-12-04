import { HabitCadence } from '@prisma/client';

export type Habit = {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  cadence: HabitCadence;
  targetCount: number;
  color?: string | null;
  icon?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type HabitWithStats = Habit & {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalCompletions: number;
};

export type HabitCompletion = {
  id: string;
  habitId: string;
  userId: string;
  date: string;
  note?: string | null;
  createdAt: string;
};

export type CreateHabitInput = {
  name: string;
  description?: string;
  cadence?: HabitCadence;
  targetCount?: number;
  color?: string;
  icon?: string;
};

export type UpdateHabitInput = Partial<CreateHabitInput> & {
  isActive?: boolean;
};

export const fetchHabits = async (): Promise<Habit[]> => {
  const response = await fetch('/api/habits', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const createHabit = async (input: CreateHabitInput): Promise<Habit> => {
  const response = await fetch('/api/habits', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const updateHabit = async (id: string, input: UpdateHabitInput): Promise<Habit> => {
  const response = await fetch(`/api/habits/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const deleteHabit = async (id: string): Promise<void> => {
  const response = await fetch(`/api/habits/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
};

export const fetchHabitCompletions = async (habitId: string): Promise<HabitCompletion[]> => {
  const response = await fetch(`/api/habits/${habitId}/completions`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const toggleHabitCompletion = async (habitId: string, date: string): Promise<HabitCompletion | null> => {
  const response = await fetch(`/api/habits/${habitId}/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ date }),
  });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

export const fetchHabitStreak = async (habitId: string): Promise<{ currentStreak: number; longestStreak: number }> => {
  const response = await fetch(`/api/habits/${habitId}/streak`, { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(await response.text());
  }
  return response.json();
};

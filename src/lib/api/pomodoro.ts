import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface PomodoroSession {
  id: string;
  userId: string;
  taskId?: string;
  focusBlockId?: string;
  type: 'work' | 'short_break' | 'long_break';
  durationMinutes: number;
  startTime: string;
  endTime?: string;
  completed: boolean;
  interrupted: boolean;
  note?: string;
  calendarEventId?: string;
  createdAt: string;
  task?: {
    id: string;
    title: string;
  };
  focusBlock?: {
    id: string;
    title: string;
  };
}

export interface CreatePomodoroInput {
  taskId?: string;
  focusBlockId?: string;
  type?: 'work' | 'short_break' | 'long_break';
  durationMinutes?: number;
  startTime: string;
}

export interface CompletePomodoroInput {
  endTime: string;
  completed: boolean;
  interrupted?: boolean;
  note?: string;
}

export function usePomodoroSessions(params?: { date?: string; taskId?: string; focusBlockId?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.date) queryParams.append('date', params.date);
  if (params?.taskId) queryParams.append('taskId', params.taskId);
  if (params?.focusBlockId) queryParams.append('focusBlockId', params.focusBlockId);

  return useQuery<PomodoroSession[]>({
    queryKey: ['pomodoro-sessions', params],
    queryFn: async () => {
      const res = await fetch(`/api/pomodoro?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch pomodoro sessions');
      return res.json();
    },
  });
}

export function usePomodoroSession(id: string) {
  return useQuery<PomodoroSession>({
    queryKey: ['pomodoro-sessions', id],
    queryFn: async () => {
      const res = await fetch(`/api/pomodoro/${id}`);
      if (!res.ok) throw new Error('Failed to fetch pomodoro session');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreatePomodoro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreatePomodoroInput) => {
      const res = await fetch('/api/pomodoro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create pomodoro session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useCompletePomodoro(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CompletePomodoroInput) => {
      const res = await fetch(`/api/pomodoro/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to complete pomodoro session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions', id] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useDeletePomodoro() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/pomodoro/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete pomodoro session');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pomodoro-sessions'] });
    },
  });
}

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface FocusBlock {
  id: string;
  userId: string;
  taskId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  actualStartTime?: string;
  actualEndTime?: string;
  completed: boolean;
  calendarEventId?: string;
  createdAt: string;
  updatedAt: string;
  task?: {
    id: string;
    title: string;
    status: string;
    priority?: string;
  };
  pomodoroSessions?: Array<{
    id: string;
    type: string;
    completed: boolean;
    durationMinutes: number;
  }>;
}

export interface CreateFocusBlockInput {
  taskId?: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
}

export interface UpdateFocusBlockInput {
  taskId?: string | null;
  title?: string;
  description?: string | null;
  startTime?: string;
  endTime?: string;
  actualStartTime?: string | null;
  actualEndTime?: string | null;
  completed?: boolean;
}

export function useFocusBlocks(params?: { date?: string; taskId?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.date) queryParams.append('date', params.date);
  if (params?.taskId) queryParams.append('taskId', params.taskId);

  return useQuery<FocusBlock[]>({
    queryKey: ['focus-blocks', params],
    queryFn: async () => {
      const res = await fetch(`/api/focus-blocks?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch focus blocks');
      return res.json();
    },
  });
}

export function useFocusBlock(id: string) {
  return useQuery<FocusBlock>({
    queryKey: ['focus-blocks', id],
    queryFn: async () => {
      const res = await fetch(`/api/focus-blocks/${id}`);
      if (!res.ok) throw new Error('Failed to fetch focus block');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateFocusBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateFocusBlockInput) => {
      const res = await fetch('/api/focus-blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create focus block');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
    },
  });
}

export function useUpdateFocusBlock(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateFocusBlockInput) => {
      const res = await fetch(`/api/focus-blocks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update focus block');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
      queryClient.invalidateQueries({ queryKey: ['focus-blocks', id] });
    },
  });
}

export function useDeleteFocusBlock() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/focus-blocks/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete focus block');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['focus-blocks'] });
    },
  });
}

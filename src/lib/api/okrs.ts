import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface KeyResult {
  id: string;
  objectiveId: string;
  userId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue: number;
  unit?: string;
  isCompleted: boolean;
  confidenceRating?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Objective {
  id: string;
  userId: string;
  projectId?: string;
  macroGoalId?: string;
  title: string;
  description?: string;
  quarter: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'cancelled';
  confidenceRating?: number;
  createdAt: string;
  updatedAt: string;
  keyResults?: KeyResult[];
  project?: {
    id: string;
    name: string;
    status: string;
  };
  macroGoal?: {
    id: string;
    title: string;
  };
}

export interface CreateObjectiveInput {
  projectId?: string;
  macroGoalId?: string;
  title: string;
  description?: string;
  quarter: string;
  startDate: string;
  endDate: string;
  confidenceRating?: number;
}

export interface UpdateObjectiveInput {
  title?: string;
  description?: string | null;
  status?: 'active' | 'completed' | 'cancelled';
  confidenceRating?: number | null;
  endDate?: string;
}

export interface CreateKeyResultInput {
  objectiveId: string;
  title: string;
  description?: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  confidenceRating?: number;
}

export interface UpdateKeyResultInput {
  title?: string;
  description?: string | null;
  currentValue?: number;
  isCompleted?: boolean;
  confidenceRating?: number | null;
}

export function useObjectives(params?: {
  quarter?: string;
  status?: string;
  projectId?: string;
}) {
  const queryParams = new URLSearchParams();
  if (params?.quarter) queryParams.append('quarter', params.quarter);
  if (params?.status) queryParams.append('status', params.status);
  if (params?.projectId) queryParams.append('projectId', params.projectId);

  return useQuery<Objective[]>({
    queryKey: ['objectives', params],
    queryFn: async () => {
      const res = await fetch(`/api/okrs/objectives?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch objectives');
      return res.json();
    },
  });
}

export function useObjective(id: string) {
  return useQuery<Objective>({
    queryKey: ['objectives', id],
    queryFn: async () => {
      const res = await fetch(`/api/okrs/objectives/${id}`);
      if (!res.ok) throw new Error('Failed to fetch objective');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateObjectiveInput) => {
      const res = await fetch('/api/okrs/objectives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create objective');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useUpdateObjective(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateObjectiveInput) => {
      const res = await fetch(`/api/okrs/objectives/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update objective');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objectives', id] });
    },
  });
}

export function useDeleteObjective() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okrs/objectives/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete objective');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useCreateKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateKeyResultInput) => {
      const res = await fetch('/api/okrs/key-results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create key result');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
      queryClient.invalidateQueries({ queryKey: ['objectives', variables.objectiveId] });
    },
  });
}

export function useUpdateKeyResult(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateKeyResultInput) => {
      const res = await fetch(`/api/okrs/key-results/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update key result');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

export function useDeleteKeyResult() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/okrs/key-results/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete key result');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['objectives'] });
    },
  });
}

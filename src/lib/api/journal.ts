import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface JournalEntry {
  id: string;
  userId: string;
  type: 'reflection' | 'am' | 'pm' | 'custom';
  date: string;
  content: string;
  promptQuestion?: string;
  sentimentScore?: number;
  sentimentLabel?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateJournalEntryInput {
  type?: 'reflection' | 'am' | 'pm' | 'custom';
  date: string;
  content: string;
  promptQuestion?: string;
  tags?: string[];
}

export interface UpdateJournalEntryInput {
  content?: string;
  promptQuestion?: string | null;
  tags?: string[];
}

export function useJournalEntries(params?: {
  type?: string;
  startDate?: string;
  endDate?: string;
  period?: 'week' | 'month';
}) {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);
  if (params?.startDate) queryParams.append('startDate', params.startDate);
  if (params?.endDate) queryParams.append('endDate', params.endDate);
  if (params?.period) queryParams.append('period', params.period);

  return useQuery<JournalEntry[]>({
    queryKey: ['journal-entries', params],
    queryFn: async () => {
      const res = await fetch(`/api/journal?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch journal entries');
      return res.json();
    },
  });
}

export function useJournalEntry(id: string) {
  return useQuery<JournalEntry>({
    queryKey: ['journal-entries', id],
    queryFn: async () => {
      const res = await fetch(`/api/journal/${id}`);
      if (!res.ok) throw new Error('Failed to fetch journal entry');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateJournalEntryInput) => {
      const res = await fetch('/api/journal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create journal entry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useUpdateJournalEntry(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateJournalEntryInput) => {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update journal entry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entries', id] });
      queryClient.invalidateQueries({ queryKey: ['metrics'] });
    },
  });
}

export function useDeleteJournalEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/journal/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete journal entry');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
    },
  });
}

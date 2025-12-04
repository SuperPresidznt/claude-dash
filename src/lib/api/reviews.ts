import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export interface Review {
  id: string;
  userId: string;
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  period: string;
  startDate: string;
  endDate: string;
  financeSummary?: {
    income: number;
    expenses: number;
    netCashflow: number;
    transactionCount: number;
  };
  taskSummary?: {
    completed: number;
    total: number;
    completionRate: number;
  };
  habitSummary?: {
    totalHabits: number;
    completions: number;
    completionRate: number;
  };
  journalSummary?: {
    entryCount: number;
    avgSentiment: number;
    sentimentTrend: string;
  };
  pomodoroSummary?: {
    sessionsCompleted: number;
    totalMinutes: number;
  };
  highlights: string[];
  lowlights: string[];
  actionItems: string[];
  emailSentAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReviewInput {
  type: 'weekly' | 'monthly' | 'quarterly' | 'yearly';
  startDate: string;
  endDate: string;
  highlights?: string[];
  lowlights?: string[];
  actionItems?: string[];
}

export interface UpdateReviewInput {
  highlights?: string[];
  lowlights?: string[];
  actionItems?: string[];
}

export function useReviews(params?: { type?: string }) {
  const queryParams = new URLSearchParams();
  if (params?.type) queryParams.append('type', params.type);

  return useQuery<Review[]>({
    queryKey: ['reviews', params],
    queryFn: async () => {
      const res = await fetch(`/api/reviews?${queryParams.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch reviews');
      return res.json();
    },
  });
}

export function useReview(id: string) {
  return useQuery<Review>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const res = await fetch(`/api/reviews/${id}`);
      if (!res.ok) throw new Error('Failed to fetch review');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateReviewInput) => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to create review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useGenerateReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (type: 'weekly' | 'monthly') => {
      const res = await fetch('/api/reviews/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) throw new Error('Failed to generate review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

export function useUpdateReview(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: UpdateReviewInput) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to update review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
    },
  });
}

export function useDeleteReview() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/reviews/${id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete review');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews'] });
    },
  });
}

'use client';

import { useQuery } from '@tanstack/react-query';
import { MetricCard } from './metric-card';

const fetcher = async () => {
  const response = await fetch('/api/metrics/today');
  if (!response.ok) throw new Error('Failed to load metrics');
  return response.json();
};

type TodayMetricsProps = {
  initialData: {
    starts: number;
    studyMinutes: number;
    cash: number | null;
    currency: string;
  };
};

export const TodayMetrics = ({ initialData }: TodayMetricsProps) => {
  const { data } = useQuery({
    queryKey: ['metrics', 'today'],
    queryFn: fetcher,
    initialData,
    refetchInterval: 60_000
  });

  const formatCash = (value: number | null) => {
    if (value == null) return '—';
    return new Intl.NumberFormat(undefined, { style: 'currency', currency: initialData.currency }).format(value / 100);
  };

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <MetricCard label="Starts today" value={data.starts} helper={data.starts >= 3 ? 'Momentum on.' : 'Micro-starts fuel the day.'} />
      <MetricCard label="Study minutes" value={data.studyMinutes} helper="Daily learning logged" />
      <MetricCard label="Cash on hand" value={formatCash(data.cash)} helper={`Latest snapshot (${initialData.currency})`} />
    </div>
  );
};

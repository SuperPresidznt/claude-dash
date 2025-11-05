import { ReactNode } from 'react';

export const MetricCard = ({
  label,
  value,
  helper
}: {
  label: string;
  value: ReactNode;
  helper?: ReactNode;
}) => {
  return (
    <div className="rounded-2xl border border-slate-800 bg-surface/80 p-5 shadow-lg shadow-black/40">
      <div className="text-xs uppercase tracking-widest text-slate-500">{label}</div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      {helper && <div className="mt-1 text-xs text-slate-400">{helper}</div>}
    </div>
  );
};

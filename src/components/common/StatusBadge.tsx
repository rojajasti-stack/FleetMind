import React from 'react';

interface StatusBadgeProps {
  status: string;
  size?: 'sm' | 'md';
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'md' }) => {
  const s = status.toLowerCase();

  let colorClasses = 'bg-slate-500/10 text-slate-300 border-slate-500/20';

  if (s === 'active' || s === 'completed' || s === 'available' || s === 'paid') {
    colorClasses = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
  } else if (s === 'maintenance' || s === 'in_progress' || s === 'scheduled' || s === 'pending') {
    colorClasses = 'bg-amber-500/10 text-amber-400 border-amber-500/20';
  } else if (s === 'inactive' || s === 'cancelled' || s === 'off_duty' || s === 'overdue' || s === 'delayed') {
    colorClasses = 'bg-rose-500/10 text-rose-400 border-rose-500/20';
  } else if (s === 'on_trip') {
    colorClasses = 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
  }

  const label = status.replace(/_/g, ' ');

  const sizeClasses = size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  return (
    <span className={`inline-flex items-center gap-1.5 font-medium capitalize rounded-lg border ${sizeClasses} ${colorClasses}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
      {label}
    </span>
  );
};

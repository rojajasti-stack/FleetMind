import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  subtext?: string;
  iconColor?: string;
  borderColor?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon: Icon,
  change,
  changeType = 'positive',
  subtext,
  iconColor = 'text-[#00C2FF]',
  borderColor = 'hover:border-[#00C2FF]/30'
}) => {
  return (
    <div className={`bg-[#0F2742] rounded-2xl p-5 border border-white/5 transition-all duration-200 ${borderColor} shadow-lg relative overflow-hidden group`}>
      {/* Background glow element */}
      <div className="absolute -right-6 -bottom-6 w-24 h-24 bg-blue-500/5 rounded-full blur-xl group-hover:bg-[#00C2FF]/10 transition-colors pointer-events-none" />

      <div className="flex items-start justify-between relative z-10">
        <div>
          <p className="text-slate-400 text-xs font-medium tracking-wide uppercase">{label}</p>
          <h3 className="text-2xl font-bold text-white mt-1.5 font-heading tracking-tight">{value}</h3>
          
          {(change || subtext) && (
            <div className="flex items-center gap-2 mt-2.5">
              {change && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex items-center ${
                  changeType === 'positive' 
                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/20' 
                    : changeType === 'negative'
                    ? 'text-rose-400 bg-rose-500/10 border border-rose-500/20'
                    : 'text-slate-400 bg-slate-500/10'
                }`}>
                  {change}
                </span>
              )}
              {subtext && <span className="text-xs text-slate-400">{subtext}</span>}
            </div>
          )}
        </div>

        <div className={`p-3 rounded-xl bg-[#08111F] border border-white/5 ${iconColor} flex items-center justify-center shrink-0 shadow-inner group-hover:scale-105 transition-transform`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
};

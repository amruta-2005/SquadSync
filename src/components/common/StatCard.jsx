import React from 'react';

export default function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  badge,
  className = '',
  iconBg = 'bg-purple-50 text-purple-600',
  onClick
}) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-xl border border-slate-200/90 p-5 shadow-sm hover:border-slate-300 transition-colors ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">{value}</span>
            {badge && <div>{badge}</div>}
          </div>
          {subtext && (
            <p className="mt-1.5 text-xs text-slate-500 flex items-center gap-1">
              {subtext}
            </p>
          )}
        </div>
        {Icon && (
          <div className={`p-2.5 rounded-lg ${iconBg} shrink-0`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, AlertTriangle, ArrowRight, CheckCircle2, ShieldAlert } from 'lucide-react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { getRiskLevelBadge, formatRelativeTime } from '../../utils/formatters';

export default function RecentWarningsList({ warnings = [] }) {
  if (!warnings || warnings.length === 0) {
    return (
      <div className="p-8 text-center bg-emerald-50/50 rounded-xl border border-emerald-100 text-xs text-emerald-800">
        <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
        <p className="font-semibold text-emerald-950">No High-Severity Collaboration Warnings</p>
        <p className="text-emerald-700 mt-1">All pull requests and workload distributions are currently within acceptable team thresholds.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {warnings.map((warn) => {
        const badge = getRiskLevelBadge(warn.level);
        return (
          <div
            key={warn.id}
            className="p-4 rounded-xl border border-slate-200/90 bg-white hover:border-slate-300 transition-colors shadow-xs"
          >
            <div className="flex flex-wrap items-start justify-between gap-2 mb-1.5">
              <div className="flex items-center gap-2">
                <Badge variant={warn.level === 'Critical' ? 'rose' : warn.level === 'High' ? 'red' : 'amber'} size="sm" dot>
                  {warn.category}
                </Badge>
                <span className="text-[11px] text-slate-400">
                  {formatRelativeTime(warn.timestamp)}
                </span>
              </div>
              <Badge variant={warn.level === 'Critical' ? 'rose' : 'red'} size="sm">
                {warn.level} Severity
              </Badge>
            </div>

            <h4 className="text-sm font-semibold text-slate-900 mb-1">
              {warn.title}
            </h4>

            <p className="text-xs text-slate-600 mb-3 leading-relaxed">
              {warn.explanation}
            </p>

            <div className="p-2.5 rounded-lg bg-purple-50/60 border border-purple-100 flex items-start justify-between gap-3 text-xs">
              <div>
                <span className="font-semibold text-purple-950 block mb-0.5">Recommended Action:</span>
                <span className="text-purple-900">{warn.suggested_action}</span>
              </div>
              <Link to="/risks" className="shrink-0">
                <Button size="sm" variant="ghost" className="!px-2 !py-1 text-purple-700 hover:text-purple-900">
                  Inspect <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        );
      })}
    </div>
  );
}

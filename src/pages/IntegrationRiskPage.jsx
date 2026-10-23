import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitMerge,
  AlertTriangle,
  Clock,
  CheckCircle2,
  GitBranch,
  RefreshCw,
  GitPullRequest,
  CheckSquare,
  ShieldAlert,
  ArrowRight,
  HelpCircle,
  FileCode,
  Flame
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import apiService from '../services/api';
import Card from '../components/common/Card';
import StatCard from '../components/common/StatCard';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import { getRiskLevelBadge } from '../utils/formatters';

export default function IntegrationRiskPage() {
  const navigate = useNavigate();
  const { selectedTeam, selectedTeamId } = useApp();
  const [severityFilter, setSeverityFilter] = useState('ALL');

  const {
    data: integrationData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getIntegrationRisks(teamId, forceDemo));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <LoadingSkeleton type="cards" count={4} />
        <LoadingSkeleton type="table" count={3} />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        error={error}
        onRetry={reload}
        actionLabel={error.status === 404 ? 'Configure Repository' : undefined}
        onAction={error.status === 404 ? () => { navigate('/data-sources'); } : undefined}
      />
    );
  }

  const {
    overall_risk_level = 'Low',
    summary = {},
    risks = []
  } = integrationData || {};

  const riskBadge = getRiskLevelBadge(overall_risk_level);

  const filteredRisks = risks.filter((r) => {
    if (severityFilter === 'ALL') return true;
    const sev = (r.severity || r.risk_level || '').toUpperCase();
    return sev === severityFilter;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Integration Risk Radar</h1>
            <Badge variant={overall_risk_level === 'High' ? 'rose' : overall_risk_level === 'Medium' ? 'amber' : 'emerald'} dot>
              {overall_risk_level} Overall Risk
            </Badge>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Detecting branch divergence, unmerged code, and dependency bottlenecks for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Facts vs Risks Distinction Banner */}
      <div className="bg-slate-900 text-white rounded-xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
        <div className="p-2 rounded-lg bg-purple-600/30 text-purple-400 shrink-0 mt-0.5">
          <ShieldAlert className="w-5 h-5" />
        </div>
        <div className="space-y-1">
          <h4 className="text-sm font-semibold text-white">
            Analytical Principle: Facts vs. Possible Risks
          </h4>
          <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
            SquadSync strictly distinguishes <span className="text-emerald-400 font-semibold underline decoration-emerald-500">Measured Facts</span> (concrete branch age, commits behind main, touched files) from <span className="text-amber-400 font-semibold underline decoration-amber-500">Possible Risks</span> (potential merge conflicts, deadline delays, integration failure). This ensures transparent, verifiable mentoring without jumping to speculative conclusions.
          </p>
        </div>
      </div>

      {/* Top 4 Integration Risk Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Open Unmerged PRs"
          value={summary.open_unmerged_prs || 0}
          subtext="Branches pending integration"
          icon={GitPullRequest}
          iconBg="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Long-Running Branches"
          value={summary.long_running_branches || 0}
          subtext={
            summary.long_running_branches > 0 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <Flame className="w-3.5 h-3.5" />
                Active &gt; 7 days without merge
              </span>
            ) : (
              'All branches short-lived'
            )
          }
          icon={GitBranch}
          iconBg="bg-rose-50 text-rose-600"
        />

        <StatCard
          title="PRs Waiting > 48h"
          value={summary.prs_waiting_over_48h || 0}
          subtext="Exceeding review SLA"
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Blocked Dependent Tasks"
          value={summary.blocked_or_overdue_dependent_tasks || 0}
          subtext="Downstream workflow blockers"
          icon={CheckSquare}
          iconBg="bg-blue-50 text-blue-600"
        />
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-900">Active Integration Threats</h2>
          <p className="text-xs text-slate-500">
            Ranked by divergence severity and downstream delivery impact
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Severity:</span>
          {['ALL', 'CRITICAL', 'HIGH', 'MEDIUM'].map((lvl) => (
            <button
              key={lvl}
              onClick={() => setSeverityFilter(lvl)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                severityFilter === lvl
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {lvl === 'ALL' ? 'All Risks' : lvl.charAt(0) + lvl.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Risks List with Explicit Facts vs Risks Breakdown */}
      {filteredRisks.length > 0 ? (
        <div className="space-y-6">
          {filteredRisks.map((risk) => {
            const badge = getRiskLevelBadge(risk.severity);
            return (
              <Card key={risk.id} className="border-slate-200/90 shadow-sm overflow-hidden">
                {/* Risk Title & Meta Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                        {risk.identifier}
                      </span>
                      <Badge variant={risk.severity === 'Critical' ? 'rose' : risk.severity === 'High' ? 'red' : 'amber'} size="sm" dot>
                        {risk.severity} Severity
                      </Badge>
                      <span className="text-xs text-slate-400">• {risk.risk_type}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900">{risk.title}</h3>
                    {risk.author && (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Author / Branch Owner: <span className="font-semibold text-slate-700">{risk.author}</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Facts vs Risks Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-5">
                  {/* Column 1: Measured Facts */}
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-700">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Measured Facts (Git & Board Data)</span>
                    </div>
                    <ul className="space-y-2 text-xs text-slate-700">
                      {risk.measured_facts?.map((fact, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-purple-600 font-bold">•</span>
                          <span>{fact}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Column 2: Possible Risks */}
                  <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-900">
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                      <span>Possible Risks (Threat Evaluation)</span>
                    </div>
                    <ul className="space-y-2 text-xs text-amber-950">
                      {risk.possible_risks?.map((r, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-amber-600 font-bold">•</span>
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Suggested Action Bar */}
                <div className="p-3.5 bg-purple-50/70 border border-purple-200/80 rounded-xl flex items-start gap-3 text-xs text-purple-950">
                  <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-purple-900 block mb-0.5">
                      Suggested Action for Team / Mentors:
                    </span>
                    <span className="text-purple-900/90 leading-relaxed">
                      {risk.suggested_action}
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Active Integration Risks"
          description="Branches are cleanly integrated and no long-divergent pull requests were detected."
          icon={CheckCircle2}
        />
      )}
    </div>
  );
}

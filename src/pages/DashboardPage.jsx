import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  GitPullRequest,
  ShieldAlert,
  GitMerge,
  ArrowRight,
  Clock,
  RefreshCw,
  Info
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import apiService from '../services/api';
import StatCard from '../components/common/StatCard';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import WorkloadChart from '../components/dashboard/WorkloadChart';
import ReviewParticipationChart from '../components/dashboard/ReviewParticipationChart';
import RecentWarningsList from '../components/dashboard/RecentWarningsList';
import { getRiskLevelBadge, formatDateTime } from '../utils/formatters';

export default function DashboardPage() {
  const { selectedTeam, selectedTeamId } = useApp();

  const {
    data: dashboardData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getDashboard(teamId, forceDemo));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
          <div className="h-8 bg-slate-200 rounded w-28 animate-pulse"></div>
        </div>
        <LoadingSkeleton type="cards" count={4} />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <LoadingSkeleton type="chart" />
          <LoadingSkeleton type="chart" />
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  if (!dashboardData || !dashboardData.metrics) {
    return (
      <EmptyState
        title="No Dashboard Metrics"
        description="Connect a repository or import task data to generate collaboration analytics."
        actionLabel="Connect Repository"
        onAction={() => window.location.href = '/data-sources'}
      />
    );
  }

  const { metrics, workload_summary, review_participation_summary, integration_risk_indicators, recent_warnings } = dashboardData;
  const overallRiskBadge = getRiskLevelBadge(dashboardData.overall_risk_level);

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collaboration Dashboard</h1>
            <Badge variant={dashboardData.overall_risk_level === 'High' ? 'rose' : 'emerald'} dot>
              {overallRiskBadge.label}
            </Badge>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring <span className="font-medium text-slate-800">{selectedTeam?.name}</span> • Last updated: {formatDateTime(dashboardData.last_updated)}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
          <Link to="/risks">
            <Button size="sm" variant="primary" icon={ShieldAlert}>
              Inspect All Risks
            </Button>
          </Link>
        </div>
      </div>

      {/* Top 4 Primary Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Team Members"
          value={metrics.total_members}
          subtext="Active contributors tracked"
          icon={Users}
          iconBg="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Tasks Completed / Total"
          value={`${metrics.completed_tasks} / ${metrics.total_tasks}`}
          subtext={
            metrics.overdue_tasks > 0 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {metrics.overdue_tasks} overdue tasks
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All tasks on track</span>
            )
          }
          icon={CheckSquare}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Open Pull Requests"
          value={metrics.open_pull_requests}
          subtext={
            metrics.unreviewed_pull_requests > 0 ? (
              <span className="text-amber-600 font-medium">
                {metrics.unreviewed_pull_requests} unreviewed PRs
              </span>
            ) : (
              'All open PRs reviewed'
            )
          }
          icon={GitPullRequest}
          iconBg="bg-amber-50 text-amber-600"
        />

        <StatCard
          title="Review Coverage"
          value={`${metrics.review_coverage_percent}%`}
          subtext={`Avg wait: ${metrics.average_review_wait_hours}h`}
          badge={
            <Badge variant={metrics.review_coverage_percent < 70 ? 'amber' : 'emerald'} size="sm">
              {metrics.review_coverage_percent < 70 ? 'Needs Attention' : 'Healthy'}
            </Badge>
          }
          icon={GitMerge}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      {/* Integration Risk Indicator Banner Card */}
      {integration_risk_indicators && (
        <div className={`rounded-xl border p-5 ${
          integration_risk_indicators.risk_level === 'High'
            ? 'bg-red-50/50 border-red-200 text-red-900'
            : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                integration_risk_indicators.risk_level === 'High' ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Integration Risk Radar</h3>
                  <Badge variant={integration_risk_indicators.risk_level === 'High' ? 'rose' : 'emerald'} size="sm">
                    {integration_risk_indicators.risk_level} Risk Level
                  </Badge>
                </div>
                <p className="text-xs mt-1 text-slate-700 leading-relaxed">
                  {integration_risk_indicators.top_warning}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600 font-medium">
                  <span>• {integration_risk_indicators.open_unmerged_prs} unmerged PRs</span>
                  <span>• {integration_risk_indicators.stale_prs_over_48h} PRs waiting &gt; 48h</span>
                  <span>• {integration_risk_indicators.long_lived_branches} long-lived branches</span>
                  <span>• {integration_risk_indicators.blocked_tasks} blocked tasks</span>
                </div>
              </div>
            </div>

            <Link to="/integration-risks" className="shrink-0 self-end sm:self-center">
              <Button size="sm" variant={integration_risk_indicators.risk_level === 'High' ? 'danger' : 'secondary'} icon={ArrowRight} iconPosition="right">
                View Risk Breakdown
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Charts Section: Workload & Review Coverage */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Team Workload Distribution"
          subtitle="Story points & assigned tasks comparison across members"
          action={
            <Link to="/workload">
              <Button size="sm" variant="ghost" className="!px-2 text-xs">
                View Table <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          }
        >
          <WorkloadChart data={workload_summary} />
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Calculated from story points and active tasks</span>
            <span className="text-purple-600 font-medium">Commit counts decoupled</span>
          </div>
        </Card>

        <Card
          title="Code Review Participation"
          subtitle="Peer reviews performed vs pull requests authored"
          action={
            <Link to="/reviews">
              <Button size="sm" variant="ghost" className="!px-2 text-xs">
                Inspect PRs <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          }
        >
          <ReviewParticipationChart data={review_participation_summary} />
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Healthy baseline: At least 1 review per PR authored</span>
            <span className="text-emerald-600 font-medium">Target &gt; 80% coverage</span>
          </div>
        </Card>
      </div>

      {/* Actionable Alerts & Recommended Actions */}
      <Card
        title="Collaboration Warnings & Recommended Actions"
        subtitle="Automatic detection of workload imbalance, review delays, and integration divergence"
        action={
          <Link to="/risks">
            <Button size="sm" variant="secondary">
              View All Risk Details
            </Button>
          </Link>
        }
      >
        <RecentWarningsList warnings={recent_warnings} />
      </Card>
    </div>
  );
}

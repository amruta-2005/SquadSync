import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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
  Info,
  Github,
  ExternalLink
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
import OnboardingChecklist from '../components/dashboard/OnboardingChecklist';
import ActivityFeed from '../components/common/ActivityFeed';
import { getRiskLevelBadge, formatDateTime } from '../utils/formatters';

export default function DashboardPage() {
  const { selectedTeam, selectedTeamId, isDemoMode, addToast, refreshTeams } = useApp();
  const navigate = useNavigate();
  const [syncing, setSyncing] = useState(false);

  const {
    data: dashboardData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getDashboard(teamId, forceDemo));

  const handleSyncData = async () => {
    setSyncing(true);
    try {
      const res = await apiService.triggerSync(selectedTeamId, isDemoMode);
      addToast(res.message || 'Data synchronized with GitHub successfully!', 'success');
      await refreshTeams();
      reload();
    } catch (err) {
      addToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setSyncing(false);
    }
  };

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
    return (
      <ErrorState
        error={error}
        onRetry={reload}
        actionLabel={error.status === 404 ? 'Configure Repository' : 'Retry'}
        onAction={() => {
          if (error.status === 404) {
            navigate('/data-sources');
          } else {
            reload();
          }
        }}
      />
    );
  }

  if (!dashboardData || !dashboardData.metrics) {
    return (
      <EmptyState
        title="No Live Repository Connected"
        description="Configure your GitHub repository in Data Sources to start monitoring live collaboration metrics."
        actionLabel="Connect Repository"
        onAction={() => navigate('/data-sources')}
      />
    );
  }

  const { metrics, workload_summary, review_participation_summary, integration_risk_indicators, recent_warnings } = dashboardData;
  const githubContributors = dashboardData.github_contributors || [];
  const githubCollaborators = dashboardData.github_collaborators || [];
  const githubInvitations = dashboardData.github_invitations || [];
  const githubCollaboratorCount = metrics.total_github_collaborators ?? githubCollaborators.length;
  const githubInvitationCount = metrics.total_github_invitations ?? githubInvitations.length;
  const mappedGithubContributors = githubContributors.filter(contributor => contributor.is_mapped).length;
  const githubContributorCount = metrics.total_github_contributors ?? githubContributors.length;
  const repositoryPeopleByLogin = new Map();
  githubContributors.forEach(person => {
    const key = (person.login || '').toLowerCase();
    if (!key) return;
    repositoryPeopleByLogin.set(key, {
      ...person,
      repository_roles: ['Contributor']
    });
  });
  githubCollaborators.forEach(person => {
    const key = (person.login || '').toLowerCase();
    if (!key) return;
    const existing = repositoryPeopleByLogin.get(key);
    repositoryPeopleByLogin.set(key, {
      ...existing,
      ...person,
      avatar_url: person.avatar_url || existing?.avatar_url,
      html_url: person.html_url || existing?.html_url,
      contributions: existing?.contributions,
      repository_roles: [...new Set([...(existing?.repository_roles || []), 'Collaborator'])],
      repository_status: 'collaborator'
    });
  });
  githubInvitations.forEach(invitation => {
    const login = invitation.invitee_login || '';
    const key = login.toLowerCase() || `invitation-${invitation.id}`;
    const existing = repositoryPeopleByLogin.get(key);
    repositoryPeopleByLogin.set(key, {
      ...existing,
      ...invitation,
      login: login || invitation.invitee_email || `Invitation ${invitation.id}`,
      name: invitation.invitee_name || login || invitation.invitee_email,
      avatar_url: invitation.invitee_avatar || existing?.avatar_url || 'https://github.com/identicons/default.png',
      html_url: invitation.invitee_html_url || existing?.html_url,
      repository_roles: [...new Set([...(existing?.repository_roles || []), 'Pending Invitation'])],
      repository_status: 'pending_invitation',
      is_mapped: invitation.is_mapped || existing?.is_mapped
    });
  });
  const repositoryPeople = Array.from(repositoryPeopleByLogin.values());
  const overallRiskBadge = getRiskLevelBadge(dashboardData.overall_risk_level);

  return (
    <div className="space-y-8">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collaboration Dashboard</h1>
            <Badge variant={dashboardData.overall_risk_level === 'High' ? 'rose' : dashboardData.overall_risk_level === 'Medium' ? 'amber' : 'emerald'} dot>
              {overallRiskBadge.label}
            </Badge>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Monitoring <span className="font-medium text-slate-800">{dashboardData.repository || selectedTeam?.name}</span> • Last synced: {dashboardData.last_updated ? formatDateTime(dashboardData.last_updated) : 'Just now'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {dashboardData.repository && dashboardData.repository !== 'No Repository Connected' && (
            <a
              href={`https://github.com/${dashboardData.repository}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-xs"
              title="Open GitHub repository in new tab"
            >
              <Github className="w-3.5 h-3.5 text-slate-700" />
              <span>Open on GitHub</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          )}
          <Button size="sm" variant="secondary" icon={RefreshCw} loading={syncing} onClick={handleSyncData}>
            Sync Data
          </Button>
          <Link to="/risks">
            <Button size="sm" variant="primary" icon={ShieldAlert}>
              Inspect All Risks
            </Button>
          </Link>
        </div>
      </div>

      {/* Onboarding Checklist for New Teams / Incomplete Setup */}
      {dashboardData.onboarding_checklist && !dashboardData.onboarding_checklist.is_complete && (
        <OnboardingChecklist
          checklist={dashboardData.onboarding_checklist}
          onRunAnalysis={handleSyncData}
          isSyncing={syncing}
        />
      )}

      {/* Primary Metric Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="SquadSync Members"
          value={metrics.total_team_members ?? metrics.total_members}
          subtext="Members in this SquadSync team"
          icon={Users}
          iconBg="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="GitHub Contributors"
          value={githubContributorCount}
          subtext={`${mappedGithubContributors} mapped · ${githubCollaboratorCount} collaborators · ${githubInvitationCount} pending invites`}
          icon={Github}
          iconBg="bg-slate-100 text-slate-700"
        />

        <StatCard
          title="Tasks Completed / Total"
          value={metrics.total_tasks > 0 ? `${metrics.completed_tasks} / ${metrics.total_tasks}` : '0 tracked'}
          subtext={
            metrics.total_tasks === 0 ? (
              <span className="text-slate-400">No issues or CSV tasks yet</span>
            ) : metrics.overdue_tasks > 0 ? (
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
          value={metrics.open_pull_requests === 0 && metrics.reviewed_pull_requests === 0 ? 'N/A' : `${metrics.review_coverage_percent}%`}
          subtext={metrics.average_review_wait_hours > 0 ? `Avg wait: ${metrics.average_review_wait_hours}h` : 'No review delays'}
          badge={
            <Badge variant={metrics.review_coverage_percent < 70 ? 'amber' : 'emerald'} size="sm">
              {metrics.review_coverage_percent < 70 ? 'Needs Attention' : 'Healthy'}
            </Badge>
          }
          icon={GitMerge}
          iconBg="bg-emerald-50 text-emerald-600"
        />
      </div>

      <Card
        title={`Repository People (${repositoryPeople.length})`}
        subtitle={`${githubContributorCount} commit contributors · ${githubCollaboratorCount} collaborators · ${githubInvitationCount} pending invitations in ${dashboardData.repository}.`}
        action={
          <Link to="/data-sources">
            <Button size="sm" variant="secondary">
              Map Contributors
            </Button>
          </Link>
        }
      >
        {(dashboardData.github_contributors_warning || dashboardData.github_collaborators_warning || dashboardData.github_invitations_warning) && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
            <Info className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">Some GitHub repository people could not be fetched</span>
              {[dashboardData.github_contributors_warning, dashboardData.github_collaborators_warning, dashboardData.github_invitations_warning]
                .filter(Boolean)
                .map(warning => <span key={warning} className="block">{warning}</span>)}
              <span className="block mt-1">
                GitHub currently attributes repository commits to {githubContributorCount} account(s). Accounts with repository access are a separate list.
              </span>
              <span className="block mt-1 font-medium">
                Manually added repository people are included from the list you provided; GitHub access has not been verified for those entries.
              </span>
              <Link to="/data-sources" className="ml-1 font-semibold underline">
                Check GitHub token permissions and sync again.
              </Link>
            </div>
          </div>
        )}
        {repositoryPeople.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[30rem] overflow-y-auto">
            {repositoryPeople.map(contributor => (
              <div
                key={contributor.login}
                className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <img
                    src={contributor.avatar_url}
                    alt={`${contributor.login} avatar`}
                    className="w-10 h-10 rounded-full bg-slate-100 shrink-0"
                  />
                  <div className="min-w-0">
                    {contributor.html_url ? (
                      <a
                        href={contributor.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-semibold text-slate-900 hover:text-purple-700 truncate block"
                      >
                        {contributor.name && contributor.name !== contributor.login
                          ? contributor.name
                          : `@${contributor.login}`}
                      </a>
                    ) : (
                      <span className="text-sm font-semibold text-slate-900 truncate block">{contributor.login}</span>
                    )}
                    <p className="text-xs text-slate-500">
                      {contributor.repository_roles.join(' · ')}
                      {contributor.contributions != null && ` · ${contributor.contributions} contributions`}
                      {contributor.type && ` · ${contributor.type}`}
                      {contributor.id != null && ` · ID ${contributor.id}`}
                    </p>
                    {contributor.permissions && (
                      <p className="text-xs text-slate-500">
                        Access: {typeof contributor.permissions === 'string'
                          ? contributor.permissions
                          : Object.entries(contributor.permissions)
                            .filter(([, granted]) => granted)
                            .map(([permission]) => permission)
                            .join(', ') || contributor.role_name}
                      </p>
                    )}
                    {contributor.login && contributor.name && contributor.name !== contributor.login && (
                      <p className="text-xs text-slate-500">@{contributor.login}</p>
                    )}
                    {contributor.repository_status === 'pending_invitation' && (
                      <p className="text-xs text-slate-500">
                        {contributor.source === 'user_provided' && 'Manually added · '}
                        {contributor.invitee_email && `${contributor.invitee_email} · `}
                        {contributor.inviter_login && `Invited by @${contributor.inviter_login} · `}
                        {contributor.created_at && `Sent ${formatDateTime(contributor.created_at)}`}
                      </p>
                    )}
                    {contributor.is_mapped && contributor.mapped_member_name && (
                      <p className="text-xs text-slate-500 truncate">
                        Team member: {contributor.mapped_member_name}
                        {contributor.mapped_member_role && ` · ${contributor.mapped_member_role}`}
                      </p>
                    )}
                  </div>
                </div>
                <Badge
                  variant={contributor.repository_status === 'pending_invitation' || contributor.source === 'user_provided' ? 'amber' : contributor.is_mapped ? 'emerald' : 'amber'}
                  size="sm"
                >
                  {contributor.repository_status === 'pending_invitation'
                    ? contributor.source === 'user_provided' ? 'Pending · Manual' : 'Pending Invite'
                    : contributor.source === 'user_provided' && contributor.repository_status === 'contributor' ? 'Manual Contributor'
                    : contributor.source === 'user_provided' ? 'Manual Entry'
                    : contributor.is_mapped ? 'Mapped' : 'Unmapped'}
                </Badge>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-8 text-center text-sm text-slate-500">
            {dashboardData.github_contributors_warning || dashboardData.github_collaborators_warning
              ? 'GitHub currently attributes commits to no accounts, and repository collaborator data is unavailable. Check the GitHub token permissions in Data Sources.'
              : 'No repository contributors or collaborators were found. Sync the repository to fetch its contributor list.'}
          </div>
        )}
      </Card>

      {/* Integration Risk Indicator Banner Card */}
      {integration_risk_indicators && (
        <div className={`rounded-xl border p-5 ${
          integration_risk_indicators.risk_level === 'High'
            ? 'bg-red-50/50 border-red-200 text-red-900'
            : integration_risk_indicators.risk_level === 'Medium'
            ? 'bg-amber-50/50 border-amber-200 text-amber-900'
            : 'bg-emerald-50/50 border-emerald-200 text-emerald-900'
        }`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className={`p-2 rounded-lg shrink-0 ${
                integration_risk_indicators.risk_level === 'High' ? 'bg-red-100 text-red-700' : integration_risk_indicators.risk_level === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
              }`}>
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">Integration Risk Radar</h3>
                  <Badge variant={integration_risk_indicators.risk_level === 'High' ? 'rose' : integration_risk_indicators.risk_level === 'Medium' ? 'amber' : 'emerald'} size="sm">
                    {integration_risk_indicators.risk_level} Risk Level
                  </Badge>
                </div>
                <p className="text-xs mt-1 text-slate-700 leading-relaxed">
                  {integration_risk_indicators.top_warning}
                </p>
                <div className="flex flex-wrap gap-4 mt-2 text-xs text-slate-600 font-medium">
                  <span>• {integration_risk_indicators.open_unmerged_prs} open PRs</span>
                  <span>• {integration_risk_indicators.stale_prs_over_48h} PRs waiting &gt; 48h</span>
                  <span>• {integration_risk_indicators.long_lived_branches} divergent branches</span>
                  <span>• {integration_risk_indicators.blocked_tasks} overdue tasks</span>
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
            <span>Calculated from active pull requests, issues, and story points</span>
            <span className="text-purple-600 font-medium">Commit counts decoupled</span>
          </div>
        </Card>

        <Card
          title="Code Review Participation"
          subtitle="Peer reviews conducted vs pull requests created"
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

      {/* Warnings & Live Activity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card
          title="Collaboration Warnings & Recommended Actions"
          subtitle="Automatic detection of workload imbalance, review delays, and integration divergence"
          action={
            <Link to="/risks">
              <Button size="sm" variant="secondary">
                All Risks
              </Button>
            </Link>
          }
        >
          <RecentWarningsList warnings={recent_warnings} />
        </Card>

        <ActivityFeed teamId={selectedTeamId} limit={6} title="Recent Team & Task Activity" />
      </div>
    </div>
  );
}

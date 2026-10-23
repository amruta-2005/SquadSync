import React, { useState } from 'react';
import {
  GitPullRequest,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Eye,
  FileCode,
  Users,
  ShieldCheck,
  ChevronRight
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
import EvidenceInspectorModal from '../components/reviews/EvidenceInspectorModal';
import { getReviewStatusBadge, formatRelativeTime } from '../utils/formatters';

export default function ReviewsPage() {
  const { selectedTeam, selectedTeamId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedPrForEvidence, setSelectedPrForEvidence] = useState(null);

  const {
    data: reviewsData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getReviews(teamId, forceDemo));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <LoadingSkeleton type="cards" count={4} />
        <LoadingSkeleton type="table" count={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  const {
    total_pull_requests = 0,
    reviewed_pull_requests = 0,
    unreviewed_pull_requests = 0,
    review_coverage_percent = 0,
    average_wait_time_hours = 0,
    member_participation = [],
    pull_requests_requiring_attention = []
  } = reviewsData || {};

  // Filter PRs
  const filteredPrs = pull_requests_requiring_attention.filter((pr) => {
    const matchesSearch =
      pr.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pr.author.toLowerCase().includes(searchTerm.toLowerCase()) ||
      String(pr.number).includes(searchTerm) ||
      pr.branch.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'WARNINGS' && pr.has_warning) ||
      (statusFilter === 'NEEDS_REVIEW' && pr.status === 'Needs Review') ||
      (statusFilter === 'APPROVED' && pr.status === 'Approved');

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Code Review Analysis</h1>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Auditing pull request peer review turnaround & coverage for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Top Review Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Pull Requests"
          value={total_pull_requests}
          subtext="Monitored in current milestone"
          icon={GitPullRequest}
          iconBg="bg-purple-50 text-purple-600"
        />

        <StatCard
          title="Reviewed vs Unreviewed"
          value={`${reviewed_pull_requests} / ${unreviewed_pull_requests}`}
          subtext={
            unreviewed_pull_requests > 0 ? (
              <span className="text-amber-600 font-medium">
                {unreviewed_pull_requests} awaiting peer review
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">100% peer reviewed</span>
            )
          }
          icon={CheckCircle2}
          iconBg="bg-blue-50 text-blue-600"
        />

        <StatCard
          title="Review Coverage"
          value={`${review_coverage_percent}%`}
          subtext="Target benchmark: > 80%"
          badge={
            <Badge variant={review_coverage_percent < 75 ? 'amber' : 'emerald'} size="sm">
              {review_coverage_percent < 75 ? 'Low Coverage' : 'Optimal'}
            </Badge>
          }
          icon={ShieldCheck}
          iconBg="bg-emerald-50 text-emerald-600"
        />

        <StatCard
          title="Average Review Wait"
          value={`${average_wait_time_hours}h`}
          subtext={
            average_wait_time_hours > 48 ? (
              <span className="text-rose-600 font-medium flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                Exceeds 48h SLA
              </span>
            ) : (
              'Prompt feedback turnaround'
            )
          }
          icon={Clock}
          iconBg="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Review Participation Breakdown by Member */}
      <Card
        title="Member Review Participation"
        subtitle="Tracking who reviews code vs who only authors pull requests"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {member_participation.map((m, idx) => (
            <div key={idx} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm text-slate-900">{m.name}</span>
                <span className="text-[11px] font-semibold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                  {m.participation_share}% share
                </span>
              </div>
              <div className="flex justify-between text-xs text-slate-600">
                <span>Reviews done: <strong className="text-slate-900">{m.reviews_done}</strong></span>
                <span>PRs authored: <strong className="text-slate-900">{m.prs_created}</strong></span>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden mt-1">
                <div
                  className="h-full bg-purple-600 rounded-full"
                  style={{ width: `${Math.min(m.participation_share * 1.2, 100)}%` }}
                />
              </div>
              {m.reviews_done === 0 && m.prs_created > 0 && (
                <span className="text-[10px] text-amber-600 font-medium block">
                  Zero reviews conducted this sprint
                </span>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Pull Requests Requiring Attention Section */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pull Requests Requiring Attention</h2>
            <p className="text-xs text-slate-500">
              Inspect open pull requests for bottlenecks, long waiting queues, or unreviewed code changes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">Filter:</span>
            {[
              { id: 'ALL', label: 'All PRs' },
              { id: 'WARNINGS', label: 'Warnings Only' },
              { id: 'NEEDS_REVIEW', label: 'Needs Review' },
              { id: 'APPROVED', label: 'Approved' }
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  statusFilter === f.id
                    ? 'bg-purple-600 text-white shadow-xs'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* PR Table */}
        <Card bodyClassName="!p-0" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5 font-semibold">Pull Request</th>
                  <th className="px-6 py-3.5 font-semibold">Author</th>
                  <th className="px-6 py-3.5 font-semibold text-center">Waiting Time</th>
                  <th className="px-6 py-3.5 font-semibold">Reviewers Assigned</th>
                  <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                  <th className="px-6 py-3.5 font-semibold text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredPrs.length > 0 ? (
                  filteredPrs.map((pr) => {
                    const statusBadge = getReviewStatusBadge(pr.status);
                    return (
                      <tr
                        key={pr.id}
                        className={`hover:bg-slate-50/70 transition-colors ${
                          pr.has_warning ? 'bg-amber-50/20' : ''
                        }`}
                      >
                        {/* PR info */}
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded text-[11px]">
                                #{pr.number}
                              </span>
                              <span className="font-semibold text-slate-900">{pr.title}</span>
                              {pr.has_warning && (
                                <Badge variant="amber" size="sm">
                                  Flagged
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-400 font-mono">
                              {pr.branch} → {pr.target_branch || 'main'}
                            </div>
                          </div>
                        </td>

                        {/* Author */}
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900 block">{pr.author}</span>
                          <span className="text-[11px] text-slate-400 font-mono">@{pr.author_username}</span>
                        </td>

                        {/* Waiting Time */}
                        <td className="px-6 py-4 text-center">
                          <span className={`font-bold block ${pr.waiting_hours > 48 ? 'text-rose-600' : 'text-slate-800'}`}>
                            {pr.waiting_hours} hours
                          </span>
                          <span className="text-[10px] text-slate-400">
                            Created {formatRelativeTime(pr.created_at)}
                          </span>
                        </td>

                        {/* Reviewers */}
                        <td className="px-6 py-4">
                          {pr.reviewers && pr.reviewers.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {pr.reviewers.map((r, i) => (
                                <span key={i} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-mono">
                                  @{r}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-rose-600 text-[11px] font-semibold">Unassigned</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-6 py-4 text-center">
                          <Badge variant={pr.status === 'Approved' ? 'emerald' : 'amber'} size="sm">
                            {pr.status}
                          </Badge>
                        </td>

                        {/* Inspect Evidence Button */}
                        <td className="px-6 py-4 text-right">
                          <Button
                            size="sm"
                            variant={pr.has_warning ? 'outline' : 'secondary'}
                            icon={Eye}
                            onClick={() => setSelectedPrForEvidence(pr)}
                          >
                            Inspect Evidence
                          </Button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-10 text-center text-slate-400">
                      No pull requests match the selected filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      {/* Evidence Inspector Modal */}
      {selectedPrForEvidence && (
        <EvidenceInspectorModal
          pr={selectedPrForEvidence}
          isOpen={!!selectedPrForEvidence}
          onClose={() => setSelectedPrForEvidence(null)}
        />
      )}
    </div>
  );
}

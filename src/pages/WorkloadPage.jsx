import React, { useState } from 'react';
import {
  Users,
  Search,
  Filter,
  AlertCircle,
  HelpCircle,
  RefreshCw,
  GitCommit,
  GitPullRequest,
  CheckCircle2,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import apiService from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import EmptyState from '../components/common/EmptyState';
import WorkloadBarChart from '../components/workload/WorkloadBarChart';
import MemberDetailModal from '../components/workload/MemberDetailModal';
import { getWorkloadStatusBadge, formatRelativeTime } from '../utils/formatters';

export default function WorkloadPage() {
  const { selectedTeam, selectedTeamId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [selectedMember, setSelectedMember] = useState(null);

  const {
    data: workloadData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getWorkload(teamId, forceDemo));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <LoadingSkeleton type="chart" />
        <LoadingSkeleton type="table" count={4} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  const members = workloadData?.members || [];

  // Filter members by search and status
  const filteredMembers = members.filter((m) => {
    const matchesSearch =
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.github_username.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus =
      statusFilter === 'ALL' ||
      m.workload_status.toUpperCase() === statusFilter;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Team Workload Distribution</h1>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Evaluating effort share, story points, and task assignees for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Critical Methodology Callout */}
      <div className="bg-purple-50/70 border border-purple-200/80 rounded-xl p-4 text-xs text-purple-950 flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
        <div>
          <h4 className="font-semibold text-purple-900">Multi-Factor Workload Methodology</h4>
          <p className="mt-1 text-purple-800/90 leading-relaxed">
            SquadSync does <span className="font-bold underline decoration-purple-400">not</span> rely on commit counts alone to determine workload imbalance.
            Workload share is computed by weighting assigned sprint story points, open task complexity, and pull request changes.
            Git activity is provided as supporting context, avoiding vanity commit inflation.
          </p>
        </div>
      </div>

      {/* Bar Chart Section */}
      <Card
        title="Workload Share Comparison"
        subtitle="Comparing estimated workload share, story points, and task throughput across all team members"
      >
        <WorkloadBarChart members={members} />
      </Card>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, role, or GitHub username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          {['ALL', 'OVERBURDENED', 'BALANCED', 'UNDERUTILIZED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                statusFilter === status
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {status === 'ALL' ? 'All Members' : status.charAt(0) + status.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Workload Table */}
      <Card bodyClassName="!p-0" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5 font-semibold">Team Member</th>
                <th className="px-6 py-3.5 font-semibold text-center">Assigned Tasks</th>
                <th className="px-6 py-3.5 font-semibold text-center">Completed</th>
                <th className="px-6 py-3.5 font-semibold text-center">Pending</th>
                <th className="px-6 py-3.5 font-semibold">Workload Share</th>
                <th className="px-6 py-3.5 font-semibold">Recent GitHub Activity</th>
                <th className="px-6 py-3.5 font-semibold text-center">Status</th>
                <th className="px-6 py-3.5 font-semibold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredMembers.length > 0 ? (
                filteredMembers.map((member) => {
                  const statusBadge = getWorkloadStatusBadge(member.workload_status);
                  return (
                    <tr
                      key={member.member_id}
                      onClick={() => setSelectedMember(member)}
                      className="hover:bg-purple-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Member Info */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-sm shrink-0">
                            {member.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                              {member.name}
                            </span>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                              <span>{member.role}</span>
                              <span>•</span>
                              <span className="font-mono text-purple-600">@{member.github_username}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Assigned Tasks */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-bold text-slate-900">{member.assigned_tasks}</span>
                        <span className="text-[11px] text-slate-400 block">({member.story_points} pts)</span>
                      </td>

                      {/* Completed */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-emerald-600">{member.completed_tasks}</span>
                      </td>

                      {/* Pending */}
                      <td className="px-6 py-4 text-center">
                        <span className="font-semibold text-amber-600">{member.pending_tasks}</span>
                      </td>

                      {/* Estimated Workload Share with Progress Bar */}
                      <td className="px-6 py-4">
                        <div className="w-36 space-y-1.5">
                          <div className="flex justify-between items-center text-[11px]">
                            <span className="font-bold text-slate-800">{member.estimated_workload_share}%</span>
                            <span className="text-slate-400">of team</span>
                          </div>
                          <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${
                                member.estimated_workload_share > 35
                                  ? 'bg-rose-500'
                                  : member.estimated_workload_share < 15
                                  ? 'bg-amber-400'
                                  : 'bg-purple-600'
                              }`}
                              style={{ width: `${Math.min(member.estimated_workload_share * 1.5, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Recent GitHub Activity */}
                      <td className="px-6 py-4">
                        {member.github_activity ? (
                          <div className="space-y-1 text-[11px] text-slate-600">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1">
                                <GitCommit className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-800">{member.github_activity.commits_last_14d}</span> commits
                              </span>
                              <span>•</span>
                              <span className="flex items-center gap-1">
                                <GitPullRequest className="w-3 h-3 text-slate-400" />
                                <span className="font-medium text-slate-800">{member.github_activity.prs_opened}</span> PRs
                              </span>
                            </div>
                            <span className="text-slate-400 text-[10px] block">
                              Active {formatRelativeTime(member.github_activity.last_active)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">No activity recorded</span>
                        )}
                      </td>

                      {/* Workload Status */}
                      <td className="px-6 py-4 text-center">
                        <Badge
                          variant={
                            statusBadge.label === 'Overburdened'
                              ? 'rose'
                              : statusBadge.label === 'Underutilized'
                              ? 'amber'
                              : 'emerald'
                          }
                          size="sm"
                          dot
                        >
                          {statusBadge.label}
                        </Badge>
                      </td>

                      {/* Action */}
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedMember(member);
                          }}
                          className="text-purple-600 hover:text-purple-800 font-medium inline-flex items-center gap-1 text-xs"
                        >
                          Inspect <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-slate-400">
                    No members match the current search or filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Member Details Drill-Down Modal */}
      {selectedMember && (
        <MemberDetailModal
          member={selectedMember}
          isOpen={!!selectedMember}
          onClose={() => setSelectedMember(null)}
        />
      )}
    </div>
  );
}

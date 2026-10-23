import React from 'react';
import {
  Github,
  CheckCircle2,
  Clock,
  AlertTriangle,
  GitPullRequest,
  MessageSquare,
  GitCommit,
  Layers
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';
import { getWorkloadStatusBadge, formatRelativeTime } from '../../utils/formatters';

export default function MemberDetailModal({ member, isOpen, onClose }) {
  if (!member) return null;

  const statusBadge = getWorkloadStatusBadge(member.workload_status);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`${member.name} — Workload & Task Details`}
      subtitle={`GitHub: @${member.github_username} • Role: ${member.role}`}
      maxWidth="max-w-3xl"
      footer={
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
      }
    >
      <div className="space-y-6">
        {/* Top Summary Banner */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs text-slate-500 font-medium">Sprint Workload Share</span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-bold text-slate-900">
                {statusBadge.label === 'No Task Data' || statusBadge.label === 'Pending Invitation'
                  ? statusBadge.label === 'Pending Invitation' ? 'Not accepted' : 'No task data'
                  : `${member.estimated_workload_share}%`}
              </span>
              <Badge
                variant={
                  statusBadge.label === 'Overburdened'
                    ? 'rose'
                    : statusBadge.label === 'Underutilized' || statusBadge.label === 'Pending Invitation'
                    ? 'amber'
                    : statusBadge.label === 'No Task Data' ? 'default' : 'emerald'
                }
                size="sm"
                dot
              >
                {statusBadge.label}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {member.story_points} story points across {member.assigned_tasks} tasks
            </p>
          </div>

          {/* GitHub Activity Metrics */}
          {member.github_activity && (
            <div className="flex items-center gap-4 border-l border-slate-200/80 pl-4 text-xs">
              <div>
                <span className="text-slate-400 block">Commits (14d)</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <GitCommit className="w-3.5 h-3.5 text-purple-600" />
                  {member.github_activity.commits_last_14d}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">PRs Opened</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <GitPullRequest className="w-3.5 h-3.5 text-purple-600" />
                  {member.github_activity.prs_opened}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Review Comments</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  {member.github_activity.review_comments_made}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Assigned Tasks Table */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-purple-600" />
              Assigned Tasks ({member.tasks?.length || 0})
            </h4>
            <span className="text-xs text-slate-500">
              {member.completed_tasks} completed • {member.pending_tasks} pending
            </span>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Task ID</th>
                  <th className="px-4 py-2.5 font-medium">Title</th>
                  <th className="px-4 py-2.5 font-medium">Points</th>
                  <th className="px-4 py-2.5 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {member.tasks && member.tasks.length > 0 ? (
                  member.tasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {task.id}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium max-w-xs">
                        {task.title}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 font-semibold rounded">
                          {task.points} pts
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {task.status === 'Completed' ? (
                          <Badge variant="emerald" size="sm" dot>Completed</Badge>
                        ) : task.overdue ? (
                          <Badge variant="rose" size="sm" dot>Overdue</Badge>
                        ) : (
                          <Badge variant="amber" size="sm" dot>In Progress</Badge>
                        )}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                      No specific tasks assigned yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Workload Balancer Advisory */}
        {member.workload_status === 'Overburdened' && (
          <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-rose-900 flex items-start gap-3">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-rose-950">Mentor Recommendation:</p>
              <p className="mt-0.5 text-rose-800 leading-relaxed">
                {member.name} is carrying over 40% of the team's total points. Consider reassigning at least one high-point task to another team member before the next sprint check-in.
              </p>
            </div>
          </div>
        )}

        {member.workload_status === 'Underutilized' && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-xs text-amber-900 flex items-start gap-3">
            <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-950">Capacity Opportunity:</p>
              <p className="mt-0.5 text-amber-800 leading-relaxed">
                {member.name} has available capacity ({member.estimated_workload_share}% share). Allocate pending QA, documentation, or code reviews to balance participation.
              </p>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

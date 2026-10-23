import React from 'react';
import {
  AlertTriangle,
  Clock,
  FileCode,
  CheckCircle2,
  GitPullRequest,
  Users,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import Modal from '../common/Modal';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function EvidenceInspectorModal({ pr, isOpen, onClose }) {
  if (!pr) return null;

  const evidence = pr.evidence || {
    warning_title: 'Pull Request Review Audit',
    why_warning_raised: 'General review status review.',
    supporting_metrics: [
      { label: 'Time In Queue', value: `${pr.waiting_hours || 0} hours` },
      { label: 'Files Modified', value: `${pr.files_changed || 0} files` },
      { label: 'Lines Changed', value: `+${pr.additions || 0} / -${pr.deletions || 0}` }
    ],
    suggested_action: 'Perform a peer review before merging.'
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Review Warning Evidence — PR #${pr.number}`}
      subtitle={`"${pr.title}" authored by ${pr.author} (@${pr.author_username})`}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <span className="text-xs text-slate-500">
            Branch: <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">{pr.branch}</code> → <code className="bg-slate-200/70 px-1 py-0.5 rounded text-slate-700">{pr.target_branch || 'main'}</code>
          </span>
          <Button variant="secondary" onClick={onClose}>
            Close Evidence
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Warning Header Card */}
        <div className={`p-4 rounded-xl border flex items-start gap-3 ${
          pr.has_warning
            ? 'bg-amber-50/70 border-amber-200 text-amber-950'
            : 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
        }`}>
          {pr.has_warning ? (
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          )}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-bold text-sm">{evidence.warning_title}</h4>
              <Badge variant={pr.has_warning ? 'amber' : 'emerald'} size="sm">
                {pr.has_warning ? 'Risk Flagged' : 'Healthy Review'}
              </Badge>
            </div>
            <p className="text-xs text-slate-700 mt-1.5 leading-relaxed">
              {evidence.why_warning_raised}
            </p>
          </div>
        </div>

        {/* Concrete Supporting Metrics */}
        <div>
          <h5 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
            Verifiable Supporting Metrics
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {evidence.supporting_metrics?.map((metric, idx) => (
              <div key={idx} className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
                <span className="text-[11px] text-slate-500 block">{metric.label}</span>
                <span className="text-sm font-bold text-slate-900 mt-0.5 block">{metric.value}</span>
              </div>
            ))}
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 block">Diff Volume</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                <span className="text-emerald-600">+{pr.additions}</span> /{' '}
                <span className="text-rose-600">-{pr.deletions}</span> lines across {pr.files_changed} files
              </span>
            </div>
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5">
              <span className="text-[11px] text-slate-500 block">Assigned Reviewers</span>
              <span className="text-sm font-bold text-slate-900 mt-0.5 block">
                {pr.reviewers && pr.reviewers.length > 0 ? (
                  pr.reviewers.map(r => `@${r}`).join(', ')
                ) : (
                  <span className="text-rose-600 italic">No reviewers assigned!</span>
                )}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Action Box */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 text-xs text-purple-950">
          <div className="flex items-center gap-2 font-bold text-purple-900 mb-1">
            <ArrowRight className="w-4 h-4 text-purple-600" />
            <span>Recommended Next Step:</span>
          </div>
          <p className="text-purple-900/90 leading-relaxed">
            {evidence.suggested_action}
          </p>
        </div>
      </div>
    </Modal>
  );
}

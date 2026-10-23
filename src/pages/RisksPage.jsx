import React, { useState } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Filter,
  Search,
  RefreshCw,
  GitPullRequest,
  CheckSquare,
  ArrowRight,
  HelpCircle,
  FileText
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
import Modal from '../components/common/Modal';
import { getRiskLevelBadge, formatDateTime, formatRelativeTime } from '../utils/formatters';

export default function RisksPage() {
  const { selectedTeam, selectedTeamId } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [severityFilter, setSeverityFilter] = useState('ALL');
  const [activeModalRisk, setActiveModalRisk] = useState(null);

  const {
    data: risksData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getRisks(teamId, forceDemo));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <LoadingSkeleton type="cards" count={3} />
        <LoadingSkeleton type="table" count={3} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  const risks = Array.isArray(risksData) ? risksData : (risksData?.risks || []);

  const filteredRisks = risks.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.explanation.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'ALL' ||
      r.category.toUpperCase().includes(categoryFilter);

    const matchesSeverity =
      severityFilter === 'ALL' ||
      r.risk_level.toUpperCase() === severityFilter;

    return matchesSearch && matchesCategory && matchesSeverity;
  });

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Collaboration Risk Details</h1>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Exhaustive risk ledger with verifiable Git & task board evidence for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" icon={RefreshCw} onClick={reload}>
            Refresh
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card bodyClassName="p-4" className="bg-white">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search risk title, explanation, or ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Category:</span>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Categories</option>
                <option value="WORKLOAD">Workload Imbalance</option>
                <option value="REVIEW">Code Review</option>
                <option value="INTEGRATION">Integration Risk</option>
                <option value="TASK">Task Overdue</option>
              </select>
            </div>

            {/* Severity Filter */}
            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-slate-500 font-medium">Severity:</span>
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="ALL">All Severities</option>
                <option value="CRITICAL">Critical</option>
                <option value="HIGH">High</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
          </div>
        </div>
      </Card>

      {/* Risks Grid */}
      {filteredRisks.length > 0 ? (
        <div className="space-y-4">
          {filteredRisks.map((risk) => {
            const levelBadge = getRiskLevelBadge(risk.risk_level);
            return (
              <div
                key={risk.id}
                className="bg-white rounded-xl border border-slate-200/90 shadow-sm p-6 hover:border-slate-300 transition-colors"
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded">
                      {risk.id}
                    </span>
                    <Badge variant="purple" size="sm">
                      {risk.category}
                    </Badge>
                    <Badge variant={risk.risk_level === 'Critical' ? 'rose' : risk.risk_level === 'High' ? 'red' : 'amber'} size="sm" dot>
                      {risk.risk_level} Risk
                    </Badge>
                  </div>
                  <span className="text-xs text-slate-400">
                    Detected {formatRelativeTime(risk.detection_timestamp)} ({formatDateTime(risk.detection_timestamp)})
                  </span>
                </div>

                {/* Body Content */}
                <div className="my-4">
                  <h3 className="text-base font-bold text-slate-900 mb-1.5">
                    {risk.title}
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mb-4">
                    {risk.explanation}
                  </p>

                  {/* Supporting Metrics Pills */}
                  {risk.supporting_metrics && (
                    <div className="bg-slate-50 border border-slate-200/70 rounded-xl p-3 mb-4">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block mb-2">
                        Supporting Evidence Metrics:
                      </span>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        {Object.entries(risk.supporting_metrics).map(([key, val]) => (
                          <div key={key}>
                            <span className="text-slate-400 text-[11px] block capitalize">
                              {key.replace(/_/g, ' ')}
                            </span>
                            <span className="font-bold text-slate-800">{String(val)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Related Tasks & PRs */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Related Tasks */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-purple-600" />
                        Related Task-Board Items:
                      </span>
                      {risk.related_tasks && risk.related_tasks.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {risk.related_tasks.map((task) => (
                            <span
                              key={task.id}
                              className="inline-flex items-center gap-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-800 px-2 py-0.5 rounded font-medium"
                              title={task.title}
                            >
                              <span className="font-mono">{task.id}</span>
                              <span className="truncate max-w-[150px]">— {task.title}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None linked</span>
                      )}
                    </div>

                    {/* Related Pull Requests */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                        <GitPullRequest className="w-3.5 h-3.5 text-purple-600" />
                        Related Git Pull Requests:
                      </span>
                      {risk.related_prs && risk.related_prs.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {risk.related_prs.map((pr) => (
                            <span
                              key={pr.id || pr.number}
                              className="inline-flex items-center gap-1 text-[11px] bg-purple-50 text-purple-800 px-2 py-0.5 rounded font-medium"
                              title={pr.title}
                            >
                              <span className="font-mono">#{pr.number}</span>
                              <span className="truncate max-w-[150px]">{pr.title}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">None linked</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Suggested Action Bar */}
                <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-start gap-2 text-purple-950 flex-1">
                    <ArrowRight className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-purple-900">Suggested Action: </span>
                      <span className="text-purple-800">{risk.suggested_action}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveModalRisk(risk)}
                  >
                    View Full Evidence
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <EmptyState
          title="No Matching Risks Found"
          description="Adjust your search query or filters to inspect other collaboration categories."
        />
      )}

      {/* Full Evidence Drill-Down Modal */}
      {activeModalRisk && (
        <Modal
          isOpen={!!activeModalRisk}
          onClose={() => setActiveModalRisk(null)}
          title={`Risk Evidence Dossier — ${activeModalRisk.id}`}
          subtitle={activeModalRisk.title}
          maxWidth="max-w-2xl"
          footer={
            <Button variant="secondary" onClick={() => setActiveModalRisk(null)}>
              Close Dossier
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex justify-between items-center">
              <div>
                <span className="text-slate-500 block">Category & Level</span>
                <span className="font-bold text-slate-900 text-sm mt-0.5 block">
                  {activeModalRisk.category} • {activeModalRisk.risk_level}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Detection Timestamp</span>
                <span className="font-mono text-slate-800 mt-0.5 block">
                  {formatDateTime(activeModalRisk.detection_timestamp)}
                </span>
              </div>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Detailed Explanation</h5>
              <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200">
                {activeModalRisk.explanation}
              </p>
            </div>

            <div>
              <h5 className="font-bold text-slate-900 uppercase text-[11px] mb-1">Supporting Metrics</h5>
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                {activeModalRisk.supporting_metrics &&
                  Object.entries(activeModalRisk.supporting_metrics).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-slate-200/50 py-1 last:border-none">
                      <span className="capitalize text-slate-500">{k.replace(/_/g, ' ')}:</span>
                      <span className="font-semibold text-slate-900">{String(v)}</span>
                    </div>
                  ))}
              </div>
            </div>

            <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
              <span className="font-bold text-purple-900 block mb-0.5">Recommended Action:</span>
              <p className="text-purple-800 leading-relaxed">{activeModalRisk.suggested_action}</p>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

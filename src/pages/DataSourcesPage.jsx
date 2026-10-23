import React, { useState } from 'react';
import {
  Database,
  Github,
  Upload,
  FileSpreadsheet,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  FileText,
  Clock,
  ArrowRight,
  Download,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import apiService from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import { formatDateTime } from '../utils/formatters';

export default function DataSourcesPage() {
  const { selectedTeam, selectedTeamId, isDemoMode, addToast } = useApp();

  // GitHub Form state
  const [repoOwner, setRepoOwner] = useState(selectedTeam?.repo_name?.split('/')[0] || 'squadsync-org');
  const [repoName, setRepoName] = useState(selectedTeam?.repo_name?.split('/')[1] || 'devpulse-capstone');
  const [branch, setBranch] = useState('main');
  const [isSavingRepo, setIsSavingRepo] = useState(false);

  // CSV upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const {
    data: syncStatusData,
    loading,
    error,
    isDemo,
    reload
  } = useApi((teamId, forceDemo) => apiService.getSyncStatus(teamId, forceDemo));

  const handleConnectRepo = async (e) => {
    e.preventDefault();
    if (!repoOwner.trim() || !repoName.trim()) {
      addToast('Please provide both repository owner and repository name.', 'warning');
      return;
    }

    setIsSavingRepo(true);
    try {
      const res = await apiService.connectRepository(
        selectedTeamId,
        { repo_owner: repoOwner.trim(), repo_name: repoName.trim(), branch: branch.trim() },
        isDemoMode
      );
      addToast(res.message || 'Repository connected successfully!', 'success');
      reload();
    } catch (err) {
      addToast(`Failed to connect repository: ${err.message}`, 'error');
    } finally {
      setIsSavingRepo(false);
    }
  };

  const handleCsvChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith('.csv')) {
        addToast('Please select a valid .csv file.', 'warning');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleUploadCsv = async () => {
    if (!selectedFile) {
      addToast('Please select a CSV file to upload.', 'warning');
      return;
    }

    setIsUploadingCsv(true);
    try {
      const res = await apiService.importTasksCsv(selectedTeamId, selectedFile, isDemoMode);
      addToast(res.message || `Successfully processed ${selectedFile.name}!`, 'success');
      setSelectedFile(null);
      reload();
    } catch (err) {
      addToast(`CSV upload failed: ${err.message}`, 'error');
    } finally {
      setIsUploadingCsv(false);
    }
  };

  const handleTriggerSync = async () => {
    setIsSyncing(true);
    try {
      const res = await apiService.triggerSync(selectedTeamId, isDemoMode);
      addToast(res.message || 'Analysis refreshed successfully!', 'success');
      reload();
    } catch (err) {
      addToast(`Sync failed: ${err.message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownloadSampleCsv = () => {
    const csvContent =
      "task_id,title,assignee_github_username,story_points,status,due_date\n" +
      "TASK-101,Implement JWT refresh token rotation,alexchen-dev,5,In Progress,2026-10-25\n" +
      "TASK-102,Build responsive team workload dashboard view,mayapatel-ui,5,Completed,2026-10-20\n" +
      "TASK-103,FastAPI endpoint for integration risk calculation,marcus-backend,5,Completed,2026-10-21\n" +
      "TASK-104,Database schema migration for multi-tenancy,alexchen-dev,8,Overdue,2026-10-19\n" +
      "TASK-105,End-to-end Cypress test suite for auth flow,priya-qa,3,Overdue,2026-10-22\n";

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'squadsync_task_board_template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast('Downloaded squadsync_task_board_template.csv', 'info');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-8 bg-slate-200 rounded w-1/4 animate-pulse"></div>
        <LoadingSkeleton type="cards" count={3} />
        <LoadingSkeleton type="table" count={2} />
      </div>
    );
  }

  if (error) {
    return <ErrorState error={error} onRetry={reload} />;
  }

  const {
    repository = `${repoOwner}/${repoName}`,
    default_branch = 'main',
    connection_type = 'Backend-Managed GitHub App',
    last_synced_at,
    status = 'success',
    sync_duration_seconds = 3.5,
    records_processed = {},
    validation_errors = []
  } = syncStatusData || {};

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Data Sources & Synchronization</h1>
            {isDemo && (
              <Badge variant="amber" size="sm">
                Demo Data
              </Badge>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage repository connection, task-board CSV imports, and inspect sync validation logs for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={RefreshCw}
          loading={isSyncing}
          onClick={handleTriggerSync}
        >
          Refresh Analysis Now
        </Button>
      </div>

      {/* Grid: GitHub Connection & CSV Import */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Repository Connection */}
        <Card
          title="GitHub Repository Connection"
          subtitle="Configure repository owner and tracked branches"
        >
          <form onSubmit={handleConnectRepo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repository Owner / Org
                </label>
                <input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="e.g., squadsync-org"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repository Name
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g., devpulse-capstone"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Main Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Crucial Security Notice */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-950 block">Backend-Managed Security:</span>
                <span className="text-purple-800 leading-relaxed">
                  SquadSync uses server-side GitHub App tokens. You are never asked to paste a Personal Access Token into frontend forms or store API keys in browser local storage.
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSavingRepo}
              className="w-full"
            >
              Update Repository Settings
            </Button>
          </form>
        </Card>

        {/* Task Board CSV Import */}
        <Card
          title="Task-Board CSV Import"
          subtitle="Import task points, assignees, and deadlines from Jira, Trello, or Notion"
          action={
            <button
              onClick={handleDownloadSampleCsv}
              className="text-xs text-purple-600 hover:text-purple-800 font-semibold inline-flex items-center gap-1"
            >
              <Download className="w-3.5 h-3.5" />
              Download Template
            </button>
          }
        >
          <div className="space-y-4">
            {/* Drag & Drop Area */}
            <div className="border-2 border-dashed border-slate-200 hover:border-purple-300 rounded-xl p-6 text-center transition-colors bg-slate-50/50">
              <FileSpreadsheet className="w-10 h-10 text-purple-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-800">
                {selectedFile ? selectedFile.name : 'Upload Task Board Export (.csv)'}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Expected columns: <code className="bg-slate-200/80 px-1 py-0.5 rounded text-slate-700">task_id, title, assignee_github_username, story_points, status, due_date</code>
              </p>

              <label className="mt-4 inline-block">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleCsvChange}
                  className="hidden"
                />
                <span className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium text-xs rounded-lg cursor-pointer shadow-xs">
                  Browse CSV File
                </span>
              </label>
            </div>

            {selectedFile && (
              <div className="flex items-center justify-between p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  Ready to process {selectedFile.name} ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
                <button
                  onClick={() => setSelectedFile(null)}
                  className="text-emerald-700 hover:text-emerald-900 underline text-[11px]"
                >
                  Clear
                </button>
              </div>
            )}

            <Button
              onClick={handleUploadCsv}
              disabled={!selectedFile}
              loading={isUploadingCsv}
              variant="primary"
              className="w-full"
            >
              Upload & Process Tasks
            </Button>
          </div>
        </Card>
      </div>

      {/* Sync Status & Metrics Card */}
      <Card
        title="Latest Synchronization Status"
        subtitle="Last background audit job results"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Job Status</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={status === 'success' ? 'emerald' : 'rose'} size="sm" dot>
                {status.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500">in {sync_duration_seconds}s</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Last Synced</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {formatDateTime(last_synced_at)}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">GitHub Records</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {records_processed.commits || 0} commits • {records_processed.pull_requests || 0} PRs
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Task Board Records</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {records_processed.tasks_imported || 0} tasks mapped
            </span>
          </div>
        </div>

        {/* Validation Errors & Diagnostics Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Data Validation Warnings & Mappings ({validation_errors.length})
            </h4>
            <span className="text-xs text-slate-400">
              Automatic normalization applied
            </span>
          </div>

          {validation_errors.length > 0 ? (
            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-2.5 font-medium">Severity</th>
                    <th className="px-4 py-2.5 font-medium">Field</th>
                    <th className="px-4 py-2.5 font-medium">Item</th>
                    <th className="px-4 py-2.5 font-medium">Description</th>
                    <th className="px-4 py-2.5 font-medium">System Remedy</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {validation_errors.map((err) => (
                    <tr key={err.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <Badge variant={err.severity === 'warning' ? 'amber' : 'blue'} size="sm">
                          {err.severity}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono font-medium text-slate-700">
                        {err.field}
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {err.item}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {err.message}
                      </td>
                      <td className="px-4 py-3 text-purple-700 font-medium">
                        {err.remedy}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              All GitHub handles and task board IDs were cleanly mapped without errors.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

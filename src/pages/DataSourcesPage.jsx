import React, { useState, useEffect } from 'react';
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
  AlertCircle,
  Key,
  Eye,
  EyeOff,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useApi } from '../hooks/useApi';
import apiService from '../services/api';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import ErrorState from '../components/common/ErrorState';
import ContributorMappingCard from '../components/team/ContributorMappingCard';
import { formatDateTime } from '../utils/formatters';

export default function DataSourcesPage() {
  const { selectedTeam, selectedTeamId, isDemoMode, addToast, refreshTeams } = useApp();

  // GitHub Form state
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [branch, setBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [isSavingRepo, setIsSavingRepo] = useState(false);
  const [hasTokenOnServer, setHasTokenOnServer] = useState(false);

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

  // Initialize repo input fields from current team or repo-info
  useEffect(() => {
    async function loadCurrentRepo() {
      try {
        const info = await apiService.getRepoInfo(selectedTeamId, isDemoMode);
        if (info && info.data) {
          setRepoOwner(info.data.repo_owner || '');
          setRepoName(info.data.repo_name || '');
          setBranch(info.data.default_branch || 'main');
          setHasTokenOnServer(!!info.data.has_token);
        } else if (selectedTeam?.repo_name) {
          const parts = selectedTeam.repo_name.split('/');
          if (parts.length === 2) {
            setRepoOwner(parts[0]);
            setRepoName(parts[1]);
          }
        }
      } catch {
        // use defaults
      }
    }
    loadCurrentRepo();
  }, [selectedTeamId, selectedTeam?.repo_name, isDemoMode]);

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
        {
          repo_owner: repoOwner.trim(),
          repo_name: repoName.trim(),
          branch: branch.trim() || 'main',
          github_token: githubToken.trim() || null
        },
        isDemoMode
      );
      addToast(res.message || 'Repository connected successfully!', 'success');
      if (githubToken.trim()) {
        setHasTokenOnServer(true);
        setGithubToken('');
      }
      await refreshTeams();
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
      await refreshTeams();
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
      "TASK-101,Implement JWT refresh token rotation,octocat,5,In Progress,2026-10-25\n" +
      "TASK-102,Build responsive team workload dashboard view,octocat,5,Completed,2026-10-20\n" +
      "TASK-103,FastAPI endpoint for integration risk calculation,octocat,5,Completed,2026-10-21\n" +
      "TASK-104,Database schema migration for multi-tenancy,octocat,8,Overdue,2026-10-19\n";

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
    connection_type = 'GitHub REST API (Secure Backend)',
    last_synced_at,
    status = 'not_configured',
    sync_duration_seconds = 2.1,
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
            Connect your real GitHub repository, manage task-board CSV imports, and inspect sync logs for <span className="font-semibold text-slate-800">{selectedTeam?.name}</span>
          </p>
        </div>

        <Button
          size="sm"
          variant="primary"
          icon={RefreshCw}
          loading={isSyncing}
          onClick={handleTriggerSync}
        >
          Sync Data Now
        </Button>
      </div>

      {/* Grid: GitHub Connection & CSV Import */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* GitHub Repository Connection */}
        <Card
          title="GitHub Repository Connection"
          subtitle="Configure repository owner, name, and optional token"
          headerAction={
            repoOwner && repoName ? (
              <a
                href={`https://github.com/${repoOwner}/${repoName}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition-colors shadow-2xs"
                title="Open repository in new tab"
              >
                <Github className="w-3.5 h-3.5 text-slate-700" />
                <span>Open on GitHub</span>
                <ExternalLink className="w-3 h-3 text-slate-400" />
              </a>
            ) : null
          }
        >
          <form onSubmit={handleConnectRepo} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repository Owner / Org <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={repoOwner}
                  onChange={(e) => setRepoOwner(e.target.value)}
                  placeholder="e.g., octocat or amruta-2005"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Repository Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={repoName}
                  onChange={(e) => setRepoName(e.target.value)}
                  placeholder="e.g., Hello-World or SquadSync"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Target Default Branch
              </label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                placeholder="main"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            {/* Optional Personal Access Token */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-slate-500" />
                  GitHub Personal Access Token (Recommended if rate-limited)
                </label>
                {hasTokenOnServer && (
                  <Badge variant="emerald" size="sm">
                    Token Saved On Server
                  </Badge>
                )}
              </div>
              <div className="relative">
                <input
                  type={showToken ? 'text' : 'password'}
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder={hasTokenOnServer ? '•••••••••••••••••••••••• (Leave blank to keep current)' : 'ghp_... (Optional for public repositories)'}
                  className="w-full px-3 py-2 pr-10 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowToken(!showToken)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Public repositories can be read without a token, but GitHub limits unauthenticated requests to 60 per hour. A token restores API access; listing collaborators also requires your GitHub account to have write, maintain, or admin access. Classic tokens need <code className="bg-slate-100 px-1 py-0.5 rounded">repo</code> and <code className="bg-slate-100 px-1 py-0.5 rounded">read:org</code> scopes. Fine-grained tokens must grant the permissions GitHub reports for collaborator listing. Tokens are stored only on the backend.
              </p>
            </div>

            {/* Security Notice */}
            <div className="bg-purple-50/70 border border-purple-200 rounded-lg p-3 text-xs text-purple-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-purple-950 block">Server-Side Security:</span>
                <span className="text-purple-800 leading-relaxed">
                  Your credentials are never stored in browser storage (localStorage/cookies) and are never exposed in API responses or git commits.
                </span>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              loading={isSavingRepo}
              className="w-full"
            >
              Validate & Save Repository
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

      {/* Team Members & Contributor Mapping */}
      <ContributorMappingCard teamId={selectedTeamId} onDataChanged={reload} />

      {/* Sync Status & Metrics Card */}
      <Card
        title="Latest Synchronization Status"
        subtitle="Last background audit job results"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-6 border-b border-slate-100">
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Connection Status</span>
            <div className="mt-1 flex items-center gap-2">
              <Badge variant={status === 'success' ? 'emerald' : status === 'configured' ? 'blue' : 'rose'} size="sm" dot>
                {status.toUpperCase()}
              </Badge>
              <span className="text-xs text-slate-500">in {sync_duration_seconds}s</span>
            </div>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Last Synced</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {last_synced_at ? formatDateTime(last_synced_at) : 'Never synced'}
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Repository Contributors</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {records_processed?.github_contributors ?? 0} commit contributors · {records_processed?.github_collaborators ?? 0} collaborators · {records_processed?.github_invitations ?? 0} pending invites
            </span>
            <span className="text-[10px] text-slate-500 mt-1 block">
              {records_processed?.team_members ?? records_processed?.members ?? 0} SquadSync team members · {records_processed?.pull_requests || 0} PRs
            </span>
          </div>

          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200/70">
            <span className="text-[11px] text-slate-500 block">Tasks Mapped</span>
            <span className="text-xs font-bold text-slate-900 mt-1 block">
              {records_processed?.tasks || 0} issues/tasks tracked
            </span>
          </div>
        </div>

        {/* Validation Errors & Diagnostics Table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              Diagnostics & Status ({validation_errors?.length || 0})
            </h4>
          </div>

          {(validation_errors && validation_errors.length > 0) ? (
            <div className="space-y-2">
              {validation_errors.map((item, idx) => (
                <div key={idx} className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <span>{typeof item === 'string' ? item : item.message || JSON.stringify(item)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-6 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
              <CheckCircle2 className="w-5 h-5 text-emerald-500 mx-auto mb-1" />
              Repository is connected and data synchronized without errors.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

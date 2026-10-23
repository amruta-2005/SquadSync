import React from 'react';
import {
  Sliders,
  BookOpen,
  Database,
  HelpCircle,
  AlertTriangle,
  ShieldCheck,
  CheckCircle2,
  Clock,
  GitBranch,
  Users,
  Info,
  Server
} from 'lucide-react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import { useApp } from '../context/AppContext';

export default function SettingsDocsPage() {
  const { backendStatus, apiBaseUrl, isDemoMode, setIsDemoMode, checkBackendHealth } = useApp();

  const thresholds = [
    {
      metric: 'Workload Imbalance Threshold',
      value: '> 30.0% of total story points',
      description: 'Flags when a single team member carries nearly a third of all team effort.',
      level: 'High Risk'
    },
    {
      metric: 'Code Review Wait Time SLA',
      value: '> 48 hours without review',
      description: 'Flags pull requests awaiting peer review for more than two calendar days.',
      level: 'High Risk'
    },
    {
      metric: 'Branch Lifespan Threshold',
      value: '> 7 days without merging to main',
      description: 'Flags feature branches that have diverged without incremental integration.',
      level: 'Critical Risk'
    },
    {
      metric: 'Minimum Peer Review Requirement',
      value: '1 non-author approval',
      description: 'Flags PRs merged without external validation or self-approved code.',
      level: 'Medium Risk'
    }
  ];

  const metricDefinitions = [
    {
      term: 'Workload Share (%)',
      definition: 'The proportion of sprint story points and active task assignments held by a team member. Commit volume is deliberately decoupled to avoid artificial commit-bloating incentives.'
    },
    {
      term: 'Review Coverage (%)',
      definition: 'The percentage of pull requests that have received at least one substantive peer review comment or approval from a non-author team member before merging.'
    },
    {
      term: 'Review Latency (Hours)',
      definition: 'The elapsed time in hours between the creation of a pull request and the first recorded peer review action or comment.'
    },
    {
      term: 'Branch Divergence Index',
      definition: 'Measured as the number of commits a branch is behind the main target branch combined with total branch lifespan in days.'
    },
    {
      term: 'Integration Risk Level',
      definition: 'Composite evaluation of open unmerged branches, long-divergent code, and overdue milestone tasks that block downstream team deliverables.'
    }
  ];

  const limitations = [
    'Commit count is not a proxy for code quality or intellectual effort.',
    'Tasks without assigned story points default to 1 point baseline estimation.',
    'Pull requests without linked task numbers in the title/branch cannot be automatically correlated with task board cards.',
    'Backend GitHub App authorization is required to poll private organization repositories.',
    'Student contributors must use matching GitHub usernames or configure email aliases for proper attribution.'
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Settings & Documentation</h1>
        <p className="text-xs text-slate-500 mt-1">
          Analysis thresholds, backend connectivity status, metric definitions, and academic data limitations
        </p>
      </div>

      {/* Backend & Data Source Status Card */}
      <Card
        title="Backend Connectivity & Data Source Status"
        subtitle="Current status of the FastAPI analytics engine and integration pipelines"
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 block">FastAPI Backend Status</span>
            <div className="flex items-center gap-2 mt-1">
              <Badge variant={backendStatus === 'online' ? 'emerald' : 'amber'} dot>
                {backendStatus === 'online' ? 'Online' : 'Offline / Demo Mode'}
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono mt-1 truncate">
              {apiBaseUrl}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 block">GitHub Sync Strategy</span>
            <span className="font-semibold text-slate-800 text-xs mt-1 block">
              Backend-Managed GitHub App
            </span>
            <p className="text-[10px] text-slate-400">
              No personal access tokens stored in browser
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
            <span className="text-[11px] text-slate-500 block">Task Board Ingestion</span>
            <span className="font-semibold text-slate-800 text-xs mt-1 block">
              CSV Parser & Normalizer
            </span>
            <p className="text-[10px] text-slate-400">
              Supports Jira, Trello, and custom CSVs
            </p>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
          <span className="text-slate-500">
            Need to test API connectivity or toggle demo mode?
          </span>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={checkBackendHealth}>
              Ping /health
            </Button>
            <Button
              size="sm"
              variant={isDemoMode ? 'outline' : 'primary'}
              onClick={() => setIsDemoMode(!isDemoMode)}
            >
              {isDemoMode ? 'Switch to Live Mode' : 'Switch to Demo Mode'}
            </Button>
          </div>
        </div>
      </Card>

      {/* Analysis Thresholds Card */}
      <Card
        title="Active Analysis Thresholds"
        subtitle="Configured risk triggers applied during background synchronization"
      >
        <div className="border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
              <tr>
                <th className="px-5 py-3 font-semibold">Metric</th>
                <th className="px-5 py-3 font-semibold">Configured Threshold</th>
                <th className="px-5 py-3 font-semibold">Triggered Severity</th>
                <th className="px-5 py-3 font-semibold">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {thresholds.map((t, idx) => (
                <tr key={idx} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{t.metric}</td>
                  <td className="px-5 py-3.5 font-mono text-purple-700 font-medium">{t.value}</td>
                  <td className="px-5 py-3.5">
                    <Badge variant={t.level.includes('Critical') ? 'rose' : t.level.includes('High') ? 'red' : 'amber'} size="sm">
                      {t.level}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{t.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-[11px] text-slate-400 mt-2">
          Note: Analysis thresholds reflect the backend configuration and evaluation rules.
        </p>
      </Card>

      {/* Project Explanation & Motivation */}
      <Card
        title="Project Motivation & Collaboration Philosophy"
        subtitle="Addressing the unique collaboration challenges of student software teams"
      >
        <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
          <p>
            In university computer science courses, senior capstones, and hackathons, software development teams frequently encounter hidden collaboration breakdown:
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <h5 className="font-bold text-purple-950 mb-1">Workload Silos & Free-Riding</h5>
              <p className="text-purple-900/90 text-[11px]">
                One or two students quietly perform 60-80% of all programming while others contribute superficial text edits or struggle silently without support.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <h5 className="font-bold text-purple-950 mb-1">Neglected Code Reviews</h5>
              <p className="text-purple-900/90 text-[11px]">
                Pull requests linger for days without peer review until someone performs a forced, unreviewed merge hours before submission, introducing bugs.
              </p>
            </div>
            <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-100">
              <h5 className="font-bold text-purple-950 mb-1">Catastrophic Branch Divergence</h5>
              <p className="text-purple-900/90 text-[11px]">
                Long-running feature branches diverge for weeks without intermediate rebasing, culminating in high-risk merge conflicts right before project presentations.
              </p>
            </div>
          </div>
          <p>
            <strong>SquadSync</strong> provides continuous automated observability so student developers and mentors can spot these risks while there is still time to adjust assignments, schedule pairing sessions, and ensure equitable learning outcomes.
          </p>
        </div>
      </Card>

      {/* Metric Definitions */}
      <Card
        title="Metric Definitions"
        subtitle="Formal explanations of all measured indicators"
      >
        <dl className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {metricDefinitions.map((item, idx) => (
            <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <dt className="font-bold text-slate-900">{item.term}</dt>
              <dd className="mt-1 text-slate-600 leading-relaxed">{item.definition}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {/* Data Limitations & Academic Integrity */}
      <Card
        title="Data Limitations & Transparency"
        subtitle="What SquadSync can and cannot determine from raw Git and task data"
      >
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span>Methodological Boundaries:</span>
          </div>
          <ul className="space-y-1.5 list-disc pl-5 text-amber-900/90 leading-relaxed">
            {limitations.map((lim, i) => (
              <li key={i}>{lim}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import {
  Layers,
  ArrowRight,
  Github,
  Users,
  GitPullRequest,
  GitMerge,
  ShieldCheck,
  AlertTriangle,
  Clock,
  CheckCircle2,
  TrendingUp,
  FileSpreadsheet,
  HelpCircle,
  ExternalLink
} from 'lucide-react';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';

export default function LandingPage() {
  const features = [
    {
      icon: Users,
      title: 'Workload Imbalance Detection',
      description:
        'Calculates real contribution shares combining story points, assigned task weights, and PR scope. Avoids misleading vanity commit counts to spot free-riding or overburdened team members early.',
      tag: 'Workload Balance'
    },
    {
      icon: GitPullRequest,
      title: 'Review Participation & Coverage',
      description:
        'Identifies unreviewed pull requests, tracks turnaround wait times, and flags non-participating reviewers before code is merged without peer validation.',
      tag: 'Code Quality'
    },
    {
      icon: GitMerge,
      title: 'Integration Risk Radar',
      description:
        'Surfaces long-lived divergent branches, commits behind main, and overdue tasks that block downstream team deliverables before submission night merge chaos.',
      tag: 'Merge Safety'
    },
    {
      icon: ShieldCheck,
      title: 'Evidence-Based Insights',
      description:
        'Every warning links directly to verifiable Git and task-board evidence — exact waiting hours, modified files, commit deltas, and concrete suggested actions.',
      tag: 'Transparent Audit'
    }
  ];

  const problemVsSolution = [
    {
      problem: 'One student secretly finishes 50% of the project alone while other team members fall behind.',
      solution: 'SquadSync flags high workload standard deviation and alerts mentors to reallocate pending tasks before sprint end.'
    },
    {
      problem: 'Pull requests sit unattended for 5+ days, until someone merges without review right before demo.',
      solution: 'Continuous review coverage monitoring with automated wait-time alerts and reviewer rotation suggestions.'
    },
    {
      problem: 'Feature branches diverge for 2+ weeks, culminating in catastrophic merge conflicts hours before presentation.',
      solution: 'Integration risk scoring based on branch age, commits behind main, and affected downstream tasks.'
    }
  ];

  return (
    <div className="space-y-16 py-4">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto pt-6 pb-4">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold uppercase tracking-wider mb-6">
          <Layers className="w-3.5 h-3.5" />
          <span>Student Software Collaboration Intelligence</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight sm:leading-none">
          Spotting Workload Imbalance & Integration Risk from{' '}
          <span className="text-purple-600">Git and Task Data</span>
        </h1>

        <p className="mt-6 text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
          SquadSync helps student development teams, capstone mentors, and course instructors
          discover collaboration bottlenecks, neglected code reviews, and delayed integration before submission day.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg" variant="primary" icon={ArrowRight} iconPosition="right">
              Open Dashboard
            </Button>
          </Link>
          <Link to="/data-sources">
            <Button size="lg" variant="secondary" icon={Github}>
              Connect GitHub Repository
            </Button>
          </Link>
        </div>

        <div className="mt-6 flex items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            FastAPI Backend Ready
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            GitHub App Integration
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            CSV Task Board Import
          </span>
        </div>
      </section>

      {/* Live Preview Card / Metric Banner */}
      <section className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-6 sm:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">Live Team Health Sample</h2>
              <Badge variant="purple" size="sm">Senior Capstone Demo</Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active repository: <code className="bg-slate-100 px-1 py-0.5 rounded text-purple-700">squadsync-org/devpulse-capstone</code>
            </p>
          </div>
          <Link to="/dashboard">
            <Button size="sm" variant="outline" icon={ExternalLink} iconPosition="right">
              Explore Live Metrics
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
            <p className="text-xs text-slate-500 font-medium">Workload Imbalance</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">44.8% Max</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Alex Chen holds 11 of 28 tasks</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
            <p className="text-xs text-slate-500 font-medium">Review Coverage</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">50.0%</p>
            <p className="text-[11px] text-slate-500 mt-0.5">3 PRs waiting &gt; 48 hours</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
            <p className="text-xs text-slate-500 font-medium">Branch Divergence</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">16 Days</p>
            <p className="text-[11px] text-slate-500 mt-0.5">feature/auth-redesign (28 behind)</p>
          </div>
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/70">
            <p className="text-xs text-slate-500 font-medium">Overall Team Risk</p>
            <p className="text-2xl font-bold text-rose-600 mt-1">High Risk</p>
            <p className="text-[11px] text-slate-500 mt-0.5">Action needed before Sprint 3</p>
          </div>
        </div>
      </section>

      {/* Core Features Grid */}
      <section className="max-w-5xl mx-auto space-y-8">
        <div className="text-center max-w-2xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Comprehensive Collaboration Radar
          </h2>
          <p className="text-sm text-slate-600 mt-2">
            Built specifically to solve the unique dynamics of student project teams.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {features.map((feat, index) => {
            const Icon = feat.icon;
            return (
              <Card key={index} className="hover:border-purple-200 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-base font-semibold text-slate-900">{feat.title}</h3>
                      <Badge variant="purple" size="sm">{feat.tag}</Badge>
                    </div>
                    <p className="text-sm text-slate-600 leading-relaxed mt-2">
                      {feat.description}
                    </p>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </section>

      {/* Problem vs SquadSync Solution */}
      <section className="bg-slate-900 text-white rounded-2xl p-8 sm:p-10 max-w-5xl mx-auto">
        <div className="max-w-2xl mb-8">
          <span className="text-purple-400 text-xs font-semibold uppercase tracking-wider">
            Why Traditional Metrics Fail
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold mt-2">
            Why commit counts do not equal healthy team contribution
          </h2>
          <p className="text-sm text-slate-400 mt-2">
            Measuring lines of code or commit volume encourages artificial commit splitting.
            SquadSync looks at end-to-end task progression, code review turnaround, and branch staleness.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {problemVsSolution.map((item, idx) => (
            <div key={idx} className="bg-slate-800/80 rounded-xl p-5 border border-slate-700/60 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 text-rose-400 text-xs font-semibold uppercase mb-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Common Trap #{idx + 1}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  "{item.problem}"
                </p>
              </div>
              <div className="mt-4 pt-4 border-t border-slate-700/70">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase mb-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>SquadSync Fix</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {item.solution}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Call to Action */}
      <section className="text-center max-w-xl mx-auto pb-10">
        <h2 className="text-2xl font-bold text-slate-900">
          Ready to inspect your student development team?
        </h2>
        <p className="text-sm text-slate-600 mt-2">
          Connect your GitHub repository and task board CSV in under 60 seconds.
        </p>
        <div className="mt-6 flex items-center justify-center gap-4">
          <Link to="/dashboard">
            <Button size="lg" variant="primary">
              View Active Dashboard
            </Button>
          </Link>
          <Link to="/settings">
            <Button size="lg" variant="secondary">
              Review Methodology
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}

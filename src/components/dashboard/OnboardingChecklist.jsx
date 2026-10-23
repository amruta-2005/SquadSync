import React from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  Circle,
  ArrowRight,
  Users,
  CheckSquare,
  Github,
  GitBranch,
  Play,
  Sparkles
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';

export default function OnboardingChecklist({ checklist, onRunAnalysis, isSyncing }) {
  if (!checklist) return null;

  const steps = [
    {
      id: 'team_created',
      title: '1. Create a Team Workspace',
      desc: 'Set up your project or capstone workspace.',
      completed: !!checklist.team_created,
      actionTo: null
    },
    {
      id: 'members_invited',
      title: '2. Invite Team Members',
      desc: 'Add collaborators by email with appropriate roles.',
      completed: !!checklist.members_invited,
      actionTo: '/data-sources',
      actionLabel: 'Invite Members'
    },
    {
      id: 'tasks_created',
      title: '3. Create & Assign Tasks',
      desc: 'Define initial backlog, story points, and deadlines.',
      completed: !!checklist.tasks_created,
      actionTo: '/tasks',
      actionLabel: 'Go to Tasks'
    },
    {
      id: 'repo_connected',
      title: '4. Connect GitHub Repository',
      desc: 'Connect the team Git repository via owner/repo name.',
      completed: !!checklist.repo_connected,
      actionTo: '/data-sources',
      actionLabel: 'Connect Repo'
    },
    {
      id: 'contributors_mapped',
      title: '5. Map GitHub Usernames',
      desc: 'Associate members with their GitHub handles for workload calculation.',
      completed: !!checklist.contributors_mapped,
      actionTo: '/data-sources',
      actionLabel: 'Map Handles'
    },
    {
      id: 'first_analysis_completed',
      title: '6. Run First Collaboration Analysis',
      desc: 'Sync repository commits, branches, and PRs with tasks.',
      completed: !!checklist.first_analysis_completed,
      actionHandler: onRunAnalysis,
      actionLabel: 'Run Analysis'
    }
  ];

  const completedCount = steps.filter(s => s.completed).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-purple-200 bg-gradient-to-r from-purple-50/50 via-white to-slate-50 overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-purple-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-md bg-purple-600 text-white">
              <Sparkles className="w-4 h-4" />
            </span>
            <h3 className="text-base font-bold text-slate-900 tracking-tight">
              Team Onboarding & Setup Workflow
            </h3>
            <Badge variant={progressPercent === 100 ? 'emerald' : 'purple'}>
              {completedCount} of {steps.length} completed ({progressPercent}%)
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete these setup steps to enable accurate, un-fabricated analytics from real tasks and repository records.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="w-full md:w-48 bg-slate-200 rounded-full h-2.5 overflow-hidden">
          <div
            className="bg-purple-600 h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-4">
        {steps.map((step) => (
          <div
            key={step.id}
            className={`p-3.5 rounded-xl border transition-all ${
              step.completed
                ? 'bg-white border-emerald-200/90 shadow-2xs'
                : 'bg-white/80 border-slate-200 shadow-2xs'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2">
                {step.completed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <Circle className="w-4 h-4 text-slate-300 shrink-0" />
                )}
                <h4 className={`text-xs font-bold ${step.completed ? 'text-slate-900 line-through text-slate-400' : 'text-slate-900'}`}>
                  {step.title}
                </h4>
              </div>
            </div>
            <p className="text-[11px] text-slate-500 mt-1 pl-6">
              {step.desc}
            </p>

            {!step.completed && (
              <div className="mt-2.5 pl-6">
                {step.actionTo ? (
                  <Link
                    to={step.actionTo}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors"
                  >
                    <span>{step.actionLabel}</span>
                    <ArrowRight className="w-3 h-3" />
                  </Link>
                ) : step.actionHandler ? (
                  <button
                    onClick={step.actionHandler}
                    disabled={isSyncing}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-purple-700 hover:text-purple-900 transition-colors"
                  >
                    <span>{isSyncing ? 'Running...' : step.actionLabel}</span>
                    <Play className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}

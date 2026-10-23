import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Users,
  GitPullRequest,
  GitMerge,
  ShieldAlert,
  Database,
  Sliders,
  ExternalLink,
  Github,
  BookOpen,
  HelpCircle
} from 'lucide-react';
import { useApp } from '../../context/AppContext';

export default function Sidebar({ isOpen, onClose }) {
  const { selectedTeam } = useApp();

  const navigation = [
    { name: 'Dashboard', to: '/dashboard', icon: LayoutDashboard },
    { name: 'Tasks', to: '/tasks', icon: CheckSquare },
    { name: 'Team Workload', to: '/workload', icon: Users },
    { name: 'Review Analysis', to: '/reviews', icon: GitPullRequest },
    { name: 'Integration Risk', to: '/integration-risks', icon: GitMerge },
    { name: 'Risk Details', to: '/risks', icon: ShieldAlert },
    { name: 'Data Sources', to: '/data-sources', icon: Database },
    { name: 'Settings & Docs', to: '/settings', icon: Sliders },
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
          onClick={onClose}
        />
      )}

      <aside
        className={`fixed top-16 bottom-0 left-0 w-64 bg-white border-r border-slate-200/90 z-40 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-4 space-y-6 overflow-y-auto">
          {/* Active repository chip */}
          {selectedTeam?.repo_name && selectedTeam.repo_name !== 'No Repository Connected' ? (
            <a
              href={`https://github.com/${selectedTeam.repo_name}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group block bg-slate-50 hover:bg-purple-50/50 border border-slate-200/80 hover:border-purple-200 rounded-xl p-3 transition-colors"
              title="Open repository on GitHub"
            >
              <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-800 group-hover:text-purple-700">
                <div className="flex items-center gap-2 truncate">
                  <Github className="w-4 h-4 text-slate-700 group-hover:text-purple-600 shrink-0" />
                  <span className="truncate">{selectedTeam.repo_name}</span>
                </div>
                <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-purple-600 shrink-0" />
              </div>
              <p className="text-[11px] text-slate-500 mt-1 flex items-center justify-between">
                <span>{selectedTeam?.academic_term || 'Student Team'}</span>
                <span className="text-purple-600 font-medium flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Tracking
                </span>
              </p>
            </a>
          ) : (
            <NavLink
              to="/data-sources"
              className="group block bg-slate-50 hover:bg-purple-50/50 border border-dashed border-slate-300 hover:border-purple-300 rounded-xl p-3 transition-colors"
              title="Connect GitHub repository"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 group-hover:text-purple-700">
                <Github className="w-4 h-4 text-slate-400 group-hover:text-purple-600" />
                <span className="truncate">Connect GitHub Repo</span>
              </div>
              <p className="text-[11px] text-purple-600 font-medium mt-1">
                + Configure in Data Sources
              </p>
            </NavLink>
          )}

          {/* Nav links */}
          <nav className="space-y-1">
            <div className="px-3 pb-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Analytics Views
            </div>
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-purple-50 text-purple-700 font-semibold'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <>
                      <Icon className={`w-4 h-4 ${isActive ? 'text-purple-600' : 'text-slate-400'}`} />
                      <span>{item.name}</span>
                    </>
                  )}
                </NavLink>
              );
            })}
          </nav>

          {/* Quick Guidance Box */}
          <div className="rounded-xl bg-purple-50/70 border border-purple-100 p-3.5 text-xs text-purple-900">
            <div className="flex items-center gap-1.5 font-semibold text-purple-950 mb-1">
              <HelpCircle className="w-3.5 h-3.5 text-purple-600" />
              <span>Evidence-First Rule</span>
            </div>
            <p className="text-[11px] text-purple-800/90 leading-relaxed">
              SquadSync measures multi-factor task effort and PR review times — never commit counts alone.
            </p>
          </div>
        </div>

        {/* Bottom footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 text-[11px] text-slate-500 flex items-center justify-between">
          <span>SquadSync v1.0</span>
          <span className="px-1.5 py-0.5 rounded bg-slate-200/70 text-slate-700 font-medium">
            Capstone Demo
          </span>
        </div>
      </aside>
    </>
  );
}

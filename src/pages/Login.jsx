import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
  Users,
  GitPullRequest,
  GitMerge,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  GitCommit,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/common/Button';
import Badge from '../components/common/Badge';

export default function Login() {
  const { login, isAuthenticated, authError, clearAuthError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  // Destination after login
  const from = location.state?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    if (!email.trim()) {
      setLocalError('Please enter your university or work email address.');
      return;
    }
    if (!password) {
      setLocalError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      await login(email, password, rememberMe);
      navigate(from, { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Invalid email or password.');
    } finally {
      setSubmitting(false);
    }
  };

  // Demo accounts helper for instant hackathon evaluation
  const handleQuickDemo = (demoEmail, demoPw) => {
    setEmail(demoEmail);
    setPassword(demoPw);
    setLocalError('');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-purple-100 selection:text-purple-900">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Section: Branding & Value Proposition (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          {/* Decorative glowing gradient backdrop */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Brand Logo */}
          <div className="relative z-10 space-y-6">
            <Link to="/" className="inline-flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-purple-600 text-white flex items-center justify-center font-bold shadow-lg shadow-purple-600/30 group-hover:bg-purple-500 transition-colors">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold tracking-tight text-white block">
                  SquadSync
                </span>
                <span className="text-[10px] text-purple-300 font-medium uppercase tracking-wider block">
                  Collaboration Intelligence
                </span>
              </div>
            </Link>

            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-[11px] font-semibold border border-purple-400/30">
                <Sparkles className="w-3 h-3 text-purple-300" />
                Senior Capstone & Hackathon Radar
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                Spot collaboration risks before they become project failures.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                SquadSync analyzes GitHub activity and task-board data to help student teams identify workload imbalance, missing code reviews, and delayed integration early.
              </p>
            </div>

            {/* Three Compact Feature Highlights */}
            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center shrink-0 mt-0.5">
                  <Users className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Workload Intelligence</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Effort share from story points and tasks — never commit counts alone.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center shrink-0 mt-0.5">
                  <GitPullRequest className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Review Monitoring</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Coverage % and wait turnaround times to prevent unreviewed merges.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start gap-3 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 flex items-center justify-center shrink-0 mt-0.5">
                  <GitMerge className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-white">Integration Risk Detection</h4>
                  <p className="text-[11px] text-slate-300 mt-0.5">
                    Surfaces long-lived divergent branches before presentation night chaos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Illustration Network Graphic */}
          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
              Secured with FastAPI & PBKDF2
            </span>
            <span className="text-slate-500">v1.0.0</span>
          </div>
        </div>

        {/* Right Section: Login Form (7 Cols) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Welcome back
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Sign in to continue to your SquadSync workspace.
              </p>
            </div>

            {/* Error Notification Banner */}
            {(localError || authError) && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in-50 duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">
                  {localError || authError}
                </div>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email field */}
              <div className="space-y-1">
                <label htmlFor="email" className="block text-xs font-semibold text-slate-700">
                  Email address
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.chen@squadsync.edu"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition-colors"
                  />
                </div>
              </div>

              {/* Password field */}
              <PasswordInput
                id="password"
                name="password"
                label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter your password"
                required
              />

              {/* Remember Me */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-slate-600 font-medium">Remember my session</span>
                </label>
              </div>

              {/* Sign In Submit Button */}
              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={submitting || loading}
                disabled={submitting || loading}
                className="w-full !py-2.5 text-xs font-semibold shadow-md shadow-purple-600/20"
                icon={ArrowRight}
                iconPosition="right"
              >
                Sign In
              </Button>
            </form>

            {/* Quick Demo Login Helper for Hackathon / Mentors */}
            <div className="pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Quick Demo Evaluation Accounts:
                </span>
                <span className="text-[10px] text-purple-600 font-medium">1-Click Fill</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => handleQuickDemo('alex.chen@squadsync.edu', 'SquadSync2026!')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-left transition-colors"
                >
                  <span className="font-bold text-slate-800 block truncate">Alex Chen</span>
                  <span className="text-[10px] text-slate-400 block truncate">Team Lead</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('maya.patel@squadsync.edu', 'SquadSync2026!')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-left transition-colors"
                >
                  <span className="font-bold text-slate-800 block truncate">Maya Patel</span>
                  <span className="text-[10px] text-slate-400 block truncate">Developer</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickDemo('mentor@squadsync.edu', 'SquadSync2026!')}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-left transition-colors"
                >
                  <span className="font-bold text-slate-800 block truncate">Dr. Vance</span>
                  <span className="text-[10px] text-slate-400 block truncate">Mentor</span>
                </button>
              </div>
            </div>
          </div>

          {/* Bottom Registration Link */}
          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Don't have an account yet?{' '}
            <Link
              to="/register"
              className="font-bold text-purple-600 hover:text-purple-800 hover:underline"
            >
              Create SquadSync Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

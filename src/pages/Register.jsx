import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Layers,
  User,
  Mail,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Lock,
  Briefcase
} from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import PasswordInput from '../components/auth/PasswordInput';
import Button from '../components/common/Button';
import apiService from '../services/api';

export default function Register() {
  const { register, clearAuthError, authError, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const searchParams = new URLSearchParams(location.search);
  const inviteToken = searchParams.get('invitation');

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Student Contributor');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');
  const [invitationInfo, setInvitationInfo] = useState(null);

  // Check invitation token if present in URL
  useEffect(() => {
    if (inviteToken) {
      apiService.getInvitationByToken(inviteToken)
        .then((res) => {
          if (res?.data) {
            setInvitationInfo(res.data);
            if (res.data.email) {
              setEmail(res.data.email);
            }
            if (res.data.role) {
              setRole(res.data.role);
            }
          }
        })
        .catch((err) => {
          console.warn('Failed to load invitation token:', err);
        });
    }
  }, [inviteToken]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearAuthError();

    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setLocalError('Please enter your university or work email address.');
      return;
    }
    if (password.length < 8) {
      setLocalError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setLocalError('Passwords do not match. Please re-enter.');
      return;
    }

    setSubmitting(true);
    try {
      await register(name, email, password, role);
      if (inviteToken) {
        try {
          await apiService.acceptInvitationByToken(inviteToken);
        } catch (inviteErr) {
          console.warn('Invitation token accept notice:', inviteErr);
        }
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setLocalError(err.message || 'Failed to register account.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-purple-100 selection:text-purple-900">
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xl overflow-hidden max-w-5xl w-full grid grid-cols-1 lg:grid-cols-12 min-h-[640px]">
        {/* Left Section: Branding & Onboarding (5 Cols) */}
        <div className="lg:col-span-5 bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900 text-white p-8 sm:p-10 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

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
                Join Your Software Project Workspace
              </span>
              <h2 className="text-xl sm:text-2xl font-bold text-white leading-snug">
                Transparent software engineering collaboration for modern student teams.
              </h2>
              <p className="text-xs text-slate-300 leading-relaxed">
                Connect your team repository, map task board cards, and access real-time workload and review health analytics.
              </p>
            </div>

            <div className="space-y-3 pt-2">
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-200">Continuous GitHub branch & PR monitoring</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-200">Zero plain-text credentials or PAT storage</span>
              </div>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-center gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-200">Actionable advice for capstones & hackathons</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 pt-6 mt-6 border-t border-white/10 text-[11px] text-slate-400 flex items-center justify-between">
            <span>FastAPI Secure Auth</span>
            <span className="text-purple-400 font-medium">Free for Academia</span>
          </div>
        </div>

        {/* Right Section: Registration Form (7 Cols) */}
        <div className="lg:col-span-7 p-8 sm:p-12 flex flex-col justify-between">
          <div className="max-w-md w-full mx-auto space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                Create your account
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Start tracking workload equity and code integration risk.
              </p>
            </div>

            {/* Invitation Notice Banner if token provided */}
            {invitationInfo && (
              <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-start gap-3 animate-in fade-in-50 duration-150">
                <Sparkles className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <span className="font-bold text-purple-900 block">
                    Team Invitation: {invitationInfo.team_name}
                  </span>
                  <p className="text-purple-800 leading-relaxed">
                    You have been invited to join <span className="font-semibold">{invitationInfo.team_name}</span> as a <span className="font-semibold">{invitationInfo.role}</span>. Register below to accept the invitation and access the project workspace.
                  </p>
                </div>
              </div>
            )}

            {(localError || authError) && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2.5 animate-in fade-in-50 duration-150">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">
                  {localError || authError}
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name */}
              <div className="space-y-1">
                <label htmlFor="name" className="block text-xs font-semibold text-slate-700">
                  Full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g., Alex Chen"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div className="space-y-1">
                <label htmlFor="reg-email" className="block text-xs font-semibold text-slate-700">
                  University or work email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="alex.chen@university.edu"
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              {/* Role Selection */}
              <div className="space-y-1">
                <label htmlFor="role" className="block text-xs font-semibold text-slate-700">
                  Project Role
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="Student Contributor">Student Contributor</option>
                    <option value="Team Lead">Team Lead</option>
                    <option value="Frontend Developer">Frontend Developer</option>
                    <option value="Backend Developer">Backend Developer</option>
                    <option value="Faculty Mentor / TA">Faculty Mentor / TA</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <PasswordInput
                id="reg-password"
                name="password"
                label="Password (min 8 characters)"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Create a strong password"
                required
              />

              {/* Confirm Password */}
              <PasswordInput
                id="confirmPassword"
                name="confirmPassword"
                label="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                placeholder="Re-enter password"
                required
              />

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
                Create Account
              </Button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-slate-100 text-center text-xs text-slate-600">
            Already have an account?{' '}
            <Link
              to={inviteToken ? `/login?invitation=${inviteToken}` : '/login'}
              className="font-bold text-purple-600 hover:text-purple-800 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { X, Mail, UserPlus, AlertCircle, CheckCircle2, Copy, Check, ExternalLink } from 'lucide-react';
import Button from '../common/Button';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';

export default function InviteMemberModal({ isOpen, onClose, teamId, onMemberInvited }) {
  const { addToast } = useApp();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('developer');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [createdInvitation, setCreatedInvitation] = useState(null);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleReset = () => {
    setEmail('');
    setRole('developer');
    setError(null);
    setCreatedInvitation(null);
    setCopied(false);
  };

  const handleClose = () => {
    handleReset();
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Please provide an email address.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await apiService.inviteTeamMember(teamId, {
        email: email.trim(),
        role
      });
      addToast(`Invitation generated for ${email.trim()}!`, 'success');
      setCreatedInvitation(res.data);
      if (onMemberInvited) {
        onMemberInvited(res.data);
      }
    } catch (err) {
      setError(err.message || 'Failed to send invitation.');
    } finally {
      setLoading(false);
    }
  };

  const invitationUrl = createdInvitation?.invitation_token
    ? `${window.location.origin}/login?invitation=${createdInvitation.invitation_token}`
    : '';

  const handleCopy = () => {
    if (invitationUrl) {
      navigator.clipboard.writeText(invitationUrl);
      setCopied(true);
      addToast('Invitation link copied to clipboard!', 'info');
      setTimeout(() => setCopied(false), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-900 font-bold text-base">
            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
              <UserPlus className="w-4 h-4" />
            </div>
            <span>{createdInvitation ? 'Invitation Created' : 'Invite Team Member'}</span>
          </div>
          <button
            onClick={handleClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {createdInvitation ? (
          <div className="p-6 space-y-4">
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-2.5 text-xs text-emerald-900">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Invitation Successfully Generated</span>
                <span>An invitation for <span className="font-semibold">{createdInvitation.email}</span> with role <span className="font-semibold">{createdInvitation.role}</span> is now active.</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1">
              <span className="font-semibold block text-amber-950">Development Workflow Notice:</span>
              <p className="text-amber-800 leading-relaxed">
                SMTP email delivery is not configured in local development. Instead, you can share the invitation link below directly with your teammate, or have them log in with <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">{createdInvitation.email}</code> to accept the pending invitation banner.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Development Invitation Link
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  readOnly
                  value={invitationUrl}
                  className="w-full px-3 py-2 text-xs font-mono bg-slate-50 border border-slate-200 rounded-lg text-slate-700 select-all"
                />
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1 transition-colors shrink-0"
                  title="Copy Link"
                >
                  {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button type="button" variant="secondary" size="sm" onClick={handleReset}>
                Invite Another
              </Button>
              <Button type="button" variant="primary" size="sm" onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Member Email Address <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="colleague@university.edu"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
                />
              </div>
              <p className="text-[11px] text-slate-400 mt-1">
                A secure 7-day invitation will be generated. Duplicate invitations to the same email are prevented.
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Team Role
              </label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:bg-white"
              >
                <option value="developer">Developer (Assign tasks, update status, view analytics)</option>
                <option value="team_lead">Team Lead (Manage repo, assign work, invite members)</option>
                <option value="reviewer">Reviewer (Focus on code reviews & PR turnaround)</option>
                <option value="viewer">Viewer (Read-only analytics access)</option>
              </select>
            </div>

            <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
              <Button type="button" variant="secondary" size="sm" onClick={handleClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" loading={loading} icon={UserPlus}>
                Send Invitation
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}


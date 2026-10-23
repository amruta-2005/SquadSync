import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  Github,
  UserPlus,
  Shield,
  Trash2,
  Check,
  AlertCircle,
  Mail,
  Clock,
  Save,
  CheckCircle2,
  ExternalLink,
  GitCommit,
  Unlink,
  Link as LinkIcon,
  RotateCcw,
  Ban,
  Copy,
  Info,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import Card from '../common/Card';
import Badge from '../common/Badge';
import Button from '../common/Button';
import InviteMemberModal from './InviteMemberModal';
import apiService from '../../services/api';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../auth/AuthProvider';
import { formatDate } from '../../utils/formatters';

export default function ContributorMappingCard({ teamId, onDataChanged }) {
  const { addToast } = useApp();
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'contributors' | 'collaborators' | 'invitations'
  const [mappingData, setMappingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [editingGh, setEditingGh] = useState({});
  const [savingGh, setSavingGh] = useState({});
  const [quickMappingMember, setQuickMappingMember] = useState({});
  const [copiedToken, setCopiedToken] = useState(null);

  const loadData = useCallback(async () => {
    if (!teamId) return;
    setLoading(true);
    try {
      const res = await apiService.getContributorMapping(teamId);
      const data = res.data || {};
      setMappingData(data);

      // initialize editing state
      const ghMap = {};
      (data.team_members || []).forEach(m => {
        ghMap[m.user_id] = m.github_username || '';
      });
      setEditingGh(ghMap);
    } catch (err) {
      addToast(`Error loading contributor mapping: ${err.message}`, 'error');
    } finally {
      setLoading(false);
    }
  }, [teamId, addToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleSaveGithub = async (userId) => {
    const ghVal = (editingGh[userId] || '').trim();
    setSavingGh(prev => ({ ...prev, [userId]: true }));
    try {
      await apiService.mapMemberGithub(teamId, userId, ghVal);
      addToast(ghVal ? `Mapped member to GitHub @${ghVal}!` : 'Unmapped GitHub username', 'success');
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      addToast(`Failed to map GitHub user: ${err.message}`, 'error');
    } finally {
      setSavingGh(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleUnmap = async (userId) => {
    setSavingGh(prev => ({ ...prev, [userId]: true }));
    try {
      await apiService.unmapMemberGithub(teamId, userId);
      addToast('Unmapped GitHub username successfully', 'info');
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      addToast(`Failed to unmap user: ${err.message}`, 'error');
    } finally {
      setSavingGh(prev => ({ ...prev, [userId]: false }));
    }
  };

  const handleQuickMapFromContributor = async (githubLogin, targetUserId) => {
    if (!targetUserId) return;
    try {
      await apiService.mapMemberGithub(teamId, targetUserId, githubLogin);
      addToast(`Mapped @${githubLogin} to selected team member!`, 'success');
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      addToast(`Mapping error: ${err.message}`, 'error');
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await apiService.updateMemberRole(teamId, userId, newRole);
      addToast(`Updated member role to ${newRole.replace('_', ' ')}!`, 'success');
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      addToast(`Failed to change role: ${err.message}`, 'error');
    }
  };

  const handleRemoveMember = async (userId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this team?`)) return;
    try {
      await apiService.removeTeamMember(teamId, userId);
      addToast(`Removed ${memberName} from team`, 'info');
      await loadData();
      if (onDataChanged) onDataChanged();
    } catch (err) {
      addToast(`Failed to remove member: ${err.message}`, 'error');
    }
  };

  const handleCancelInvitation = async (invitationId, email) => {
    if (!window.confirm(`Cancel pending invitation for ${email}?`)) return;
    try {
      await apiService.cancelTeamInvitation(teamId, invitationId);
      addToast(`Invitation for ${email} cancelled`, 'info');
      await loadData();
    } catch (err) {
      addToast(`Failed to cancel invitation: ${err.message}`, 'error');
    }
  };

  const handleResendInvitation = async (invitationId, email) => {
    try {
      const res = await apiService.resendTeamInvitation(teamId, invitationId);
      addToast(res.message || `Renewed invitation for ${email}!`, 'success');
      await loadData();
    } catch (err) {
      addToast(`Failed to renew invitation: ${err.message}`, 'error');
    }
  };

  const handleCopyInviteLink = (token) => {
    const url = `${window.location.origin}/login?invitation=${token}`;
    navigator.clipboard.writeText(url);
    setCopiedToken(token);
    addToast('Copied invitation link to clipboard!', 'info');
    setTimeout(() => setCopiedToken(null), 2500);
  };

  const members = mappingData?.team_members || [];
  const githubContributors = mappingData?.github_contributors || [];
  const contributorsWarning = mappingData?.contributors_warning;
  const githubCollaborators = mappingData?.github_collaborators || [];
  const githubInvitations = mappingData?.github_invitations || [];
  const invitations = mappingData?.team_invitations || [];
  const unmappedMembers = mappingData?.unmapped_members || [];
  const unmappedContributors = mappingData?.unmapped_contributors || [];
  const summary = mappingData?.summary || {};
  const repositoryPeopleByLogin = new Map();
  githubContributors.forEach(contributor => {
    const login = (contributor.login || '').trim();
    if (!login) return;
    repositoryPeopleByLogin.set(login.toLowerCase(), {
      ...contributor,
      name: contributor.name || login,
      repository_status: 'contributor',
      repository_roles: ['Commit Contributor']
    });
  });
  githubCollaborators.forEach(collaborator => {
    const login = (collaborator.login || '').trim();
    if (!login) return;
    const key = login.toLowerCase();
    const existing = repositoryPeopleByLogin.get(key);
    repositoryPeopleByLogin.set(key, {
      ...existing,
      ...collaborator,
      name: collaborator.name || existing?.name || login,
      contributions: existing?.contributions,
      repository_status: 'collaborator',
      repository_roles: [...new Set([...(existing?.repository_roles || []), 'Collaborator'])]
    });
  });
  githubInvitations.forEach(invitation => {
    const login = (invitation.invitee_login || '').trim();
    if (!login) return;
    const key = login.toLowerCase();
    const existing = repositoryPeopleByLogin.get(key);
    repositoryPeopleByLogin.set(key, {
      ...existing,
      ...invitation,
      login,
      name: invitation.invitee_name || existing?.name || login,
      avatar_url: invitation.invitee_avatar || existing?.avatar_url || `https://avatars.githubusercontent.com/${login}`,
      html_url: invitation.invitee_html_url || existing?.html_url || `https://github.com/${login}`,
      contributions: existing?.contributions,
      repository_status: 'pending_invitation',
      repository_roles: [...new Set([...(existing?.repository_roles || []), 'Pending Invitation'])]
    });
  });
  const repositoryPeople = Array.from(repositoryPeopleByLogin.values());
  const repositoryTeamPeople = Array.from(new Map(
    [
      ...githubContributors.filter(person => person.source === 'user_provided'),
      ...githubCollaborators,
      ...githubInvitations
    ]
      .filter(person => person.login || person.invitee_login)
      .map(person => {
        const login = person.login || person.invitee_login;
        return [login.toLowerCase(), person];
      })
  ).values());
  const manualContributorCount = githubContributors.filter(person => person.source === 'user_provided').length;

  return (
    <Card
      title="Team Members & GitHub Contributor Mapping"
      subtitle="Associate real SquadSync team members with discovered GitHub contributors to synchronize workload and commit attribution"
      headerAction={
        <Button
          size="sm"
          variant="primary"
          icon={UserPlus}
          onClick={() => setIsInviteModalOpen(true)}
        >
          Invite Member
        </Button>
      }
    >
      <div className="space-y-6">
        {/* KPI Badges Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-purple-50/70 border border-purple-100 rounded-xl p-3">
            <span className="text-[11px] text-purple-600 block font-medium">SquadSync Members</span>
            <span className="text-lg font-bold text-purple-950 mt-0.5 block">
              {summary.total_team_members || members.length}
            </span>
            <span className="text-[10px] text-purple-500">
              {summary.mapped_team_members || 0} mapped • {summary.unmapped_team_members || 0} unmapped
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 block font-medium">Repository Team Members</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {repositoryTeamPeople.length}
            </span>
            <span className="text-[10px] text-slate-400">
              {githubCollaborators.length} collaborators · {manualContributorCount} contributors · {githubInvitations.length} pending invites
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 block font-medium">Repo Collaborators</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {summary.total_collaborators || githubCollaborators.length}
            </span>
            <span className="text-[10px] text-slate-400">
              {githubCollaborators.some(person => person.source !== 'user_provided')
                ? 'Includes accounts returned by GitHub'
                : 'Includes manually added accounts'}
            </span>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
            <span className="text-[11px] text-slate-500 block font-medium">Pending GitHub Invitations</span>
            <span className="text-lg font-bold text-slate-900 mt-0.5 block">
              {summary.pending_github_invitations ?? githubInvitations.length}
            </span>
            <span className="text-[10px] text-slate-400">
              {summary.pending_team_invitations || 0} SquadSync team invitations
            </span>
          </div>
        </div>

        {mappingData?.collaborators_warning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block">GitHub could not verify collaborator accounts in this sync</span>
              <span>{mappingData.collaborators_warning}</span>
              <span className="block mt-1">
              The listed accounts include the repository people you provided; GitHub access could not be verified during this sync.
              </span>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 text-xs font-semibold overflow-x-auto gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('members')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'members'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>SquadSync Team Members ({members.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('contributors')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'contributors'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Github className="w-4 h-4" />
            <span>Contributors & Repository People ({repositoryPeople.length})</span>
            {repositoryPeople.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded-full text-[10px]">
                {repositoryTeamPeople.length} repository accounts
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('collaborators')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'collaborators'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Repo People ({repositoryTeamPeople.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('invitations')}
            className={`pb-2.5 px-3 border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
              activeTab === 'invitations'
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Mail className="w-4 h-4" />
            <span>Team Invitations ({invitations.length})</span>
          </button>
        </div>

        {/* TAB 1: SquadSync Team Members & Mapping */}
        {activeTab === 'members' && (
          <div className="space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">SquadSync Member</th>
                    <th className="py-2.5 px-3">Team Role</th>
                    <th className="py-2.5 px-3">Mapped GitHub Username</th>
                    <th className="py-2.5 px-3">Attribution Status</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {members.map((m) => {
                    const currentVal = editingGh[m.user_id] ?? (m.github_username || '');
                    const isSaving = savingGh[m.user_id];
                    const isMapped = !!m.github_username;

                    return (
                      <tr key={m.user_id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 font-bold flex items-center justify-center text-xs shadow-2xs">
                              {m.name?.charAt(0) || 'U'}
                            </div>
                            <div>
                              <span className="font-semibold text-slate-900 block">{m.name}</span>
                              <span className="text-[11px] text-slate-400 block">{m.email}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <select
                            value={m.role}
                            onChange={(e) => handleRoleChange(m.user_id, e.target.value)}
                            className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                          >
                            <option value="developer">Developer</option>
                            <option value="team_lead">Team Lead</option>
                            <option value="reviewer">Reviewer</option>
                            <option value="viewer">Viewer</option>
                          </select>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Github className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                              <input
                                type="text"
                                list={`gh-contributors-list-${m.user_id}`}
                                placeholder="e.g. amruta-2005"
                                value={currentVal}
                                onChange={(e) =>
                                  setEditingGh(prev => ({ ...prev, [m.user_id]: e.target.value }))
                                }
                                className="pl-7 pr-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500 w-44 font-mono"
                              />
                              <datalist id={`gh-contributors-list-${m.user_id}`}>
                                {repositoryPeople.map(c => (
                                  <option key={c.login} value={c.login}>
                                    {c.name || c.login}{c.contributions != null ? ` (${c.contributions} commits)` : ''}
                                  </option>
                                ))}
                              </datalist>
                            </div>

                            <button
                              type="button"
                              onClick={() => handleSaveGithub(m.user_id)}
                              disabled={isSaving}
                              className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md shadow-2xs transition-colors flex items-center gap-1 disabled:opacity-50"
                              title="Save mapping"
                            >
                              <Save className="w-3 h-3" />
                              <span>{isSaving ? 'Saving...' : 'Save'}</span>
                            </button>

                            {isMapped && (
                              <button
                                type="button"
                                onClick={() => handleUnmap(m.user_id)}
                                disabled={isSaving}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Unmap GitHub username"
                              >
                                <Unlink className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>

                        <td className="py-3 px-3 whitespace-nowrap">
                          {isMapped ? (
                            <Badge variant="emerald" size="sm" dot>
                              Mapped (@{m.github_username})
                            </Badge>
                          ) : (
                            <Badge variant="amber" size="sm" dot>
                              Unmapped
                            </Badge>
                          )}
                        </td>

                        <td className="py-3 px-3 text-right whitespace-nowrap">
                          {user?.id !== m.user_id && (
                            <button
                              onClick={() => handleRemoveMember(m.user_id, m.name)}
                              className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-rose-50 transition-colors"
                              title="Remove member from team"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {repositoryTeamPeople.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">
                  Repository Team Members ({repositoryTeamPeople.length})
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {repositoryPeople
                    .filter(person => person.repository_status === 'contributor' || person.repository_status === 'collaborator' || person.repository_status === 'pending_invitation')
                    .map(person => (
                      <div key={person.login} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img src={person.avatar_url} alt="" className="w-8 h-8 rounded-full border border-slate-200" />
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{person.name}</p>
                            <p className="text-[11px] text-slate-500 truncate">@{person.login}</p>
                          </div>
                        </div>
                        <Badge
                          variant={person.repository_status === 'pending_invitation' ? 'amber' : 'emerald'}
                          size="sm"
                        >
                          {person.repository_status === 'pending_invitation'
                            ? 'Pending invite'
                            : person.repository_status === 'contributor' ? 'Contributor' : 'Collaborator'}
                        </Badge>
                      </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-500">
                  Repository accounts are listed here; pending invitees are not yet active SquadSync team members.
                </p>
              </div>
            )}

            <div className="p-3 bg-purple-50/60 border border-purple-100 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
              <Info className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-semibold block text-purple-950">Attribution & Privacy Rule:</span>
                <span className="text-purple-800 leading-relaxed block">
                  Mapping associates repository commits, branches, and code reviews with the member's task board assignments. Mappings are strictly per-team and persisted in SQLite.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Discovered GitHub Contributors */}
        {activeTab === 'contributors' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start gap-2.5">
              <Github className="w-4 h-4 text-slate-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-slate-900 block">Repository contributors and team accounts</span>
                <span>
                  The list includes commit authors, accepted collaborators, and pending repository invitations. Commit counts are shown only when GitHub returned them.
                </span>
              </div>
            </div>

            {contributorsWarning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">GitHub contributor data could not be fetched</span>
                  <span>{contributorsWarning}</span>
                </div>
              </div>
            )}

            {repositoryPeople.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                <Github className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">
                  {contributorsWarning ? 'GitHub contributor data is temporarily unavailable' : 'No Repository People Discovered'}
                </p>
                <p className="mt-1">
                  {contributorsWarning
                    ? 'Configure a GitHub token in the repository connection form, then sync again.'
                    : 'Connect your repository above and click "Sync Data Now" to query GitHub repository people.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Repository Person</th>
                      <th className="py-2.5 px-3">Commit Contributions</th>
                      <th className="py-2.5 px-3">Repository Status</th>
                      <th className="py-2.5 px-3">SquadSync Member Match</th>
                      <th className="py-2.5 px-3 text-right">Quick Map</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {repositoryPeople.map((c) => (
                      <tr key={c.login} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={c.avatar_url}
                              alt={c.login}
                              className="w-7 h-7 rounded-full border border-slate-200"
                            />
                            <div>
                              <a
                                href={c.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-slate-900 hover:text-purple-600 inline-flex items-center gap-1"
                              >
                                <span>{c.name || `@${c.login}`}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                              {c.name && c.name !== c.login && (
                                <span className="block text-[10px] text-slate-500">@{c.login}</span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.contributions != null
                            ? <><span className="font-semibold text-slate-800">{c.contributions}</span> commits</>
                            : <span className="text-slate-400 italic">No commit data</span>}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.repository_status === 'pending_invitation' ? (
                            <Badge variant="amber" size="sm" dot>Pending Invitation</Badge>
                          ) : c.repository_status === 'collaborator' ? (
                            <Badge variant="emerald" size="sm" dot>
                              {c.source === 'user_provided' ? 'Collaborator · manually added' : 'Collaborator'}
                            </Badge>
                          ) : c.source === 'user_provided' ? (
                            <Badge variant="blue" size="sm" dot>Contributor · manually added</Badge>
                          ) : c.is_mapped ? (
                            <Badge variant="emerald" size="sm" dot>
                              Mapped
                            </Badge>
                          ) : (
                            <Badge variant="amber" size="sm" dot>
                              Unmapped Contributor
                            </Badge>
                          )}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {c.is_mapped ? (
                            <div className="flex items-center gap-1.5 font-medium text-slate-800">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>{c.mapped_member_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">None</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {!c.is_mapped ? (
                            <div className="inline-flex items-center gap-1.5">
                              <select
                                value={quickMappingMember[c.login] || ''}
                                onChange={(e) =>
                                  setQuickMappingMember(prev => ({ ...prev, [c.login]: e.target.value }))
                                }
                                className="px-2 py-1 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800"
                              >
                                <option value="">Select Member...</option>
                                {unmappedMembers.map(m => (
                                  <option key={m.user_id} value={m.user_id}>
                                    {m.name} ({m.email})
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                disabled={!quickMappingMember[c.login]}
                                onClick={() => handleQuickMapFromContributor(c.login, quickMappingMember[c.login])}
                                className="px-2 py-1 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 text-white rounded text-xs font-semibold shadow-2xs"
                              >
                                Map
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleUnmap(c.mapped_member_id)}
                              className="px-2 py-1 bg-slate-100 hover:bg-rose-50 text-slate-600 hover:text-rose-700 rounded text-xs font-medium border border-slate-200"
                            >
                              Unmap
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: Repository Collaborators & GitHub Invitations */}
        {activeTab === 'collaborators' && (
          <div className="space-y-4">
            <div className="p-3 bg-purple-50/70 border border-purple-200 rounded-xl text-xs text-purple-900 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-purple-950 block">Repository collaborators and pending invitations:</span>
                <span className="text-purple-800 leading-relaxed block">
                  Commit contributors, accepted collaborators, pending invitations, and SquadSync team members are separate lists. Manually added entries are shown as provided and are not verified by GitHub.
                </span>
              </div>
            </div>

            {mappingData?.collaborators_warning && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold block">GitHub did not allow this app to verify collaborators</span>
                  <span>{mappingData.collaborators_warning}</span>
                  <span className="block mt-1">
                    The displayed manual entries are still included below. The authenticated account needs write, maintain, or admin access. Classic personal access tokens need
                    {' '}<code>repo</code> and <code>read:org</code> scopes.
                  </span>
                </div>
              </div>
            )}

            {githubCollaborators.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Collaborator</th>
                      <th className="py-2.5 px-3">GitHub Permissions</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">SquadSync Member Match</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {githubCollaborators.map((cb) => (
                      <tr key={cb.login} className="hover:bg-slate-50/60 transition-colors">
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <img
                              src={cb.avatar_url}
                              alt={cb.login}
                              className="w-6 h-6 rounded-full border border-slate-200"
                            />
                            <div>
                              <a
                                href={cb.html_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-semibold text-slate-900 hover:text-purple-600 inline-flex items-center gap-1"
                              >
                                <span>{cb.name || cb.login}</span>
                                <ExternalLink className="w-3 h-3 text-slate-400" />
                              </a>
                              <span className="block text-[10px] text-slate-500">@{cb.login}</span>
                            </div>
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px]">
                            {cb.permissions?.admin && <span className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded font-mono">admin</span>}
                            {cb.permissions?.push && <span className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded font-mono">push</span>}
                            {cb.permissions?.pull && <span className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono">pull</span>}
                            {cb.source === 'user_provided' && (
                              <span className="text-slate-500">Not verified</span>
                            )}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap font-medium text-slate-700 capitalize">
                          {cb.source === 'user_provided' ? 'Collaborator (manually added)' : cb.role_name}
                        </td>

                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {cb.is_mapped ? (
                            <Badge variant="emerald" size="sm">
                              Mapped to {cb.mapped_member_name}
                            </Badge>
                          ) : (
                            <span className="text-slate-400 italic">Unmapped</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                Confirm the token permissions and GitHub account access described above, then sync the repository again.
              </div>
            )}

            {githubInvitations.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-800">
                  Pending Repository Invitations ({githubInvitations.length})
                </h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">Invitee</th>
                        <th className="py-2.5 px-3">GitHub Login</th>
                        <th className="py-2.5 px-3">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {githubInvitations.map(invitation => (
                        <tr key={invitation.id} className="hover:bg-slate-50/60">
                          <td className="py-2.5 px-3 font-medium text-slate-900">
                            {invitation.invitee_name || invitation.invitee_login || invitation.invitee_email}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600">
                            {invitation.invitee_login ? `@${invitation.invitee_login}` : invitation.invitee_email || 'Not available'}
                          </td>
                          <td className="py-2.5 px-3">
                            <Badge variant="amber" size="sm">
                              {invitation.source === 'user_provided' ? 'Pending · manually added' : 'Pending'}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: Team Invitations & Development Access */}
        {activeTab === 'invitations' && (
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <Mail className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-slate-900 block">Workspace Invitation System</span>
                  <span>
                    Invitations are valid for 7 days. In local development without SMTP, share the invitation link directly with your teammate.
                  </span>
                </div>
              </div>

              <Button
                size="sm"
                variant="primary"
                icon={UserPlus}
                onClick={() => setIsInviteModalOpen(true)}
              >
                New Invite
              </Button>
            </div>

            {invitations.length === 0 ? (
              <div className="p-8 text-center bg-slate-50 border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                <Mail className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No Invitations Sent</p>
                <p className="mt-1">Click "Invite Member" to invite colleagues using their email address.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Invited Email</th>
                      <th className="py-2.5 px-3">Role</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Invited By</th>
                      <th className="py-2.5 px-3">Created</th>
                      <th className="py-2.5 px-3">Expires</th>
                      <th className="py-2.5 px-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {invitations.map((inv) => {
                      const isPending = inv.status === 'pending';
                      const isExpired = inv.status === 'expired';
                      const isAccepted = inv.status === 'accepted';

                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-2.5 px-3 font-semibold text-slate-900 whitespace-nowrap">
                            {inv.email}
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 capitalize whitespace-nowrap">
                            {inv.role?.replace('_', ' ')}
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <Badge
                              variant={
                                isAccepted
                                  ? 'emerald'
                                  : isPending
                                  ? 'amber'
                                  : isExpired
                                  ? 'rose'
                                  : 'slate'
                              }
                              size="sm"
                              dot
                            >
                              {inv.status}
                            </Badge>
                          </td>
                          <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                            {inv.inviter_name || 'Team Lead'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                            {formatDate(inv.created_at)}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400 whitespace-nowrap">
                            {formatDate(inv.expires_at)}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              {isPending && inv.invitation_token && (
                                <button
                                  type="button"
                                  onClick={() => handleCopyInviteLink(inv.invitation_token)}
                                  className="px-2 py-1 text-slate-600 hover:text-purple-700 hover:bg-purple-50 rounded border border-slate-200 transition-colors flex items-center gap-1 text-[11px]"
                                  title="Copy development invite link"
                                >
                                  {copiedToken === inv.invitation_token ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                                  <span>{copiedToken === inv.invitation_token ? 'Copied' : 'Link'}</span>
                                </button>
                              )}

                              {(isPending || isExpired) && (
                                <button
                                  type="button"
                                  onClick={() => handleResendInvitation(inv.id, inv.email)}
                                  className="px-2 py-1 text-purple-700 hover:bg-purple-50 rounded border border-purple-200 transition-colors text-[11px] font-semibold flex items-center gap-1"
                                  title="Resend / Renew invitation"
                                >
                                  <RotateCcw className="w-3 h-3" />
                                  <span>Resend</span>
                                </button>
                              )}

                              {isPending && (
                                <button
                                  type="button"
                                  onClick={() => handleCancelInvitation(inv.id, inv.email)}
                                  className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                  title="Cancel invitation"
                                >
                                  <Ban className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      <InviteMemberModal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        teamId={teamId}
        onMemberInvited={() => {
          loadData();
          if (onDataChanged) onDataChanged();
        }}
      />
    </Card>
  );
}

/**
 * Shared API service for SquadSync Frontend.
 * Communicates with the FastAPI backend specified in VITE_API_BASE_URL.
 * Supports explicit demo mode, live GitHub repository analytics, and graceful network diagnostics.
 */

import { DEMO_TEAMS, DEMO_DATA } from './demoData';
import authService from '../auth/authService';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';

class ApiService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  /**
   * Internal fetch wrapper with timeout and standardized error handling.
   */
  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const timeout = options.timeout || 15000;

    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    const authHeaders = authService.getAuthHeaders();

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Accept': 'application/json',
          ...authHeaders,
          ...(options.headers || {})
        }
      });

      clearTimeout(id);

      if (!response.ok) {
        let errorMessage = `HTTP error ${response.status}: ${response.statusText}`;
        try {
          const errorJson = await response.json();
          if (errorJson && (errorJson.detail || errorJson.message)) {
            errorMessage = errorJson.detail || errorJson.message;
          }
        } catch {
          // ignore json parse error on error response
        }
        const error = new Error(errorMessage);
        error.status = response.status;
        throw error;
      }

      return await response.json();
    } catch (err) {
      clearTimeout(id);
      if (err.name === 'AbortError') {
        const timeoutError = new Error(`Request to ${url} timed out after ${timeout}ms. Is the FastAPI backend running at ${this.baseUrl}?`);
        timeoutError.isConnectionError = true;
        throw timeoutError;
      }
      if (err instanceof TypeError && err.message.includes('fetch')) {
        const connError = new Error(`Cannot connect to backend at ${this.baseUrl}. Please verify the FastAPI server is running on port 8000.`);
        connError.isConnectionError = true;
        throw connError;
      }
      throw err;
    }
  }

  /**
   * Check backend health.
   */
  async getHealth() {
    return this.request('/health', { timeout: 3000 });
  }

  /**
   * Get all registered teams / workspaces.
   */
  async getTeams(forceDemo = false) {
    if (forceDemo) {
      return { data: DEMO_TEAMS, isDemo: true };
    }
    const res = await this.request('/teams');
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get repository configuration and connection info.
   */
  async getRepoInfo(teamId, forceDemo = false) {
    if (forceDemo) {
      return {
        configured: true,
        data: {
          team_id: teamId,
          repo_owner: 'squadsync-org',
          repo_name: 'devpulse-capstone',
          repository: 'squadsync-org/devpulse-capstone',
          default_branch: 'main',
          last_synced_at: new Date().toISOString(),
          sync_status: 'success',
          has_token: true
        },
        isDemo: true
      };
    }
    const res = await this.request(`/teams/${teamId}/repo-info`);
    return { ...res, isDemo: false };
  }

  /**
   * Get team dashboard metrics and overview.
   */
  async getDashboard(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.dashboard || DEMO_DATA['team-alpha'].dashboard;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/dashboard`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get workload distribution.
   */
  async getWorkload(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.workload || DEMO_DATA['team-alpha'].workload;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/workload`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get code review analysis.
   */
  async getReviews(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.reviews || DEMO_DATA['team-alpha'].reviews;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/reviews`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get integration risk metrics and long-running branches.
   */
  async getIntegrationRisks(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.integration_risks || DEMO_DATA['team-alpha'].integration_risks;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/integration-risks`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get all detected collaboration risks for risk details page.
   */
  async getRisks(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.risks || DEMO_DATA['team-alpha'].risks;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/risks`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get recommendations.
   */
  async getRecommendations(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.dashboard?.recent_warnings || [];
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/recommendations`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Get data sync status and validation logs.
   */
  async getSyncStatus(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.sync_status || DEMO_DATA['team-alpha'].sync_status;
      return { data, isDemo: true };
    }
    const res = await this.request(`/teams/${teamId}/sync-status`);
    return { data: res.data || res, isDemo: false };
  }

  /**
   * Trigger GitHub & Task data synchronization on the backend.
   */
  async triggerSync(teamId, forceDemo = false) {
    if (forceDemo) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return {
        success: true,
        isDemo: true,
        message: 'Simulated sync completed successfully (Demo Mode)',
        timestamp: new Date().toISOString(),
        records_processed: { commits: 145, pull_requests: 12, tasks: 28 }
      };
    }
    return this.request(`/teams/${teamId}/sync`, {
      method: 'POST'
    });
  }

  /**
   * Connect / Update GitHub repository configuration.
   * Token is sent securely to the backend over HTTPS and is never stored in browser storage.
   */
  async connectRepository(teamId, { repo_owner, repo_name, branch = 'main', github_token = null }, forceDemo = false) {
    if (forceDemo) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        success: true,
        isDemo: true,
        message: `Successfully connected ${repo_owner}/${repo_name} (branch: ${branch}) [Demo Mode]`,
        repository: `${repo_owner}/${repo_name}`
      };
    }
    return this.request(`/teams/${teamId}/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        repo_owner,
        repo_name,
        branch,
        github_token: github_token || undefined
      })
    });
  }

  /**
   * Upload CSV task-board file.
   */
  async importTasksCsv(teamId, file, forceDemo = false) {
    if (forceDemo) {
      await new Promise(resolve => setTimeout(resolve, 1200));
      return {
        success: true,
        isDemo: true,
        message: `Imported tasks from ${file.name} (Simulated Demo Mode)`,
        rows_processed: 28,
        validation_warnings: 0
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/teams/${teamId}/tasks/import`;
    const authHeaders = authService.getAuthHeaders();

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        ...authHeaders
      },
      body: formData
    });

    if (!response.ok) {
      let msg = `HTTP error ${response.status}`;
      try {
        const json = await response.json();
        msg = json.detail || json.message || msg;
      } catch {
        // ignore
      }
      throw new Error(msg);
    }

    return await response.json();
  }

  // ----------------- FEATURE 1: Team & Member Management -----------------

  /**
   * Create a new team workspace.
   */
  async createTeam({ name, description }) {
    return this.request('/teams', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
  }

  /**
   * Update team details.
   */
  async updateTeam(teamId, { name, description }) {
    return this.request(`/teams/${teamId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, description })
    });
  }

  /**
   * List members of a team.
   */
  async getTeamMembers(teamId) {
    return this.request(`/teams/${teamId}/members`);
  }

  /**
   * Update a team member's role (team_lead, developer, reviewer, viewer).
   */
  async updateMemberRole(teamId, memberId, role) {
    return this.request(`/teams/${teamId}/members/${memberId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });
  }

  /**
   * Map a GitHub username to a team member.
   */
  async mapMemberGithub(teamId, memberId, github_username) {
    return this.request(`/teams/${teamId}/members/${memberId}/github`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ github_username: github_username || '' })
    });
  }

  /**
   * Unmap a team member's GitHub username.
   */
  async unmapMemberGithub(teamId, memberId) {
    return this.request(`/teams/${teamId}/members/${memberId}/github`, {
      method: 'DELETE'
    });
  }

  /**
   * Fetch full contributor mapping data (SquadSync members, GitHub contributors, collaborators, invitations).
   */
  async getContributorMapping(teamId) {
    return this.request(`/teams/${teamId}/contributor-mapping`);
  }

  /**
   * Remove a member from a team.
   */
  async removeTeamMember(teamId, memberId) {
    return this.request(`/teams/${teamId}/members/${memberId}`, {
      method: 'DELETE'
    });
  }

  // ----------------- Invitations Management -----------------

  /**
   * Invite a member to the team by email.
   */
  async inviteTeamMember(teamId, { email, role = 'developer' }) {
    return this.request(`/teams/${teamId}/invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, role })
    });
  }

  /**
   * List all sent invitations for a team.
   */
  async getTeamInvitations(teamId) {
    return this.request(`/teams/${teamId}/invitations`);
  }

  /**
   * Cancel a pending invitation.
   */
  async cancelTeamInvitation(teamId, invitationId) {
    return this.request(`/teams/${teamId}/invitations/${invitationId}/cancel`, {
      method: 'POST'
    });
  }

  /**
   * Resend / renew an invitation.
   */
  async resendTeamInvitation(teamId, invitationId) {
    return this.request(`/teams/${teamId}/invitations/${invitationId}/resend`, {
      method: 'POST'
    });
  }

  /**
   * Get invitation details by secure token.
   */
  async getInvitationByToken(token) {
    return this.request(`/invitations/token/${token}`);
  }

  /**
   * Accept an invitation using secure token.
   */
  async acceptInvitationByToken(token) {
    return this.request(`/invitations/token/${token}/accept`, {
      method: 'POST'
    });
  }

  /**
   * Get pending invitations for the current logged-in user.
   */
  async getMyPendingInvitations() {
    return this.request('/invitations/pending');
  }

  /**
   * Respond to a team invitation ('accept' or 'decline').
   */
  async respondToInvitation(invitationId, action) {
    return this.request(`/invitations/${invitationId}/respond`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action })
    });
  }

  // ----------------- FEATURE 2: Task Management -----------------

  /**
   * Get team tasks with optional filters.
   */
  async getTasks(teamId, { status, priority, assignee_id } = {}) {
    const params = new URLSearchParams();
    if (status && status !== 'All') params.append('status', status);
    if (priority && priority !== 'All') params.append('priority', priority);
    if (assignee_id && assignee_id !== 'All') params.append('assignee_id', assignee_id);
    const qs = params.toString() ? `?${params.toString()}` : '';
    return this.request(`/teams/${teamId}/tasks${qs}`);
  }

  /**
   * Create a new task.
   */
  async createTask(teamId, taskData) {
    return this.request(`/teams/${teamId}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Update full task details (team lead only).
   */
  async updateTask(teamId, taskId, taskData) {
    return this.request(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData)
    });
  }

  /**
   * Update task status (accessible by assigned developers and team leads).
   */
  async updateTaskStatus(teamId, taskId, status) {
    return this.request(`/teams/${teamId}/tasks/${taskId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
  }

  /**
   * Delete a task.
   */
  async deleteTask(teamId, taskId) {
    return this.request(`/teams/${teamId}/tasks/${taskId}`, {
      method: 'DELETE'
    });
  }

  // ----------------- FEATURE 3 & 4: In-App Notifications -----------------

  /**
   * Get in-app notifications for current user in team.
   */
  async getNotifications(teamId, unreadOnly = false) {
    const qs = unreadOnly ? '?unread_only=true' : '';
    return this.request(`/teams/${teamId}/notifications${qs}`);
  }

  /**
   * Mark a notification as read.
   */
  async markNotificationRead(teamId, notificationId) {
    return this.request(`/teams/${teamId}/notifications/${notificationId}/read`, {
      method: 'PATCH'
    });
  }

  /**
   * Mark all notifications as read for current user.
   */
  async markAllNotificationsRead(teamId) {
    return this.request(`/teams/${teamId}/notifications/read-all`, {
      method: 'POST'
    });
  }

  // ----------------- FEATURE 5: Team & Task Activities -----------------

  /**
   * Get audit log activity events for team or specific task.
   */
  async getTeamActivities(teamId, taskId = null) {
    const qs = taskId ? `?task_id=${encodeURIComponent(taskId)}` : '';
    return this.request(`/teams/${teamId}/activities${qs}`);
  }

  // ----------------- FEATURE 6: Task Comments & Blockers -----------------

  /**
   * Get comments and blocker logs for a task.
   */
  async getTaskComments(teamId, taskId) {
    return this.request(`/teams/${teamId}/tasks/${taskId}/comments`);
  }

  /**
   * Add a comment or report a blocker on a task.
   */
  async addTaskComment(teamId, taskId, { comment, is_blocker = false }) {
    return this.request(`/teams/${teamId}/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ comment, is_blocker })
    });
  }
}

export const apiService = new ApiService();
export default apiService;

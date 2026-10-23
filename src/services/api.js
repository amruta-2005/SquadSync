/**
 * Shared API service for SquadSync Frontend.
 * Communicates with the FastAPI backend specified in VITE_API_BASE_URL.
 * Supports graceful error detection, demo data fallback, and network diagnostics.
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
    const timeout = options.timeout || 8000;

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
        const connError = new Error(`Cannot connect to backend at ${this.baseUrl}. Please verify the server is running or switch to Demo Data.`);
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
   * Get all registered teams.
   */
  async getTeams(forceDemo = false) {
    if (forceDemo) {
      return { data: DEMO_TEAMS, isDemo: true };
    }
    try {
      const res = await this.request('/teams');
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        return { data: DEMO_TEAMS, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get team dashboard metrics and overview.
   */
  async getDashboard(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.dashboard || DEMO_DATA['team-alpha'].dashboard;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/dashboard`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.dashboard || DEMO_DATA['team-alpha'].dashboard;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get team members.
   */
  async getMembers(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.members || DEMO_DATA['team-alpha'].members;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/members`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.members || DEMO_DATA['team-alpha'].members;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get workload distribution.
   */
  async getWorkload(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.workload || DEMO_DATA['team-alpha'].workload;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/workload`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.workload || DEMO_DATA['team-alpha'].workload;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get code review analysis.
   */
  async getReviews(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.reviews || DEMO_DATA['team-alpha'].reviews;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/reviews`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.reviews || DEMO_DATA['team-alpha'].reviews;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get integration risk metrics and long-running branches.
   */
  async getIntegrationRisks(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.integration_risks || DEMO_DATA['team-alpha'].integration_risks;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/integration-risks`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.integration_risks || DEMO_DATA['team-alpha'].integration_risks;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get all detected collaboration risks for risk details page.
   */
  async getRisks(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.risks || DEMO_DATA['team-alpha'].risks;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/risks`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.risks || DEMO_DATA['team-alpha'].risks;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Get data sync status and validation logs.
   */
  async getSyncStatus(teamId, forceDemo = false) {
    if (forceDemo) {
      const data = DEMO_DATA[teamId]?.sync_status || DEMO_DATA['team-alpha'].sync_status;
      return { data, isDemo: true };
    }
    try {
      const res = await this.request(`/teams/${teamId}/sync-status`);
      return { data: res.data || res, isDemo: false };
    } catch (err) {
      if (forceDemo || err.isConnectionError) {
        const data = DEMO_DATA[teamId]?.sync_status || DEMO_DATA['team-alpha'].sync_status;
        return { data, isDemo: true, fallbackDueToError: err.message };
      }
      throw err;
    }
  }

  /**
   * Trigger GitHub & Task data synchronization on the backend.
   */
  async triggerSync(teamId, forceDemo = false) {
    if (forceDemo) {
      // Simulate backend sync delay and response
      await new Promise(resolve => setTimeout(resolve, 1200));
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
   * Note: As per security requirements, token is never sent or stored in browser.
   */
  async connectRepository(teamId, { repo_owner, repo_name, branch = 'main' }, forceDemo = false) {
    if (forceDemo) {
      await new Promise(resolve => setTimeout(resolve, 800));
      return {
        success: true,
        isDemo: true,
        message: `Successfully connected ${repo_owner}/${repo_name} (branch: ${branch})`,
        repository: `${repo_owner}/${repo_name}`
      };
    }
    return this.request(`/teams/${teamId}/github`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ repo_owner, repo_name, branch })
    });
  }

  /**
   * Upload CSV task-board file.
   */
  async importTasksCsv(teamId, file, forceDemo = false) {
    if (forceDemo) {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return {
        success: true,
        isDemo: true,
        message: `Imported tasks from ${file.name} (Simulated Demo Mode)`,
        rows_processed: 28,
        validation_warnings: 2
      };
    }

    const formData = new FormData();
    formData.append('file', file);

    const url = `${this.baseUrl}/teams/${teamId}/tasks/import`;
    const response = await fetch(url, {
      method: 'POST',
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
}

export const apiService = new ApiService();
export default apiService;

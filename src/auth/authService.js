/**
 * Authentication service for SquadSync Frontend.
 * Communicates with the FastAPI backend at /api/v1/auth/*.
 * Handles token storage (localStorage / sessionStorage) and session persistence.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const TOKEN_KEY = 'squadsync_auth_token';
const USER_KEY = 'squadsync_auth_user';

class AuthService {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  getToken() {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY) || null;
  }

  setToken(token, rememberMe = true) {
    if (rememberMe) {
      localStorage.setItem(TOKEN_KEY, token);
      sessionStorage.removeItem(TOKEN_KEY);
    } else {
      sessionStorage.setItem(TOKEN_KEY, token);
      localStorage.removeItem(TOKEN_KEY);
    }
  }

  clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    sessionStorage.removeItem(USER_KEY);
  }

  getStoredUser() {
    try {
      const u = localStorage.getItem(USER_KEY) || sessionStorage.getItem(USER_KEY);
      return u ? JSON.parse(u) : null;
    } catch {
      return null;
    }
  }

  setStoredUser(user, rememberMe = true) {
    const userStr = JSON.stringify(user);
    if (rememberMe) {
      localStorage.setItem(USER_KEY, userStr);
      sessionStorage.removeItem(USER_KEY);
    } else {
      sessionStorage.setItem(USER_KEY, userStr);
      localStorage.removeItem(USER_KEY);
    }
  }

  getAuthHeaders() {
    const token = this.getToken();
    if (!token) return {};
    return {
      'Authorization': `Bearer ${token}`
    };
  }

  async login(email, password, rememberMe = true) {
    const response = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        email: email.trim().toLowerCase(),
        password,
        remember_me: rememberMe
      })
    });

    if (!response.ok) {
      let errorMsg = 'Failed to authenticate.';
      try {
        const errJson = await response.json();
        if (errJson && (errJson.detail || errJson.message)) {
          errorMsg = errJson.detail || errJson.message;
        }
      } catch {
        // fallback
      }
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    if (data.token) {
      this.setToken(data.token, rememberMe);
      if (data.user) {
        this.setStoredUser(data.user, rememberMe);
      }
    }
    return data;
  }

  async register(name, email, password, role = 'Student Contributor') {
    const response = await fetch(`${this.baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        password,
        role
      })
    });

    if (!response.ok) {
      let errorMsg = 'Failed to create account.';
      try {
        const errJson = await response.json();
        if (errJson && (errJson.detail || errJson.message)) {
          errorMsg = errJson.detail || errJson.message;
        }
      } catch {
        // fallback
      }
      const error = new Error(errorMsg);
      error.status = response.status;
      throw error;
    }

    const data = await response.json();
    if (data.token) {
      this.setToken(data.token, false);
      if (data.user) {
        this.setStoredUser(data.user, false);
      }
    }
    return data;
  }

  async getMe() {
    const token = this.getToken();
    if (!token) return null;

    const response = await fetch(`${this.baseUrl}/auth/me`, {
      headers: {
        'Accept': 'application/json',
        ...this.getAuthHeaders()
      }
    });

    if (!response.ok) {
      // If unauthorized/expired, clean up client state
      if (response.status === 401 || response.status === 403) {
        this.clearToken();
      }
      return null;
    }

    const data = await response.json();
    if (data.user) {
      this.setStoredUser(data.user, !!localStorage.getItem(TOKEN_KEY));
    }
    return data.user;
  }

  async logout() {
    const token = this.getToken();
    try {
      if (token) {
        await fetch(`${this.baseUrl}/auth/logout`, {
          method: 'POST',
          headers: {
            ...this.getAuthHeaders()
          }
        });
      }
    } catch (err) {
      console.warn('Backend logout call error:', err);
    } finally {
      this.clearToken();
    }
  }
}

export const authService = new AuthService();
export default authService;

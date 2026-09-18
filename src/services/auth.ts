import { UserProfile, CloudSyncData, Website, Category, AppSettings } from '../types';

const TOKEN_KEY = 'winlaunch_auth_token';
const USER_KEY = 'winlaunch_user_profile';
const LAST_SYNC_KEY = 'winlaunch_last_synced';

function getCookie(name: string): string | null {
  try {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  } catch {
    return null;
  }
}

function setCookie(name: string, value: string, days = 365) {
  try {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
  } catch {
    // ignore in restricted environments
  }
}

function deleteCookie(name: string) {
  try {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax`;
  } catch {
    // ignore
  }
}

class AuthService {
  private currentUser: UserProfile | null = null;
  private token: string | null = null;
  private isSyncing = false;

  constructor() {
    this.token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
    const savedUser = sessionStorage.getItem(USER_KEY) || localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch {
        this.currentUser = null;
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  public getCurrentUser(): UserProfile | null {
    return this.currentUser;
  }

  public isLoggedIn(): boolean {
    return !!this.token && !!this.currentUser;
  }

  public getLastSyncedTime(): number | null {
    const val = sessionStorage.getItem(LAST_SYNC_KEY) || localStorage.getItem(LAST_SYNC_KEY);
    return val ? Number(val) : null;
  }

  private setSession(token: string, user: UserProfile, rememberMe = true) {
    this.token = token;
    this.currentUser = user;

    if (rememberMe) {
      try {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        localStorage.setItem('winlaunch_persistent_auth', 'true');
        setCookie(TOKEN_KEY, token, 365);
      } catch (e) {
        console.warn('localStorage write failed:', e);
      }
    } else {
      try {
        sessionStorage.setItem(TOKEN_KEY, token);
        sessionStorage.setItem(USER_KEY, JSON.stringify(user));
        // Ensure not in persistent storage
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        localStorage.removeItem('winlaunch_persistent_auth');
        setCookie(TOKEN_KEY, token, 1); // 1 day fallback session cookie
      } catch (e) {
        console.warn('sessionStorage write failed:', e);
      }
    }
  }

  private clearSession() {
    this.token = null;
    this.currentUser = null;
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(LAST_SYNC_KEY);
      localStorage.removeItem('winlaunch_persistent_auth');
      sessionStorage.removeItem(TOKEN_KEY);
      sessionStorage.removeItem(USER_KEY);
      sessionStorage.removeItem(LAST_SYNC_KEY);
    } catch {
      // storage clear safety
    }
    deleteCookie(TOKEN_KEY);
  }

  public async checkAuth(): Promise<UserProfile | null> {
    if (!this.token) {
      this.token = sessionStorage.getItem(TOKEN_KEY) || localStorage.getItem(TOKEN_KEY) || getCookie(TOKEN_KEY);
      if (!this.token) {
        return null;
      }
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch('/api/auth/me', {
        signal: controller.signal,
        headers: {
          'Authorization': `Bearer ${this.token}`
        }
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.user) {
          this.currentUser = data.user;
          const isPersistent = localStorage.getItem('winlaunch_persistent_auth') === 'true';
          if (isPersistent) {
            try {
              localStorage.setItem(USER_KEY, JSON.stringify(data.user));
              setCookie(TOKEN_KEY, this.token, 365);
            } catch {
              // ignore
            }
          } else {
            try {
              sessionStorage.setItem(USER_KEY, JSON.stringify(data.user));
            } catch {
              // ignore
            }
          }
          return data.user;
        }
      } else if (res.status === 401) {
        // Token explicitly revoked or invalid
        this.clearSession();
        return null;
      }
      
      // Keep persistent cached user profile on network or server hiccup
      return this.currentUser;
    } catch {
      // If offline or server restarting, return cached user profile
      return this.currentUser;
    }
  }

  public async register(
    name: string,
    email: string,
    password: string,
    initialData?: { websites: Website[]; categories: Category[]; settings: Partial<AppSettings> },
    rememberMe = true
  ): Promise<{ success: boolean; user?: UserProfile; syncData?: CloudSyncData; error?: string }> {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          initialData: initialData ? {
            ...initialData,
            device_name: 'Windows 11 (' + (navigator.platform || 'x64') + ')'
          } : undefined
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to register account' };
      }

      this.setSession(data.token, data.user, rememberMe);
      if (data.syncData?.last_synced_at) {
        try {
          if (rememberMe) {
            localStorage.setItem(LAST_SYNC_KEY, String(data.syncData.last_synced_at));
          } else {
            sessionStorage.setItem(LAST_SYNC_KEY, String(data.syncData.last_synced_at));
          }
        } catch {
          // ignore
        }
      }

      return {
        success: true,
        user: data.user,
        syncData: data.syncData
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during registration' };
    }
  }

  public async login(
    email: string,
    password: string,
    rememberMe = true
  ): Promise<{ success: boolean; user?: UserProfile; syncData?: CloudSyncData; error?: string }> {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Invalid credentials' };
      }

      this.setSession(data.token, data.user, rememberMe);
      if (data.syncData?.last_synced_at) {
        try {
          if (rememberMe) {
            localStorage.setItem(LAST_SYNC_KEY, String(data.syncData.last_synced_at));
          } else {
            sessionStorage.setItem(LAST_SYNC_KEY, String(data.syncData.last_synced_at));
          }
        } catch {
          // ignore
        }
      }

      return {
        success: true,
        user: data.user,
        syncData: data.syncData
      };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during login' };
    }
  }

  public async logout(): Promise<void> {
    if (this.token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${this.token}` }
        });
      } catch {
        // Ignore network errors on logout
      }
    }
    this.clearSession();
  }

  public async pullCloudData(): Promise<{
    success: boolean;
    syncData?: CloudSyncData;
    error?: string;
  }> {
    if (!this.token) {
      return { success: false, error: 'Not logged in' };
    }

    try {
      const res = await fetch('/api/sync/pull', {
        headers: { 'Authorization': `Bearer ${this.token}` }
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to pull cloud data' };
      }

      if (data.syncData?.last_synced_at) {
        localStorage.setItem(LAST_SYNC_KEY, String(data.syncData.last_synced_at));
      }

      return { success: true, syncData: data.syncData };
    } catch (err: any) {
      return { success: false, error: err.message || 'Network error during cloud sync' };
    }
  }

  public async pushCloudData(payload: {
    websites: Website[];
    categories: Category[];
    settings: Partial<AppSettings>;
  }): Promise<{ success: boolean; last_synced_at?: number; error?: string }> {
    if (!this.token) {
      return { success: false, error: 'Not logged in' };
    }

    if (this.isSyncing) {
      return { success: true };
    }

    this.isSyncing = true;
    try {
      const res = await fetch('/api/sync/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.token}`
        },
        body: JSON.stringify({
          ...payload,
          device_name: 'Windows Desktop (' + (navigator.platform || 'x64') + ')'
        })
      });

      const data = await res.json();
      this.isSyncing = false;

      if (!res.ok || !data.success) {
        return { success: false, error: data.error || 'Failed to push cloud data' };
      }

      if (data.last_synced_at) {
        localStorage.setItem(LAST_SYNC_KEY, String(data.last_synced_at));
      }

      return { success: true, last_synced_at: data.last_synced_at };
    } catch (err: any) {
      this.isSyncing = false;
      return { success: false, error: err.message || 'Network error during cloud backup' };
    }
  }
}

export const authService = new AuthService();

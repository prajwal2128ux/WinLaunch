/**
 * WinLaunch Centralized API Configuration
 * 
 * Automatically resolves the correct backend API URL across all environments:
 * 1. Packaged Windows Electron App (.exe) -> Uses active server URL provided by Electron (e.g. http://127.0.0.1:3000)
 * 2. File protocol fallback -> http://127.0.0.1:3000 (prevents "Failed to fetch" on file:/// URLs)
 * 3. Browser Preview & Production Web -> Clean relative paths (/api/...)
 */

export function getApiBaseUrl(): string {
  if (typeof window !== 'undefined') {
    // 1. Check if Electron preload exposed the active API URL
    const electronApi = (window as any).electronAPI;
    if (electronApi?.apiUrl && typeof electronApi.apiUrl === 'string' && electronApi.apiUrl.trim()) {
      return electronApi.apiUrl.replace(/\/+$/, '');
    }

    // 2. Check if a global override is present
    if ((window as any).__WINLAUNCH_API_URL__) {
      return String((window as any).__WINLAUNCH_API_URL__).replace(/\/+$/, '');
    }

    // 3. Prevent fatal file:/// protocol fetch errors
    if (window.location.protocol === 'file:') {
      return 'http://127.0.0.1:3000';
    }
  }

  // 4. Default in browser: empty string enables standard origin-relative URLs
  return '';
}

/**
 * Builds a normalized, fully qualified or origin-relative API endpoint URL.
 * @example buildApiUrl('/api/auth/login') -> 'http://127.0.0.1:3000/api/auth/login' (in Electron) or '/api/auth/login' (in web)
 */
export function buildApiUrl(endpoint: string): string {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
  return base ? `${base}${cleanEndpoint}` : cleanEndpoint;
}

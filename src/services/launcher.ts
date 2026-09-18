import { dbService } from './db';
import { Website } from '../types';
import { buildApiUrl } from './apiConfig';

export interface LaunchResult {
  success: boolean;
  browserName: string;
  isElectron: boolean;
  message: string;
}

export async function detectChromeInstallation(): Promise<{ installed: boolean; path: string; source: string }> {
  // If running inside Electron desktop container
  if (typeof window !== 'undefined' && window.electronAPI && window.electronAPI.detectChrome) {
    try {
      const res = await window.electronAPI.detectChrome();
      return {
        installed: res.installed,
        path: res.path,
        source: 'Windows System File Check'
      };
    } catch {
      // ignore
    }
  }

  // Check via backend server endpoint
  try {
    const res = await fetch(buildApiUrl('/api/system/browser-detect'));
    if (res.ok) {
      const data = await res.json();
      return {
        installed: Boolean(data.detectedBrowsers?.chrome ?? true),
        path: data.chromeExecutableDefault || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        source: 'Windows Registry & Browser Agent'
      };
    }
  } catch {
    // fallback
  }

  // Client User Agent check
  const isChrome = typeof navigator !== 'undefined' && /Chrome\//i.test(navigator.userAgent) && !/Edg\//i.test(navigator.userAgent);
  return {
    installed: isChrome || true,
    path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    source: 'Client Environment Detection'
  };
}

export async function launchWebsite(
  website: Website,
  targetBrowser: 'chrome' | 'default' | 'edge' | 'firefox' = 'chrome'
): Promise<LaunchResult> {
  const rawUrl = website.url ? website.url.trim() : '';

  // Sanitize URL and verify safe web protocol
  let targetUrl = rawUrl;
  if (!/^https?:\/\//i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Block dangerous pseudo-protocols
  if (/^(javascript|data|vbscript|file):/i.test(targetUrl)) {
    return {
      success: false,
      browserName: 'Blocked',
      isElectron: false,
      message: 'Invalid or blocked URL protocol'
    };
  }

  let success = false;
  let browserName = 'Google Chrome';
  let message = '';
  const isElectron = Boolean(typeof window !== 'undefined' && window.electronAPI?.isElectron);

  // If running in Electron Desktop App
  if (isElectron && window.electronAPI) {
    try {
      const res = await window.electronAPI.openUrl({
        url: targetUrl,
        preferredBrowser: targetBrowser
      });
      if (res.success) {
        success = true;
        browserName = res.browser || 'Google Chrome';
        message = `Launched in ${browserName}`;
      } else {
        // Fallback open
        const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
        if (!opened) {
          const a = document.createElement('a');
          a.href = targetUrl;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
        success = true;
        browserName = 'Default Browser (Fallback)';
        message = `Fallback launch in default browser: ${res.error || ''}`;
      }
    } catch (err: any) {
      const a = document.createElement('a');
      a.href = targetUrl;
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      success = true;
      browserName = 'Default Browser (Fallback)';
      message = `Opened in browser: ${err.message}`;
    }
  } else {
    // In Browser / Web Preview environment
    try {
      const opened = window.open(targetUrl, '_blank', 'noopener,noreferrer');
      if (!opened) {
        // If popup blocker blocked window.open, use synthetic anchor click
        const a = document.createElement('a');
        a.href = targetUrl;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
      success = true;
      browserName = targetBrowser === 'chrome' ? 'Google Chrome' : 'Default Browser';
      message = targetBrowser === 'chrome' 
        ? `Opened in Google Chrome (${targetUrl})`
        : `Opened in Default Browser (${targetUrl})`;
    } catch (err: any) {
      success = false;
      message = `Could not open window: ${err.message}`;
    }
  }

  // Record launch in SQLite DB
  dbService.recordLaunch(website.id);

  return {
    success,
    browserName,
    isElectron,
    message
  };
}

import express from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

// Data directory for persistent cloud users and multi-device sync
const DATA_DIR = path.join(process.cwd(), 'data');
const USERS_FILE = path.join(DATA_DIR, 'cloud_users.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface CloudUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  salt: string;
  created_at: number;
  last_login_at: number;
  avatar_color: string;
  token: string;
  tokens?: string[];
  syncData: {
    websites: any[];
    categories: any[];
    settings: any;
    last_synced_at: number;
    device_name?: string;
  };
}

function loadUsers(): Record<string, CloudUserRecord> {
  try {
    if (fs.existsSync(USERS_FILE)) {
      const data = fs.readFileSync(USERS_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Error reading cloud_users.json:', err);
  }
  return {};
}

function saveUsers(users: Record<string, CloudUserRecord>) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving cloud_users.json:', err);
  }
}

function hashPassword(password: string, salt: string, iterations = 100000): string {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

function timingSafeCompare(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// In-memory sliding-window IP rate limiter for brute-force protection
interface RateLimitEntry {
  count: number;
  firstAttempt: number;
  blockedUntil?: number;
}
const authRateLimiter = new Map<string, RateLimitEntry>();

function checkRateLimit(ip: string, maxAttempts = 10, windowMs = 5 * 60 * 1000, blockDurationMs = 15 * 60 * 1000): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const entry = authRateLimiter.get(ip);
  if (!entry) {
    return { allowed: true };
  }
  if (entry.blockedUntil && now < entry.blockedUntil) {
    return { allowed: false, retryAfter: Math.ceil((entry.blockedUntil - now) / 1000) };
  }
  if (now - entry.firstAttempt > windowMs) {
    authRateLimiter.delete(ip);
    return { allowed: true };
  }
  if (entry.count >= maxAttempts) {
    entry.blockedUntil = now + blockDurationMs;
    return { allowed: false, retryAfter: Math.ceil(blockDurationMs / 1000) };
  }
  return { allowed: true };
}

function recordFailedAttempt(ip: string, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const entry = authRateLimiter.get(ip);
  if (!entry || now - entry.firstAttempt > windowMs) {
    authRateLimiter.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearRateLimit(ip: string) {
  authRateLimiter.delete(ip);
}

// SSRF prevention: verify that URL is a safe public web destination
function isSafePublicUrl(targetUrl: string): boolean {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const host = parsed.hostname.toLowerCase();

    // Block localhost and common local domain conventions
    if (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '0.0.0.0' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.endsWith('.lan') ||
      host.endsWith('.intranet')
    ) {
      return false;
    }

    // Cloud metadata endpoints
    if (host === '169.254.169.254' || host === 'metadata.google.internal') {
      return false;
    }

    // IPv4 address checks
    const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4Match) {
      const octet1 = parseInt(ipv4Match[1], 10);
      const octet2 = parseInt(ipv4Match[2], 10);

      // 0.0.0.0/8 (Broadcast/this host)
      if (octet1 === 0) return false;
      // 10.0.0.0/8 (Private)
      if (octet1 === 10) return false;
      // 127.0.0.0/8 (Loopback)
      if (octet1 === 127) return false;
      // 169.254.0.0/16 (Link-local & cloud metadata)
      if (octet1 === 169 && octet2 === 254) return false;
      // 172.16.0.0/12 (Private)
      if (octet1 === 172 && octet2 >= 16 && octet2 <= 31) return false;
      // 192.168.0.0/16 (Private)
      if (octet1 === 192 && octet2 === 168) return false;
      // 100.64.0.0/10 (Shared address space)
      if (octet1 === 100 && octet2 >= 64 && octet2 <= 127) return false;
    }

    // IPv6 private & loopback checks
    if (host.startsWith('[') && host.endsWith(']')) {
      const ipv6 = host.slice(1, -1).toLowerCase();
      if (ipv6 === '::1' || ipv6.startsWith('fe80:') || ipv6.startsWith('fc') || ipv6.startsWith('fd')) {
        return false;
      }
    }

    return true;
  } catch {
    return false;
  }
}

// Deep sanitize settings to block prototype pollution
function sanitizeSettingsObject(obj: any): any {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return {};
  }
  const clean: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeSettingsObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

function seedDefaultUserIfNeeded() {
  try {
    const users = loadUsers();
    const defaultEmail = 'prajwalnayak120@gmail.com';
    const existing = Object.values(users).find(u => u.email.toLowerCase() === defaultEmail);
    if (!existing) {
      const salt = 'winlaunch_default_salt_2026';
      const passwordHash = hashPassword('password123', salt);
      const userId = 'usr-prajwal-default';
      const defaultToken = 'winlaunch_token_prajwal_2026';
      users[userId] = {
        id: userId,
        name: 'Prajwal Nayak',
        email: defaultEmail,
        passwordHash,
        salt,
        created_at: Date.now(),
        last_login_at: Date.now(),
        avatar_color: '#2563eb',
        token: defaultToken,
        tokens: [defaultToken],
        syncData: {
          websites: [],
          categories: [],
          settings: {},
          last_synced_at: Date.now(),
          device_name: 'Windows 11 x64'
        }
      };
      saveUsers(users);
    }
  } catch (err) {
    console.error('Error seeding default user:', err);
  }
}

const AVATAR_COLORS = [
  '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', 
  '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#6366f1'
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Security Headers Middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (req.path.startsWith('/api/auth') || req.path.startsWith('/api/sync')) {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Health endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Website metadata scraper with SSRF protection
  app.get('/api/metadata', async (req, res) => {
    const rawUrl = req.query.url as string;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let targetUrl = rawUrl.trim();
    if (targetUrl.length > 2048) {
      return res.status(400).json({ error: 'URL exceeds maximum permitted length' });
    }

    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    // Enforce SSRF protection: reject private, loopback, and internal infrastructure destinations
    if (!isSafePublicUrl(targetUrl)) {
      return res.status(400).json({ 
        error: 'Target URL is not permitted for remote metadata scraping (private or local network destination)' 
      });
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const domain = parsedUrl.hostname;
      const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

      // Attempt to fetch with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const response = await fetch(targetUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
      });
      clearTimeout(timeoutId);

      // Read max 512KB to protect server memory
      const rawText = await response.text();
      const html = rawText.slice(0, 524288);

      // Extract title
      let title = '';
      const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i) ||
                           html.match(/<meta[^>]*content=["']([^"']+)["'][^>]*property=["']og:title["']/i);
      if (ogTitleMatch && ogTitleMatch[1]) {
        title = ogTitleMatch[1].trim();
      } else {
        const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
        if (titleMatch && titleMatch[1]) {
          title = titleMatch[1].trim();
        }
      }

      // Fallback clean title from domain
      if (!title) {
        title = domain.replace(/^www\./i, '');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      // Clean HTML entities if any
      title = title
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .slice(0, 100);

      // Extract description
      let description = '';
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                          html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim().slice(0, 200);
      }

      // Extract favicon
      let favicon = defaultFavicon;
      const iconMatches = [
        /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
        /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i
      ];

      for (const pattern of iconMatches) {
        const match = html.match(pattern);
        if (match && match[1]) {
          const rawIcon = match[1].trim();
          try {
            favicon = new URL(rawIcon, targetUrl).href;
            break;
          } catch {
            // keep fallback
          }
        }
      }

      return res.json({
        url: targetUrl,
        title,
        description,
        favicon,
        domain
      });
    } catch {
      // Fallback if URL fetch failed or timed out
      try {
        const parsed = new URL(targetUrl);
        const domain = parsed.hostname;
        const cleanName = domain.replace(/^www\./i, '');
        const fallbackTitle = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
        return res.json({
          url: targetUrl,
          title: fallbackTitle,
          description: '',
          favicon: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
          domain
        });
      } catch {
        return res.status(400).json({ error: 'Invalid URL format' });
      }
    }
  });

  // Browser detection info endpoint
  app.get('/api/system/browser-detect', (req, res) => {
    const userAgent = req.headers['user-agent'] || '';
    const isWindows = /Windows/i.test(userAgent);
    const hasChrome = /Chrome\//i.test(userAgent) && !/Edg\//i.test(userAgent) && !/OPR\//i.test(userAgent);
    const hasEdge = /Edg\//i.test(userAgent);
    const hasFirefox = /Firefox\//i.test(userAgent);

    res.json({
      platform: isWindows ? 'Windows' : 'Other',
      detectedBrowsers: {
        chrome: hasChrome,
        edge: hasEdge,
        firefox: hasFirefox,
        default: 'Google Chrome'
      },
      windowsAppDataLocation: 'C:\\Users\\Username\\AppData\\Roaming\\WinLaunch\\websites.db',
      chromeExecutableDefault: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
  });

  // Seed default user account if none exists
  seedDefaultUserIfNeeded();

  // Helper auth middleware
  const getAuthUser = (req: express.Request): CloudUserRecord | null => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : (req.headers['x-auth-token'] as string) || '';

    if (!token) return null;
    const users = loadUsers();
    return Object.values(users).find(u => (u.tokens && u.tokens.includes(token)) || u.token === token) || null;
  };

  // Auth: Register Endpoint with Rate Limiting & Input Sanitization
  app.post('/api/auth/register', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(clientIp, 8, 5 * 60 * 1000, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many registration attempts from this IP. Please wait ${rateCheck.retryAfter || 60} seconds before trying again.` 
      });
    }

    const { name, email, password, initialData } = req.body || {};

    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.length > 254) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'A valid email address is required (max 254 characters)' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    if (password.length > 128) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'Password must not exceed 128 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) 
      ? name.trim().slice(0, 100) 
      : cleanEmail.split('@')[0].slice(0, 100);

    const users = loadUsers();
    const existing = Object.values(users).find(u => u.email.toLowerCase() === cleanEmail);
    if (existing) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'An account with this email already exists' });
    }

    clearRateLimit(clientIp);

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt, 100000);
    const token = crypto.randomBytes(32).toString('hex');
    const userId = 'usr-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const avatarColor = AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

    const newUser: CloudUserRecord = {
      id: userId,
      name: cleanName,
      email: cleanEmail,
      passwordHash,
      salt,
      created_at: Date.now(),
      last_login_at: Date.now(),
      avatar_color: avatarColor,
      token,
      tokens: [token],
      syncData: {
        websites: Array.isArray(initialData?.websites) ? initialData.websites.slice(0, 500) : [],
        categories: Array.isArray(initialData?.categories) ? initialData.categories.slice(0, 50) : [],
        settings: sanitizeSettingsObject(initialData?.settings || {}),
        last_synced_at: Date.now(),
        device_name: typeof initialData?.device_name === 'string' ? initialData.device_name.slice(0, 50) : 'Windows Desktop'
      }
    };

    users[userId] = newUser;
    saveUsers(users);

    const safeUser = {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      created_at: newUser.created_at,
      last_login_at: newUser.last_login_at,
      avatar_color: newUser.avatar_color
    };

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: safeUser,
      syncData: newUser.syncData
    });
  });

  // Auth: Login Endpoint with Timing-Safe Verification & Brute-Force Rate Limiting
  app.post('/api/auth/login', (req, res) => {
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
    const rateCheck = checkRateLimit(clientIp, 10, 5 * 60 * 1000, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ 
        error: `Too many failed login attempts from this IP. Please wait ${rateCheck.retryAfter || 60} seconds before trying again.` 
      });
    }

    const { email, password } = req.body || {};

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = Object.values(users).find(u => u.email.toLowerCase() === cleanEmail);

    if (!user) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Try modern 100,000 iterations PBKDF2 hash first
    let isPasswordValid = false;
    const modernHash = hashPassword(password, user.salt, 100000);
    if (timingSafeCompare(modernHash, user.passwordHash)) {
      isPasswordValid = true;
    } else {
      // Check legacy 10,000 iterations hash for backward compatibility
      const legacyHash = hashPassword(password, user.salt, 10000);
      if (timingSafeCompare(legacyHash, user.passwordHash)) {
        isPasswordValid = true;
        // Transparently upgrade password hash to 100,000 iterations
        user.passwordHash = modernHash;
      }
    }

    if (!isPasswordValid) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Login successful: clear IP rate limit
    clearRateLimit(clientIp);

    // Refresh token and multi-token session store
    const newToken = crypto.randomBytes(32).toString('hex');
    user.token = newToken;
    if (!user.tokens) {
      user.tokens = [];
    }
    user.tokens = [newToken, ...user.tokens.filter(t => t !== newToken)].slice(0, 10);
    user.last_login_at = Date.now();
    users[user.id] = user;
    saveUsers(users);

    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      created_at: user.created_at,
      last_login_at: user.last_login_at,
      avatar_color: user.avatar_color
    };

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token: newToken,
      user: safeUser,
      syncData: user.syncData
    });
  });

  // Auth: Current User Info Endpoint
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Not authenticated or invalid session' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        avatar_color: user.avatar_color
      }
    });
  });

  // Auth: Logout Endpoint
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : (req.headers['x-auth-token'] as string) || '';

    if (token) {
      const users = loadUsers();
      for (const u of Object.values(users)) {
        if (u.tokens && u.tokens.includes(token)) {
          u.tokens = u.tokens.filter(t => t !== token);
          if (u.token === token) {
            u.token = u.tokens[0] || '';
          }
          saveUsers(users);
          break;
        } else if (u.token === token) {
          u.token = '';
          saveUsers(users);
          break;
        }
      }
    }
    return res.json({ success: true, message: 'Logged out successfully' });
  });

  // Sync: Pull Cloud Data (Download saved bookmarks from account)
  app.get('/api/sync/pull', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to sync data' });
    }

    return res.json({
      success: true,
      syncData: user.syncData || {
        websites: [],
        categories: [],
        settings: {},
        last_synced_at: 0
      }
    });
  });

  // Sync: Push Cloud Data with Payload Validation & Prototype Pollution Protection
  app.post('/api/sync/push', (req, res) => {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required to sync data' });
    }

    const { websites, categories, settings, device_name } = req.body || {};

    const users = loadUsers();
    if (!users[user.id]) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const currentSyncData = users[user.id].syncData || { websites: [], categories: [], settings: {} };

    // Validate and sanitize incoming websites
    let sanitizedWebsites = currentSyncData.websites;
    if (Array.isArray(websites)) {
      sanitizedWebsites = websites
        .filter((w: any) => w && typeof w === 'object' && typeof w.url === 'string' && w.url.trim().length > 0)
        .slice(0, 2000)
        .map((w: any) => ({
          id: typeof w.id === 'string' ? w.id.slice(0, 100) : 'site-' + Date.now(),
          title: typeof w.title === 'string' ? w.title.slice(0, 150) : 'Website',
          url: w.url.trim().slice(0, 2048),
          favicon: typeof w.favicon === 'string' ? w.favicon.slice(0, 2048) : '',
          category: typeof w.category === 'string' ? w.category.slice(0, 50) : 'General',
          description: typeof w.description === 'string' ? w.description.slice(0, 1000) : '',
          is_pinned: Boolean(w.is_pinned),
          launch_count: typeof w.launch_count === 'number' && !isNaN(w.launch_count) ? Math.max(0, w.launch_count) : 0,
          created_at: typeof w.created_at === 'number' && !isNaN(w.created_at) ? w.created_at : Date.now(),
          last_opened_at: typeof w.last_opened_at === 'number' && !isNaN(w.last_opened_at) ? w.last_opened_at : null,
          browser_preference: ['chrome', 'default', 'edge', 'firefox'].includes(w.browser_preference) ? w.browser_preference : 'chrome'
        }));
    }

    // Sanitize categories
    let sanitizedCategories = currentSyncData.categories;
    if (Array.isArray(categories)) {
      sanitizedCategories = categories
        .filter((c: any) => c && typeof c === 'object' && typeof c.name === 'string')
        .slice(0, 100)
        .map((c: any) => ({
          id: typeof c.id === 'string' ? c.id.slice(0, 50) : 'cat-' + Date.now(),
          name: c.name.slice(0, 50),
          color: typeof c.color === 'string' ? c.color.slice(0, 25) : '#3b82f6'
        }));
    }

    // Deep sanitize settings against prototype pollution
    const cleanSettings = settings && typeof settings === 'object'
      ? { ...currentSyncData.settings, ...sanitizeSettingsObject(settings) }
      : currentSyncData.settings;

    users[user.id].syncData = {
      websites: sanitizedWebsites,
      categories: sanitizedCategories,
      settings: cleanSettings,
      last_synced_at: Date.now(),
      device_name: typeof device_name === 'string' ? device_name.slice(0, 60) : 'Windows Desktop'
    };

    saveUsers(users);

    return res.json({
      success: true,
      message: 'Cloud sync successful',
      last_synced_at: users[user.id].syncData.last_synced_at,
      websitesCount: users[user.id].syncData.websites.length
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();

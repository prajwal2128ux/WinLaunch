/**
 * WinLaunch Embedded Backend Server for Electron
 * 
 * Automatically starts in production and packaged Electron (.exe),
 * providing local & cloud-synced accounts, authentication, website metadata scraping,
 * and static asset serving with persistent storage in %APPDATA%\WinLaunch\data.
 */

const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let activeServer = null;
let activeSockets = new Set();

// Password hashing & timing-safe compare
function hashPassword(password, salt, iterations = 100000) {
  return crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
}

function timingSafeCompare(a, b) {
  try {
    const bufA = Buffer.from(a, 'hex');
    const bufB = Buffer.from(b, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

// In-memory rate limiter
const authRateLimiter = new Map();
function checkRateLimit(ip, maxAttempts = 12, windowMs = 5 * 60 * 1000, blockDurationMs = 15 * 60 * 1000) {
  const now = Date.now();
  const entry = authRateLimiter.get(ip);
  if (!entry) return { allowed: true };
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

function recordFailedAttempt(ip, windowMs = 5 * 60 * 1000) {
  const now = Date.now();
  const entry = authRateLimiter.get(ip);
  if (!entry || now - entry.firstAttempt > windowMs) {
    authRateLimiter.set(ip, { count: 1, firstAttempt: now });
  } else {
    entry.count += 1;
  }
}

function clearRateLimit(ip) {
  authRateLimiter.delete(ip);
}

// SSRF prevention for metadata scraping
function isSafePublicUrl(targetUrl) {
  try {
    const parsed = new URL(targetUrl);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' ||
      host.endsWith('.local') || host.endsWith('.internal') || host.endsWith('.lan') || host.endsWith('.intranet') ||
      host === '169.254.169.254' || host === 'metadata.google.internal'
    ) {
      return false;
    }
    const ipv4 = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
    if (ipv4) {
      const o1 = parseInt(ipv4[1], 10);
      const o2 = parseInt(ipv4[2], 10);
      if (o1 === 0 || o1 === 10 || o1 === 127) return false;
      if (o1 === 169 && o2 === 254) return false;
      if (o1 === 172 && o2 >= 16 && o2 <= 31) return false;
      if (o1 === 192 && o2 === 168) return false;
      if (o1 === 100 && o2 >= 64 && o2 <= 127) return false;
    }
    return true;
  } catch {
    return false;
  }
}

// Deep sanitize settings against prototype pollution
function sanitizeSettingsObject(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return {};
  const clean = {};
  for (const [key, val] of Object.entries(obj)) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') continue;
    if (val && typeof val === 'object' && !Array.isArray(val)) {
      clean[key] = sanitizeSettingsObject(val);
    } else {
      clean[key] = val;
    }
  }
  return clean;
}

const AVATAR_COLORS = [
  '#2563eb', '#3b82f6', '#0ea5e9', '#06b6d4', '#10b981', 
  '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#6366f1'
];

/**
 * Creates the Express application with all WinLaunch backend routes.
 */
function createBackendApp(options = {}) {
  const dataDir = options.dataDir || process.env.WINLAUNCH_DATA_DIR || path.join(process.cwd(), 'data');
  const distPath = options.distPath || process.env.WINLAUNCH_DIST_PATH || path.join(__dirname, '../dist');
  const usersFile = path.join(dataDir, 'cloud_users.json');

  if (!fs.existsSync(dataDir)) {
    try {
      fs.mkdirSync(dataDir, { recursive: true });
    } catch (e) {
      console.error('[WinLaunch Server] Error creating data directory:', e);
    }
  }

  function loadUsers() {
    try {
      if (fs.existsSync(usersFile)) {
        return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
      }
    } catch (err) {
      console.error('[WinLaunch Server] Error reading cloud_users.json:', err);
    }
    return {};
  }

  function saveUsers(users) {
    try {
      fs.writeFileSync(usersFile, JSON.stringify(users, null, 2), 'utf-8');
    } catch (err) {
      console.error('[WinLaunch Server] Error saving cloud_users.json:', err);
    }
  }

  // Seed default account
  function seedDefaultUser() {
    try {
      const users = loadUsers();
      const defaultEmail = 'demo@winlaunch.local';
      const existing = Object.values(users).find(u => u.email && u.email.toLowerCase() === defaultEmail);
      if (!existing) {
        const salt = 'winlaunch_demo_salt_2026';
        const passwordHash = hashPassword('demo1234', salt);
        const userId = 'usr-demo-default';
        const defaultToken = 'winlaunch_token_demo_2026';
        users[userId] = {
          id: userId,
          name: 'Demo User',
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
    } catch (e) {
      console.error('[WinLaunch Server] Error seeding default user:', e);
    }
  }

  seedDefaultUser();

  const app = express();

  // Permissive CORS for Electron & local ports
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    } else {
      res.setHeader('Access-Control-Allow-Origin', '*');
    }
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Auth-Token');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

    if (req.method === 'OPTIONS') {
      return res.sendStatus(204);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));

  // Helper auth check
  function getAuthUser(req) {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : (req.headers['x-auth-token'] || '');

    if (!token) return null;
    const users = loadUsers();
    return Object.values(users).find(u => (u.tokens && u.tokens.includes(token)) || u.token === token) || null;
  }

  // 1. Health check
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'WinLaunch Backend',
      version: '1.0.0',
      time: new Date().toISOString(),
      appData: dataDir
    });
  });

  // 2. Metadata scraper
  app.get('/api/metadata', async (req, res) => {
    const rawUrl = req.query.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return res.status(400).json({ error: 'URL parameter is required' });
    }

    let targetUrl = rawUrl.trim();
    if (targetUrl.length > 2048) {
      return res.status(400).json({ error: 'URL exceeds maximum length' });
    }
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    if (!isSafePublicUrl(targetUrl)) {
      return res.status(400).json({ error: 'Target URL is not permitted for remote scraping' });
    }

    try {
      const parsedUrl = new URL(targetUrl);
      const domain = parsedUrl.hostname;
      const defaultFavicon = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;

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

      const rawText = await response.text();
      const html = rawText.slice(0, 524288);

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

      if (!title) {
        title = domain.replace(/^www\./i, '');
        title = title.charAt(0).toUpperCase() + title.slice(1);
      }

      title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").slice(0, 100);

      let description = '';
      const descMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                        html.match(/<meta[^>]*property=["']og:description["'][^>]*content=["']([^"']+)["']/i);
      if (descMatch && descMatch[1]) {
        description = descMatch[1].trim().slice(0, 200);
      }

      let favicon = defaultFavicon;
      const iconMatches = [
        /<link[^>]*rel=["'](?:shortcut )?icon["'][^>]*href=["']([^"']+)["']/i,
        /<link[^>]*href=["']([^"']+)["'][^>]*rel=["'](?:shortcut )?icon["']/i,
        /<link[^>]*rel=["']apple-touch-icon(?:-precomposed)?["'][^>]*href=["']([^"']+)["']/i
      ];

      for (const pattern of iconMatches) {
        const match = html.match(pattern);
        if (match && match[1]) {
          try {
            favicon = new URL(match[1].trim(), targetUrl).href;
            break;
          } catch {
            // keep fallback
          }
        }
      }

      return res.json({ url: targetUrl, title, description, favicon, domain });
    } catch {
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

  // 3. System browser detect
  app.get('/api/system/browser-detect', (req, res) => {
    res.json({
      platform: 'Windows',
      detectedBrowsers: { chrome: true, edge: true, firefox: true, default: 'Google Chrome' },
      windowsAppDataLocation: path.join(dataDir, 'websites.db'),
      chromeExecutableDefault: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
    });
  });

  // 4. Register
  app.post('/api/auth/register', (req, res) => {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp, 15, 5 * 60 * 1000, 10 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many registration attempts. Please wait ${rateCheck.retryAfter || 60} seconds.` });
    }

    const { name, email, password, initialData } = req.body || {};
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!email || typeof email !== 'string' || !emailRegex.test(email.trim()) || email.length > 254) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'A valid email address is required' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name && typeof name === 'string' && name.trim()) ? name.trim().slice(0, 100) : cleanEmail.split('@')[0].slice(0, 100);

    const users = loadUsers();
    const existing = Object.values(users).find(u => u.email && u.email.toLowerCase() === cleanEmail);
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

    const newUser = {
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

    return res.status(201).json({
      success: true,
      message: 'Account created successfully',
      token,
      user: { id: newUser.id, name: newUser.name, email: newUser.email, created_at: newUser.created_at, last_login_at: newUser.last_login_at, avatar_color: newUser.avatar_color },
      syncData: newUser.syncData
    });
  });

  // 5. Login
  app.post('/api/auth/login', (req, res) => {
    const clientIp = req.socket.remoteAddress || '127.0.0.1';
    const rateCheck = checkRateLimit(clientIp, 20, 5 * 60 * 1000, 15 * 60 * 1000);
    if (!rateCheck.allowed) {
      return res.status(429).json({ error: `Too many login attempts. Please wait ${rateCheck.retryAfter || 60} seconds.` });
    }

    const { email, password } = req.body || {};
    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      recordFailedAttempt(clientIp);
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const users = loadUsers();
    const user = Object.values(users).find(u => u.email && u.email.toLowerCase() === cleanEmail);
    if (!user) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    let isPasswordValid = false;
    const modernHash = hashPassword(password, user.salt, 100000);
    if (timingSafeCompare(modernHash, user.passwordHash)) {
      isPasswordValid = true;
    } else {
      const legacyHash = hashPassword(password, user.salt, 10000);
      if (timingSafeCompare(legacyHash, user.passwordHash)) {
        isPasswordValid = true;
        user.passwordHash = modernHash;
      }
    }

    if (!isPasswordValid) {
      recordFailedAttempt(clientIp);
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    clearRateLimit(clientIp);

    const newToken = crypto.randomBytes(32).toString('hex');
    user.token = newToken;
    if (!user.tokens) user.tokens = [];
    user.tokens = [newToken, ...user.tokens.filter(t => t !== newToken)].slice(0, 10);
    user.last_login_at = Date.now();
    users[user.id] = user;
    saveUsers(users);

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token: newToken,
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at, last_login_at: user.last_login_at, avatar_color: user.avatar_color },
      syncData: user.syncData
    });
  });

  // 6. Current user / me
  app.get('/api/auth/me', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Not authenticated or invalid session' });
    return res.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at, last_login_at: user.last_login_at, avatar_color: user.avatar_color }
    });
  });

  // 7. Logout
  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.substring(7) : (req.headers['x-auth-token'] || '');
    if (token) {
      const users = loadUsers();
      for (const u of Object.values(users)) {
        if (u.tokens && u.tokens.includes(token)) {
          u.tokens = u.tokens.filter(t => t !== token);
          if (u.token === token) u.token = u.tokens[0] || '';
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

  // 8. Pull Cloud Data
  app.get('/api/sync/pull', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required to sync data' });
    return res.json({
      success: true,
      syncData: user.syncData || { websites: [], categories: [], settings: {}, last_synced_at: 0 }
    });
  });

  // 9. Push Cloud Data
  app.post('/api/sync/push', (req, res) => {
    const user = getAuthUser(req);
    if (!user) return res.status(401).json({ error: 'Authentication required to sync data' });

    const { websites, categories, settings, device_name } = req.body || {};
    const users = loadUsers();
    if (!users[user.id]) return res.status(404).json({ error: 'User record not found' });

    const currentSyncData = users[user.id].syncData || { websites: [], categories: [], settings: {} };

    let sanitizedWebsites = currentSyncData.websites;
    if (Array.isArray(websites)) {
      sanitizedWebsites = websites
        .filter(w => w && typeof w === 'object' && typeof w.url === 'string' && w.url.trim().length > 0)
        .slice(0, 2000)
        .map(w => ({
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

    let sanitizedCategories = currentSyncData.categories;
    if (Array.isArray(categories)) {
      sanitizedCategories = categories
        .filter(c => c && typeof c === 'object' && typeof c.name === 'string')
        .slice(0, 100)
        .map(c => ({
          id: typeof c.id === 'string' ? c.id.slice(0, 50) : 'cat-' + Date.now(),
          name: c.name.slice(0, 50),
          color: typeof c.color === 'string' ? c.color.slice(0, 25) : '#3b82f6'
        }));
    }

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

  // Explicit route for SQLite WebAssembly binary with application/wasm MIME
  app.get('/sql-wasm.wasm', (_req, res) => {
    const candidatePaths = [
      path.join(distPath, 'sql-wasm.wasm'),
      path.join(process.cwd(), 'dist', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'public', 'sql-wasm.wasm'),
      path.join(process.cwd(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm')
    ];
    for (const p of candidatePaths) {
      if (fs.existsSync(p)) {
        res.setHeader('Content-Type', 'application/wasm');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        return res.sendFile(p);
      }
    }
    return res.status(404).send('sql-wasm.wasm not found');
  });

  // Serve static UI bundle if dist exists
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send('WinLaunch UI bundle not found. Please build the frontend first.');
      }
    });
  }

  return app;
}

/**
 * Checks if a server is currently running and healthy at the given URL.
 */
function isServerHealthy(targetUrl = 'http://127.0.0.1:3000') {
  return new Promise((resolve) => {
    try {
      const u = new URL(targetUrl);
      const req = http.get({
        hostname: u.hostname,
        port: u.port || 80,
        path: '/api/health',
        timeout: 1000
      }, (res) => {
        resolve(res.statusCode === 200);
      });
      req.on('error', () => resolve(false));
      req.on('timeout', () => {
        req.destroy();
        resolve(false);
      });
    } catch {
      resolve(false);
    }
  });
}

/**
 * Starts the embedded Express server, binding to an available port.
 * Tries the requested port first (default 3000), and cascades to subsequent ports if occupied.
 */
function startServer(options = {}) {
  if (activeServer) {
    const addr = activeServer.address();
    const port = addr && typeof addr === 'object' ? addr.port : 3000;
    return Promise.resolve({
      server: activeServer,
      port,
      url: `http://127.0.0.1:${port}`
    });
  }

  const app = createBackendApp(options);
  const preferredPort = parseInt(options.port || process.env.PORT || '3000', 10);

  return new Promise((resolve, reject) => {
    function tryListen(portToTry, attemptsLeft = 10) {
      const server = http.createServer(app);

      server.on('connection', (socket) => {
        activeSockets.add(socket);
        socket.on('close', () => activeSockets.delete(socket));
      });

      server.on('error', (err) => {
        if (err.code === 'EADDRINUSE' && attemptsLeft > 0) {
          console.log(`[WinLaunch Server] Port ${portToTry} is in use, trying port ${portToTry + 1}...`);
          tryListen(portToTry + 1, attemptsLeft - 1);
        } else {
          reject(err);
        }
      });

      server.listen(portToTry, '127.0.0.1', () => {
        activeServer = server;
        const actualPort = server.address().port;
        const activeUrl = `http://127.0.0.1:${actualPort}`;
        console.log(`[WinLaunch Server] Production backend running at ${activeUrl}`);
        resolve({
          server,
          port: actualPort,
          url: activeUrl
        });
      });
    }

    tryListen(preferredPort);
  });
}

/**
 * Stops the embedded Express server and closes all active sockets.
 */
function stopServer() {
  if (activeServer) {
    try {
      for (const socket of activeSockets) {
        try { socket.destroy(); } catch {}
      }
      activeSockets.clear();
      activeServer.close(() => {
        console.log('[WinLaunch Server] Backend server stopped.');
      });
    } catch (e) {
      console.warn('[WinLaunch Server] Error stopping server:', e);
    }
    activeServer = null;
  }
}

module.exports = {
  createBackendApp,
  startServer,
  stopServer,
  isServerHealthy
};

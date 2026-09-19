import initSqlJs, { Database } from 'sql.js';
import { Website, Category, AppSettings } from '../types';
import { getApiBaseUrl } from './apiConfig';

const STORAGE_KEY_SQLITE_BINARY = 'winlaunch_sqlite_db_bin';
const STORAGE_KEY_BACKUP_JSON = 'winlaunch_sqlite_backup_json';
const STORAGE_KEY_SETTINGS = 'winlaunch_settings';

export function safeNormalizeUrl(rawUrl: string): string {
  if (!rawUrl) return '';
  const trimmed = rawUrl.trim();
  if (!/^https?:\/\//i.test(trimmed)) {
    return 'https://' + trimmed;
  }
  return trimmed;
}

export function safeGetHostname(rawUrl: string): string {
  try {
    const normalized = safeNormalizeUrl(rawUrl);
    return new URL(normalized).hostname;
  } catch {
    return 'website';
  }
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-all', name: 'All Websites', color: '#64748b' },
  { id: 'cat-dev', name: 'Development', color: '#3b82f6' },
  { id: 'cat-prod', name: 'Productivity', color: '#10b981' },
  { id: 'cat-media', name: 'Media & Video', color: '#ef4444' },
  { id: 'cat-social', name: 'Social', color: '#f59e0b' },
  { id: 'cat-ai', name: 'AI & Tools', color: '#8b5cf6' },
  { id: 'cat-ref', name: 'Reference', color: '#06b6d4' }
];

const DEFAULT_WEBSITES: Website[] = [
  {
    id: 'site-google',
    title: 'Google',
    url: 'https://www.google.com',
    favicon: 'https://www.google.com/s2/favicons?domain=google.com&sz=128',
    category: 'Productivity',
    description: 'Fast web search, workspace, and Google services.',
    is_pinned: true,
    launch_count: 24,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 10,
    last_opened_at: Date.now() - 1000 * 60 * 30,
    browser_preference: 'chrome'
  },
  {
    id: 'site-github',
    title: 'GitHub',
    url: 'https://github.com',
    favicon: 'https://www.google.com/s2/favicons?domain=github.com&sz=128',
    category: 'Development',
    description: 'Developer code hosting, pull requests, and repositories.',
    is_pinned: true,
    launch_count: 42,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 9,
    last_opened_at: Date.now() - 1000 * 60 * 45,
    browser_preference: 'chrome'
  },
  {
    id: 'site-youtube',
    title: 'YouTube',
    url: 'https://www.youtube.com',
    favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=128',
    category: 'Media & Video',
    description: 'Video streaming, podcasts, tech tutorials, and music.',
    is_pinned: true,
    launch_count: 19,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 8,
    last_opened_at: Date.now() - 1000 * 60 * 60 * 2,
    browser_preference: 'chrome'
  },
  {
    id: 'site-chatgpt',
    title: 'ChatGPT',
    url: 'https://chatgpt.com',
    favicon: 'https://www.google.com/s2/favicons?domain=chatgpt.com&sz=128',
    category: 'AI & Tools',
    description: 'Conversational assistant, research, coding, and brainstorming.',
    is_pinned: true,
    launch_count: 36,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 7,
    last_opened_at: Date.now() - 1000 * 60 * 15,
    browser_preference: 'chrome'
  },
  {
    id: 'site-stackoverflow',
    title: 'Stack Overflow',
    url: 'https://stackoverflow.com',
    favicon: 'https://www.google.com/s2/favicons?domain=stackoverflow.com&sz=128',
    category: 'Development',
    description: 'Q&A community for programmers and software engineers.',
    is_pinned: false,
    launch_count: 15,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 6,
    last_opened_at: Date.now() - 1000 * 60 * 60 * 5,
    browser_preference: 'chrome'
  },
  {
    id: 'site-reddit',
    title: 'Reddit',
    url: 'https://www.reddit.com',
    favicon: 'https://www.google.com/s2/favicons?domain=reddit.com&sz=128',
    category: 'Social',
    description: 'Community discussions, tech news, and trending topics.',
    is_pinned: false,
    launch_count: 11,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 5,
    last_opened_at: Date.now() - 1000 * 60 * 60 * 12,
    browser_preference: 'chrome'
  },
  {
    id: 'site-notion',
    title: 'Notion',
    url: 'https://www.notion.so',
    favicon: 'https://www.google.com/s2/favicons?domain=notion.so&sz=128',
    category: 'Productivity',
    description: 'Collaborative notes, docs, wikis, and project management.',
    is_pinned: true,
    launch_count: 28,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 4,
    last_opened_at: Date.now() - 1000 * 60 * 60 * 1,
    browser_preference: 'chrome'
  },
  {
    id: 'site-wikipedia',
    title: 'Wikipedia',
    url: 'https://www.wikipedia.org',
    favicon: 'https://www.google.com/s2/favicons?domain=wikipedia.org&sz=128',
    category: 'Reference',
    description: 'The free encyclopedia with millions of articles.',
    is_pinned: false,
    launch_count: 8,
    created_at: Date.now() - 1000 * 60 * 60 * 24 * 3,
    last_opened_at: Date.now() - 1000 * 60 * 60 * 24,
    browser_preference: 'chrome'
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  default_browser: 'chrome',
  chrome_path: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  fallback_to_default: true,
  view_mode: 'grid',
  auto_fetch_metadata: true,
  sort_by: 'frequent',
  appdata_path: '%APPDATA%\\WinLaunch\\websites.db',
  background: {
    type: 'default',
    color: '#0c121e',
    overlayOpacity: 0.35,
    blur: 0
  }
};

class SQLiteDatabaseService {
  private db: Database | null = null;
  private isInitialized = false;
  private memoryWebsites: Website[] = [];
  private memoryCategories: Category[] = [];
  private memorySettings: AppSettings = { ...DEFAULT_SETTINGS };

  public async init(): Promise<void> {
    if (this.isInitialized) return;

    // Load settings from storage
    try {
      const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
      if (savedSettings) {
        this.memorySettings = { ...DEFAULT_SETTINGS, ...JSON.parse(savedSettings) };
      }
    } catch (e) {
      console.warn('Failed to parse saved settings:', e);
    }

    // Try loading SQLite WebAssembly with validated binary
    let sqliteLoaded = false;

    if (typeof WebAssembly === 'object' && typeof WebAssembly.instantiate === 'function') {
      try {
        let wasmBinary: ArrayBuffer | null = null;

        // 1. Attempt to fetch local wasm binary from server or relative path
        try {
          const baseUrl = getApiBaseUrl();
          const candidates: string[] = [];
          if (baseUrl) {
            candidates.push(`${baseUrl}/sql-wasm.wasm`);
          }
          candidates.push('/sql-wasm.wasm');
          if (typeof window !== 'undefined' && (window as any).electronAPI?.apiUrl) {
            candidates.unshift(`${(window as any).electronAPI.apiUrl}/sql-wasm.wasm`);
          }

          for (const url of candidates) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                const buffer = await res.arrayBuffer();
                // Check WebAssembly magic number: 0x00 0x61 0x73 0x6d ('\0asm')
                if (buffer.byteLength > 8) {
                  const magic = new Uint8Array(buffer, 0, 4);
                  if (magic[0] === 0x00 && magic[1] === 0x61 && magic[2] === 0x73 && magic[3] === 0x6d) {
                    wasmBinary = buffer;
                    break;
                  }
                }
              }
            } catch {
              // try next candidate
            }
          }
        } catch {
          // fetch attempt failed
        }

        // Only call initSqlJs if we verified a valid wasmBinary
        // This ensures sql.js NEVER attempts its own remote fetch or aborts with WebAssembly.RuntimeError
        if (wasmBinary) {
          const SQL = await initSqlJs({
            wasmBinary: wasmBinary,
            locateFile: () => '/sql-wasm.wasm'
          });

          const savedDbBinary = localStorage.getItem(STORAGE_KEY_SQLITE_BINARY);
          if (savedDbBinary) {
            try {
              const binaryArray = Uint8Array.from(atob(savedDbBinary), (c) => c.charCodeAt(0));
              this.db = new SQL.Database(binaryArray);
            } catch (e) {
              console.warn('Error reading saved SQLite binary, creating fresh DB:', e);
              this.db = new SQL.Database();
            }
          } else {
            this.db = new SQL.Database();
          }

          this.createTables();
          this.syncMemoryFromDb();
          sqliteLoaded = true;
        }
      } catch (err) {
        console.warn('SQLite initialization skipped, falling back to local store:', err);
      }
    }

    if (!sqliteLoaded) {
      this.initFallbackStorage();
    }

    this.isInitialized = true;
  }

  private createTables(): void {
    if (!this.db) return;

    this.db.run(`
      CREATE TABLE IF NOT EXISTS websites (
        id TEXT PRIMARY KEY,
        title TEXT NOT NULL,
        url TEXT NOT NULL,
        favicon TEXT,
        category TEXT,
        description TEXT,
        is_pinned INTEGER DEFAULT 0,
        launch_count INTEGER DEFAULT 0,
        created_at INTEGER,
        last_opened_at INTEGER,
        browser_preference TEXT
      );

      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        color TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
      );
    `);

    // Check if websites table is empty
    const checkStmt = this.db.prepare('SELECT COUNT(*) as count FROM websites');
    checkStmt.step();
    const row = checkStmt.getAsObject();
    checkStmt.free();

    if (!row.count || Number(row.count) === 0) {
      // Seed default websites
      for (const site of DEFAULT_WEBSITES) {
        this.insertWebsiteDb(site);
      }
      for (const cat of DEFAULT_CATEGORIES) {
        this.insertCategoryDb(cat);
      }
      this.saveDbBinary();
    }
  }

  private insertWebsiteDb(site: Website): void {
    if (!this.db) return;
    this.db.run(
      `INSERT OR REPLACE INTO websites 
       (id, title, url, favicon, category, description, is_pinned, launch_count, created_at, last_opened_at, browser_preference)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        site.id,
        site.title,
        site.url,
        site.favicon,
        site.category,
        site.description || '',
        site.is_pinned ? 1 : 0,
        site.launch_count || 0,
        site.created_at,
        site.last_opened_at || null,
        site.browser_preference || 'chrome'
      ]
    );
  }

  private insertCategoryDb(cat: Category): void {
    if (!this.db) return;
    this.db.run(
      'INSERT OR REPLACE INTO categories (id, name, color) VALUES (?, ?, ?)',
      [cat.id, cat.name, cat.color]
    );
  }

  private syncMemoryFromDb(): void {
    if (!this.db) return;

    // Load websites
    const stmt = this.db.prepare('SELECT * FROM websites ORDER BY is_pinned DESC, launch_count DESC');
    const sites: Website[] = [];
    while (stmt.step()) {
      const obj = stmt.getAsObject() as Record<string, any>;
      sites.push({
        id: String(obj.id),
        title: String(obj.title),
        url: String(obj.url),
        favicon: String(obj.favicon || ''),
        category: String(obj.category || 'General'),
        description: obj.description ? String(obj.description) : undefined,
        is_pinned: Boolean(obj.is_pinned),
        launch_count: Number(obj.launch_count || 0),
        created_at: Number(obj.created_at || Date.now()),
        last_opened_at: obj.last_opened_at ? Number(obj.last_opened_at) : null,
        browser_preference: obj.browser_preference as any
      });
    }
    stmt.free();
    this.memoryWebsites = sites;

    // Load categories
    const catStmt = this.db.prepare('SELECT * FROM categories');
    const cats: Category[] = [];
    while (catStmt.step()) {
      const obj = catStmt.getAsObject() as Record<string, any>;
      cats.push({
        id: String(obj.id),
        name: String(obj.name),
        color: String(obj.color)
      });
    }
    catStmt.free();
    this.memoryCategories = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
  }

  private saveDbBinary(): void {
    if (!this.db) return;
    try {
      const binary = this.db.export();
      let binaryString = '';
      const chunkSize = 8192;
      for (let i = 0; i < binary.length; i += chunkSize) {
        binaryString += String.fromCharCode.apply(null, binary.subarray(i, i + chunkSize) as unknown as number[]);
      }
      localStorage.setItem(STORAGE_KEY_SQLITE_BINARY, btoa(binaryString));
      localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
    } catch (e) {
      console.warn('Could not save SQLite binary string:', e);
      try {
        localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
      } catch {
        // storage quota fallback
      }
    }
  }

  private initFallbackStorage(): void {
    const saved = localStorage.getItem(STORAGE_KEY_BACKUP_JSON);
    if (saved) {
      try {
        this.memoryWebsites = JSON.parse(saved);
      } catch {
        this.memoryWebsites = [...DEFAULT_WEBSITES];
      }
    } else {
      this.memoryWebsites = [...DEFAULT_WEBSITES];
    }
    this.memoryCategories = [...DEFAULT_CATEGORIES];
  }

  public getWebsites(): Website[] {
    return [...this.memoryWebsites];
  }

  public getCategories(): Category[] {
    return [...this.memoryCategories];
  }

  public getSettings(): AppSettings {
    return { ...this.memorySettings };
  }

  public saveSettings(newSettings: Partial<AppSettings>): AppSettings {
    this.memorySettings = { ...this.memorySettings, ...newSettings };
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(this.memorySettings));
    return { ...this.memorySettings };
  }

  public addWebsite(site: Omit<Website, 'id' | 'created_at' | 'launch_count' | 'last_opened_at'>): Website {
    const newSite: Website = {
      ...site,
      id: 'site-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
      created_at: Date.now(),
      launch_count: 0,
      last_opened_at: null
    };

    this.memoryWebsites.unshift(newSite);

    if (this.db) {
      this.insertWebsiteDb(newSite);
      this.saveDbBinary();
    } else {
      localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
    }

    return newSite;
  }

  public updateWebsite(id: string, updates: Partial<Website>): Website | null {
    const index = this.memoryWebsites.findIndex((s) => s.id === id);
    if (index === -1) return null;

    const updated = { ...this.memoryWebsites[index], ...updates };
    this.memoryWebsites[index] = updated;

    if (this.db) {
      this.insertWebsiteDb(updated);
      this.saveDbBinary();
    } else {
      localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
    }

    return updated;
  }

  public deleteWebsite(id: string): boolean {
    this.memoryWebsites = this.memoryWebsites.filter((s) => s.id !== id);

    if (this.db) {
      this.db.run('DELETE FROM websites WHERE id = ?', [id]);
      this.saveDbBinary();
    } else {
      localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
    }

    return true;
  }

  public recordLaunch(id: string): Website | null {
    const site = this.memoryWebsites.find((s) => s.id === id);
    if (!site) return null;

    site.launch_count = (site.launch_count || 0) + 1;
    site.last_opened_at = Date.now();

    if (this.db) {
      this.db.run('UPDATE websites SET launch_count = ?, last_opened_at = ? WHERE id = ?', [
        site.launch_count,
        site.last_opened_at,
        id
      ]);
      this.saveDbBinary();
    } else {
      localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
    }

    return { ...site };
  }

  public addCategory(name: string, color: string): Category {
    const existing = this.memoryCategories.find((c) => c.name.toLowerCase() === name.toLowerCase());
    if (existing) return existing;

    const newCat: Category = {
      id: 'cat-' + Date.now(),
      name,
      color
    };
    this.memoryCategories.push(newCat);

    if (this.db) {
      this.insertCategoryDb(newCat);
      this.saveDbBinary();
    }
    return newCat;
  }

  public exportBackupJson(): string {
    const backupData = {
      app: 'WinLaunch',
      version: '1.0.0',
      exported_at: new Date().toISOString(),
      websites: this.memoryWebsites,
      categories: this.memoryCategories,
      settings: this.memorySettings
    };
    return JSON.stringify(backupData, null, 2);
  }

  public batchSyncWebsites(incomingSites: Website[], mode: 'merge' | 'replace' = 'merge'): Website[] {
    if (!incomingSites || !incomingSites.length) return [...this.memoryWebsites];

    if (mode === 'replace') {
      this.memoryWebsites = [];
      if (this.db) {
        this.db.run('DELETE FROM websites');
      }
    }

    const existingUrlMap = new Map(this.memoryWebsites.map((s) => [s.url.toLowerCase(), s]));

    for (const raw of incomingSites) {
      if (!raw || !raw.url) continue;
      const cleanUrl = safeNormalizeUrl(raw.url);
      const exists = existingUrlMap.get(cleanUrl.toLowerCase());

      if (exists && mode === 'merge') {
        continue;
      }

      const domain = safeGetHostname(cleanUrl);
      const site: Website = {
        id: raw.id || 'site-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
        title: raw.title ? raw.title.trim() : domain,
        url: cleanUrl,
        favicon: raw.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
        category: raw.category || 'General',
        description: raw.description || '',
        is_pinned: Boolean(raw.is_pinned),
        launch_count: typeof raw.launch_count === 'number' && !isNaN(raw.launch_count) ? Math.max(0, raw.launch_count) : 0,
        created_at: typeof raw.created_at === 'number' && !isNaN(raw.created_at) ? raw.created_at : Date.now(),
        last_opened_at: raw.last_opened_at ? Number(raw.last_opened_at) : null,
        browser_preference: raw.browser_preference || 'chrome'
      };

      if (mode === 'replace') {
        this.memoryWebsites.push(site);
      } else {
        this.memoryWebsites.unshift(site);
        existingUrlMap.set(cleanUrl.toLowerCase(), site);
      }

      if (this.db) {
        this.insertWebsiteDb(site);
      }
    }

    if (this.db) {
      this.saveDbBinary();
    } else {
      try {
        localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
      } catch (e) {
        console.warn('LocalStorage error:', e);
      }
    }

    return [...this.memoryWebsites];
  }

  public importBackupJson(jsonString: string, mode: 'merge' | 'replace' = 'merge'): { success: boolean; count: number; error?: string } {
    try {
      const data = JSON.parse(jsonString);
      const incomingSites: Website[] = Array.isArray(data.websites) ? data.websites : Array.isArray(data) ? data : [];

      if (!incomingSites.length) {
        return { success: false, count: 0, error: 'No valid websites found in import file' };
      }

      if (mode === 'replace') {
        this.memoryWebsites = [];
        if (this.db) {
          this.db.run('DELETE FROM websites');
        }
      }

      let addedCount = 0;
      for (const raw of incomingSites) {
        if (!raw || !raw.url) continue;
        const cleanUrl = safeNormalizeUrl(raw.url);
        const exists = this.memoryWebsites.some((s) => s.url.toLowerCase() === cleanUrl.toLowerCase());
        if (exists && mode === 'merge') continue;

        const domain = safeGetHostname(cleanUrl);
        const site: Website = {
          id: raw.id || 'site-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
          title: raw.title ? raw.title.trim() : domain,
          url: cleanUrl,
          favicon: raw.favicon || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`,
          category: raw.category || 'General',
          description: raw.description || '',
          is_pinned: Boolean(raw.is_pinned),
          launch_count: Number(raw.launch_count || 0),
          created_at: Number(raw.created_at || Date.now()),
          last_opened_at: raw.last_opened_at ? Number(raw.last_opened_at) : null,
          browser_preference: raw.browser_preference || 'chrome'
        };

        this.memoryWebsites.push(site);
        if (this.db) {
          this.insertWebsiteDb(site);
        }
        addedCount++;
      }

      if (Array.isArray(data.categories)) {
        for (const cat of data.categories) {
          if (cat && cat.name && !this.memoryCategories.some((c) => c.name.toLowerCase() === cat.name.toLowerCase())) {
            this.addCategory(cat.name, cat.color || '#3b82f6');
          }
        }
      }

      if (this.db) {
        this.saveDbBinary();
      } else {
        localStorage.setItem(STORAGE_KEY_BACKUP_JSON, JSON.stringify(this.memoryWebsites));
      }

      return { success: true, count: addedCount };
    } catch (err: any) {
      return { success: false, count: 0, error: err.message || 'Invalid JSON syntax' };
    }
  }

  public runRawQuery(sql: string): { columns: string[]; values: any[][]; error?: string } {
    if (!this.db) {
      return { columns: ['Error'], values: [['SQLite WASM engine not active']] };
    }
    try {
      const results = this.db.exec(sql);
      if (results.length === 0) {
        return { columns: ['Status'], values: [['Query executed successfully. 0 rows returned.']] };
      }
      return {
        columns: results[0].columns,
        values: results[0].values
      };
    } catch (err: any) {
      return { columns: ['Error'], values: [[err.message || 'Execution error']], error: err.message };
    }
  }

  public resetAllData(): void {
    if (this.db) {
      this.db.run('DELETE FROM websites');
      this.db.run('DELETE FROM categories');
      for (const site of DEFAULT_WEBSITES) {
        this.insertWebsiteDb(site);
      }
      for (const cat of DEFAULT_CATEGORIES) {
        this.insertCategoryDb(cat);
      }
      this.saveDbBinary();
    }
    this.memoryWebsites = [...DEFAULT_WEBSITES];
    this.memoryCategories = [...DEFAULT_CATEGORIES];
    this.memorySettings = { ...DEFAULT_SETTINGS };
    localStorage.removeItem(STORAGE_KEY_SQLITE_BINARY);
    localStorage.removeItem(STORAGE_KEY_BACKUP_JSON);
    localStorage.removeItem(STORAGE_KEY_SETTINGS);
  }

  public getDatabaseStats(): {
    websitesCount: number;
    categoriesCount: number;
    pinnedCount: number;
    totalLaunches: number;
    storageType: string;
    filePath: string;
    binarySize: number;
  } {
    const websitesCount = this.memoryWebsites.length;
    const categoriesCount = this.memoryCategories.length;
    const pinnedCount = this.memoryWebsites.filter((s) => s.is_pinned).length;
    const totalLaunches = this.memoryWebsites.reduce((acc, s) => acc + (s.launch_count || 0), 0);

    let binarySize = 0;
    if (this.db) {
      try {
        const bin = this.db.export();
        binarySize = bin.length;
      } catch {
        binarySize = JSON.stringify(this.memoryWebsites).length;
      }
    } else {
      binarySize = JSON.stringify(this.memoryWebsites).length;
    }

    return {
      websitesCount,
      categoriesCount,
      pinnedCount,
      totalLaunches,
      storageType: this.db ? 'SQLite v3 (WebAssembly + Persistent Storage)' : 'Local SQLite Fallback Cache',
      filePath: 'C:\\Users\\%USERNAME%\\AppData\\Roaming\\WinLaunch\\websites.db',
      binarySize
    };
  }
}

export const dbService = new SQLiteDatabaseService();

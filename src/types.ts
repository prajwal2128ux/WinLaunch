export interface Website {
  id: string;
  title: string;
  url: string;
  favicon: string;
  category: string;
  description?: string;
  is_pinned: boolean;
  launch_count: number;
  created_at: number;
  last_opened_at: number | null;
  browser_preference?: 'chrome' | 'default' | 'edge' | 'firefox';
}

export interface Category {
  id: string;
  name: string;
  color: string;
  icon?: string;
}

export interface BackgroundConfig {
  type: 'default' | 'color' | 'image' | 'preset';
  color?: string; // hex or gradient
  imageUrl?: string;
  presetId?: string;
  overlayOpacity?: number; // 0 to 0.9 (default 0.4)
  blur?: number; // 0 to 24px (default 0)
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  created_at: number;
  last_login_at: number;
  avatar_color?: string;
}

export interface CloudSyncData {
  websites: Website[];
  categories: Category[];
  settings: Partial<AppSettings>;
  last_synced_at: number;
  device_name?: string;
}

export interface AppSettings {
  theme: 'dark' | 'light' | 'system';
  default_browser: 'chrome' | 'default' | 'edge';
  chrome_path: string;
  fallback_to_default: boolean;
  view_mode: 'grid' | 'compact' | 'list';
  auto_fetch_metadata: boolean;
  sort_by: 'frequent' | 'recent' | 'name' | 'created';
  appdata_path: string;
  background?: BackgroundConfig;
}

export interface ElectronAPI {
  isElectron: boolean;
  platform: string;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
  detectChrome: () => Promise<{ installed: boolean; path: string }>;
  openUrl: (options: { url: string; preferredBrowser?: string }) => Promise<{ success: boolean; browser?: string; path?: string; error?: string }>;
  getAppDataInfo: () => Promise<{ appDataDir: string; dbPath: string; exists: boolean; size: number }>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

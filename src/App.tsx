/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { CommandBar } from './components/CommandBar';
import { PinnedShelf } from './components/PinnedShelf';
import { WebsiteCard } from './components/WebsiteCard';
import { WebsiteTile } from './components/WebsiteTile';
import { WebsiteListItem } from './components/WebsiteListItem';
import { AddEditWebsiteModal } from './components/AddEditWebsiteModal';
import { SettingsModal } from './components/SettingsModal';
import { ElectronBuildModal } from './components/ElectronBuildModal';
import { ChangeBackgroundModal } from './components/ChangeBackgroundModal';
import { AuthModal } from './components/AuthModal';
import { LoginPage } from './components/LoginPage';
import { Toast, ToastMessage } from './components/Toast';
import { dbService, DEFAULT_SETTINGS } from './services/db';
import { launchWebsite } from './services/launcher';
import { authService } from './services/auth';
import { Website, Category, AppSettings, UserProfile, CloudSyncData } from './types';
import { Globe, Plus, Sparkles, Filter, BookmarkX, Palette, Cloud } from 'lucide-react';

export default function App() {
  const [websites, setWebsites] = useState<Website[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isDbReady, setIsDbReady] = useState(false);

  // Authentication & Cloud Sync State
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => authService.getCurrentUser());

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingWebsite, setEditingWebsite] = useState<Website | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isBuildGuideOpen, setIsBuildGuideOpen] = useState(false);
  const [isBackgroundModalOpen, setIsBackgroundModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');

  // Toasts
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((text: string, type: 'info' | 'success' | 'warning' = 'info') => {
    const id = 'toast-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6);
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Initialize SQLite database & verify Cloud Auth
  useEffect(() => {
    async function loadData() {
      await dbService.init();
      setWebsites(dbService.getWebsites());
      setCategories(dbService.getCategories());
      setSettings(dbService.getSettings());
      setIsDbReady(true);

      // Verify Cloud Session on launch
      try {
        const verifiedUser = await authService.checkAuth();
        if (verifiedUser) {
          setCurrentUser(verifiedUser);
        }
      } catch {
        // Keep offline cached session
      }
    }
    loadData();
  }, []);

  // Sync settings theme to document
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') {
        e.preventDefault();
        setEditingWebsite(null);
        setIsAddEditOpen(true);
      }
      if ((e.ctrlKey || e.metaKey) && (e.key.toLowerCase() === 'f' || e.key.toLowerCase() === 'k')) {
        e.preventDefault();
        const searchInput = document.getElementById('input-search-websites');
        if (searchInput) searchInput.focus();
      }
      if (e.key === 'Escape') {
        setIsAddEditOpen(false);
        setIsSettingsOpen(false);
        setIsBuildGuideOpen(false);
        setIsBackgroundModalOpen(false);
        setIsAuthModalOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const refreshAllData = useCallback(() => {
    setWebsites(dbService.getWebsites());
    setCategories(dbService.getCategories());
    setSettings(dbService.getSettings());
  }, []);

  // Handle incoming data synchronized from user's cloud account
  const handleSyncReceived = useCallback((syncData: CloudSyncData, mode: 'merge' | 'replace' = 'merge') => {
    if (!syncData) return;

    if (syncData.websites && syncData.websites.length > 0) {
      dbService.batchSyncWebsites(syncData.websites, mode);
    }

    if (syncData.categories && syncData.categories.length > 0) {
      const currentCatNames = new Set(dbService.getCategories().map(c => c.name.toLowerCase()));
      for (const c of syncData.categories) {
        if (!currentCatNames.has(c.name.toLowerCase())) {
          dbService.addCategory(c.name, c.color);
        }
      }
    }

    if (syncData.settings && Object.keys(syncData.settings).length > 0) {
      dbService.saveSettings(syncData.settings);
    }

    refreshAllData();
  }, [refreshAllData]);

  const handleLogout = useCallback(async () => {
    await authService.logout();
    setCurrentUser(null);
    setIsSettingsOpen(false);
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
    showToast('Logged out of WinLaunch. Sign in to access your synchronized apps.', 'info');
  }, [showToast]);

  const syncToCloudIfLoggedIn = useCallback(() => {
    if (authService.isLoggedIn()) {
      setTimeout(() => {
        authService.pushCloudData({
          websites: dbService.getWebsites(),
          categories: dbService.getCategories(),
          settings: dbService.getSettings()
        }).catch(() => {});
      }, 300);
    }
  }, []);

  const handleUpdateSettings = (newPartial: Partial<AppSettings>) => {
    const updated = dbService.saveSettings(newPartial);
    setSettings(updated);
    syncToCloudIfLoggedIn();
  };

  const handleLaunch = async (website: Website, preferredBrowser: 'chrome' | 'default' = 'chrome') => {
    const target = website.browser_preference || preferredBrowser || settings.default_browser || 'chrome';
    const result = await launchWebsite(website, target);

    if (result.success) {
      showToast(result.message, 'success');
      // Refresh list to reflect incremented launch count and updated timestamp
      setWebsites(dbService.getWebsites());
    } else {
      showToast(`Launch failed: ${result.message}`, 'warning');
    }
  };

  const handleTogglePin = (id: string, currentPin: boolean) => {
    dbService.updateWebsite(id, { is_pinned: !currentPin });
    setWebsites(dbService.getWebsites());
    syncToCloudIfLoggedIn();
    showToast(!currentPin ? 'Pinned to favorites' : 'Unpinned from favorites', 'info');
  };

  const handleSaveWebsite = (
    siteData: Omit<Website, 'id' | 'created_at' | 'launch_count' | 'last_opened_at'>,
    id?: string
  ) => {
    if (id) {
      dbService.updateWebsite(id, siteData);
      showToast(`Updated ${siteData.title}`, 'success');
    } else {
      dbService.addWebsite(siteData);
      showToast(`Added ${siteData.title} to SQLite database`, 'success');
    }
    refreshAllData();
    syncToCloudIfLoggedIn();
  };

  const handleDeleteWebsite = (id: string) => {
    const target = websites.find((s) => s.id === id);
    if (!target) return;
    if (window.confirm(`Are you sure you want to remove "${target.title}"?`)) {
      dbService.deleteWebsite(id);
      refreshAllData();
      syncToCloudIfLoggedIn();
      showToast(`Deleted ${target.title}`, 'info');
    }
  };

  const handleAddCategory = (name: string, color: string) => {
    dbService.addCategory(name, color);
    setCategories(dbService.getCategories());
    syncToCloudIfLoggedIn();
  };

  // Filtered & Sorted Websites
  const filteredWebsites = useMemo(() => {
    let list = [...websites];

    // Search query filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((s) => 
        s.title.toLowerCase().includes(q) ||
        s.url.toLowerCase().includes(q) ||
        (s.description && s.description.toLowerCase().includes(q)) ||
        s.category.toLowerCase().includes(q)
      );
    }

    // Category filter
    if (selectedCategory === 'pinned') {
      list = list.filter((s) => s.is_pinned);
    } else if (selectedCategory !== 'all') {
      list = list.filter((s) => s.category.toLowerCase() === selectedCategory.toLowerCase());
    }

    // Sorting
    list.sort((a, b) => {
      if (settings.sort_by === 'frequent') {
        return (b.launch_count || 0) - (a.launch_count || 0);
      }
      if (settings.sort_by === 'recent') {
        return (b.last_opened_at || 0) - (a.last_opened_at || 0);
      }
      if (settings.sort_by === 'created') {
        return b.created_at - a.created_at;
      }
      if (settings.sort_by === 'name') {
        return a.title.localeCompare(b.title);
      }
      return 0;
    });

    return list;
  }, [websites, searchQuery, selectedCategory, settings.sort_by]);

  const pinnedWebsites = useMemo(() => {
    return websites.filter((s) => s.is_pinned);
  }, [websites]);

  const totalLaunches = useMemo(() => {
    return websites.reduce((acc, s) => acc + (s.launch_count || 0), 0);
  }, [websites]);

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of categories) {
      map.set(c.name.toLowerCase(), c);
    }
    return map;
  }, [categories]);

  const isDark = settings.theme === 'dark';
  const bgConfig = settings.background || {
    type: 'default',
    color: '#0c121e',
    overlayOpacity: 0.35,
    blur: 0
  };

  // If not logged in, render the persistent Windows 11 Login & Register Screen
  if (!currentUser) {
    return (
      <>
        <LoginPage
          onLoginSuccess={(user, syncData) => {
            setCurrentUser(user);
            if (syncData && syncData.websites && syncData.websites.length > 0) {
              handleSyncReceived(syncData, 'merge');
            }
          }}
          settings={settings}
          onUpdateSettings={handleUpdateSettings}
          currentWebsites={websites}
          currentCategories={categories}
          onShowToast={showToast}
        />
        <Toast toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
      </>
    );
  }

  return (
    <div className={`relative min-h-screen flex flex-col select-none transition-colors duration-150 ${
      isDark ? 'text-slate-100' : 'text-slate-800'
    }`}>
      {/* Dynamic Background Surface (Mica Acrylic, Custom Image Wallpaper, or Custom Color) */}
      {bgConfig.type === 'default' ? (
        <div className={`fixed inset-0 pointer-events-none -z-10 ${isDark ? 'mica-bg-dark' : 'mica-bg-light'}`} />
      ) : (
        <div 
          className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
          style={{
            backgroundColor: bgConfig.type === 'color' && bgConfig.color?.startsWith('#') ? bgConfig.color : undefined,
            background: bgConfig.type === 'color' && !bgConfig.color?.startsWith('#') ? bgConfig.color : undefined,
          }}
        >
          {/* Wallpaper Image Layer */}
          {(bgConfig.type === 'image' || bgConfig.type === 'preset') && bgConfig.imageUrl && (
            <div 
              className="absolute inset-0 bg-cover bg-center transition-all duration-300"
              style={{
                backgroundImage: `url("${bgConfig.imageUrl}")`,
                filter: bgConfig.blur && bgConfig.blur > 0 ? `blur(${bgConfig.blur}px)` : undefined,
                transform: bgConfig.blur && bgConfig.blur > 0 ? 'scale(1.05)' : undefined
              }}
            />
          )}

          {/* Acrylic Tint & Contrast Overlay */}
          <div 
            className="absolute inset-0 transition-all duration-300"
            style={{
              backgroundColor: isDark 
                ? `rgba(11, 15, 25, ${bgConfig.overlayOpacity ?? 0.35})` 
                : `rgba(248, 250, 252, ${bgConfig.overlayOpacity ?? 0.35})`
            }}
          />
        </div>
      )}

      {/* 1. Windows 11 Fluent Title Bar */}
      <TitleBar
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenBuildGuide={() => setIsBuildGuideOpen(true)}
        onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      {/* 2. Command Bar (Add Website, Search, Filter Tabs, View Switcher, Background & Sync) */}
      <CommandBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
        categories={categories}
        totalWebsites={websites.length}
        pinnedCount={pinnedWebsites.length}
        totalLaunches={totalLaunches}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onOpenAddModal={() => {
          setEditingWebsite(null);
          setIsAddEditOpen(true);
        }}
        onOpenBackgroundModal={() => setIsBackgroundModalOpen(true)}
        onOpenAuthModal={() => {
          setAuthModalMode('login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        currentUser={currentUser}
      />

      {/* 3. Pinned & Favorites Quick Shelf */}
      {selectedCategory !== 'pinned' && (
        <PinnedShelf
          pinnedWebsites={pinnedWebsites}
          settings={settings}
          onLaunch={handleLaunch}
        />
      )}

      {/* 4. Main Content Area */}
      <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-y-auto">
        {/* Section Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-semibold tracking-tight">
              {selectedCategory === 'all' && 'All Saved Websites'}
              {selectedCategory === 'pinned' && 'Favorite Websites'}
              {selectedCategory !== 'all' && selectedCategory !== 'pinned' && `${selectedCategory} Websites`}
            </h2>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${
              isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'
            }`}>
              {filteredWebsites.length}
            </span>
          </div>

          {searchQuery && (
            <div className="text-xs text-slate-400">
              Filtered by: "{searchQuery}"
            </div>
          )}
        </div>

        {/* Empty State */}
        {filteredWebsites.length === 0 && (
          <div className={`rounded-2xl border p-12 text-center max-w-md mx-auto my-8 ${
            isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white border-slate-200 shadow-xs'
          }`}>
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
              <BookmarkX className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold mb-1">No websites found</h3>
            <p className={`text-xs mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {searchQuery 
                ? `No websites match your search for "${searchQuery}".` 
                : 'No websites in this category yet. Click Add Website to save one!'}
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setEditingWebsite(null);
                setIsAddEditOpen(true);
              }}
              className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add a Website</span>
            </button>
          </div>
        )}

        {/* Website Views */}
        {/* VIEW 1: Grid Cards */}
        {settings.view_mode === 'grid' && filteredWebsites.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredWebsites.map((site) => (
              <WebsiteCard
                key={site.id}
                website={site}
                categoryObj={categoryMap.get(site.category.toLowerCase())}
                settings={settings}
                onLaunch={handleLaunch}
                onTogglePin={handleTogglePin}
                onEdit={(ws) => {
                  setEditingWebsite(ws);
                  setIsAddEditOpen(true);
                }}
                onDelete={handleDeleteWebsite}
                onShowToast={showToast}
              />
            ))}
          </div>
        )}

        {/* VIEW 2: Compact Tiles */}
        {settings.view_mode === 'compact' && filteredWebsites.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {filteredWebsites.map((site) => (
              <WebsiteTile
                key={site.id}
                website={site}
                categoryObj={categoryMap.get(site.category.toLowerCase())}
                settings={settings}
                onLaunch={handleLaunch}
                onTogglePin={handleTogglePin}
                onEdit={(ws) => {
                  setEditingWebsite(ws);
                  setIsAddEditOpen(true);
                }}
              />
            ))}
          </div>
        )}

        {/* VIEW 3: Detailed List */}
        {settings.view_mode === 'list' && filteredWebsites.length > 0 && (
          <div className="space-y-2">
            {filteredWebsites.map((site) => (
              <WebsiteListItem
                key={site.id}
                website={site}
                categoryObj={categoryMap.get(site.category.toLowerCase())}
                settings={settings}
                onLaunch={handleLaunch}
                onTogglePin={handleTogglePin}
                onEdit={(ws) => {
                  setEditingWebsite(ws);
                  setIsAddEditOpen(true);
                }}
                onDelete={handleDeleteWebsite}
                onShowToast={showToast}
              />
            ))}
          </div>
        )}
      </main>

      {/* 5. Modals */}
      <AddEditWebsiteModal
        isOpen={isAddEditOpen}
        onClose={() => {
          setIsAddEditOpen(false);
          setEditingWebsite(null);
        }}
        onSave={handleSaveWebsite}
        categories={categories}
        onAddCategory={handleAddCategory}
        editingWebsite={editingWebsite}
        settings={settings}
        onShowToast={showToast}
      />

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onRefreshData={refreshAllData}
        onOpenBuildGuide={() => {
          setIsSettingsOpen(false);
          setIsBuildGuideOpen(true);
        }}
        onOpenBackgroundModal={() => {
          setIsSettingsOpen(false);
          setIsBackgroundModalOpen(true);
        }}
        onOpenAuthModal={(mode) => {
          setIsSettingsOpen(false);
          setAuthModalMode(mode || 'login');
          setIsAuthModalOpen(true);
        }}
        onLogout={handleLogout}
        currentUser={currentUser}
        onShowToast={showToast}
      />

      <ElectronBuildModal
        isOpen={isBuildGuideOpen}
        onClose={() => setIsBuildGuideOpen(false)}
        settings={settings}
        onShowToast={showToast}
      />

      <ChangeBackgroundModal
        isOpen={isBackgroundModalOpen}
        onClose={() => setIsBackgroundModalOpen(false)}
        settings={settings}
        onUpdateSettings={handleUpdateSettings}
        onShowToast={showToast}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        currentUser={currentUser}
        onUserChange={(user: UserProfile | null) => {
          if (user) {
            setCurrentUser(user);
            showToast(`Welcome back, ${user.name}!`, 'success');
          } else {
            handleLogout();
          }
        }}
        onSyncReceived={(cloudData: CloudSyncData, mode: 'merge' | 'replace') => {
          handleSyncReceived(cloudData, mode);
          showToast('Data synced from cloud successfully', 'success');
        }}
        currentWebsites={websites}
        currentCategories={categories}
        currentSettings={settings}
        isDark={isDark}
        onShowToast={showToast}
        initialMode={authModalMode}
      />

      {/* 6. Notifications Toast */}
      <Toast toasts={toasts} onDismiss={dismissToast} isDark={isDark} />
    </div>
  );
}

import React from 'react';
import { 
  Plus, 
  Search, 
  X, 
  LayoutGrid, 
  Grid2X2, 
  List, 
  ArrowUpDown, 
  Star,
  FolderOpen,
  Palette,
  Cloud,
  CheckCircle2,
  LogOut
} from 'lucide-react';
import { Category, AppSettings, UserProfile } from '../types';

interface CommandBarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categories: Category[];
  totalWebsites: number;
  pinnedCount: number;
  totalLaunches: number;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onOpenAddModal: () => void;
  onOpenBackgroundModal?: () => void;
  onOpenAuthModal?: () => void;
  onLogout?: () => void;
  currentUser?: UserProfile | null;
}

export const CommandBar: React.FC<CommandBarProps> = ({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onSelectCategory,
  categories,
  totalWebsites,
  pinnedCount,
  totalLaunches,
  settings,
  onUpdateSettings,
  onOpenAddModal,
  onOpenBackgroundModal,
  onOpenAuthModal,
  onLogout,
  currentUser
}) => {
  const isDark = settings.theme === 'dark';

  return (
    <div className={`p-4 border-b transition-colors ${
      isDark ? 'bg-slate-900/60 border-slate-800' : 'bg-white/80 border-slate-200'
    }`}>
      {/* Top row: Add Button, Search Bar, View Mode, Sort */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Add Website & Search */}
        <div className="flex items-center space-x-3 flex-1 max-w-2xl">
          <button
            id="btn-add-website"
            onClick={onOpenAddModal}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-sm hover:shadow transition-all shrink-0 active:scale-98"
          >
            <Plus className="w-4 h-4" />
            <span>Add Website</span>
            <kbd className="hidden sm:inline-block ml-1 px-1.5 py-0.5 text-[10px] bg-blue-700/60 rounded font-mono text-blue-100">
              Ctrl+N
            </kbd>
          </button>

          {/* Quick Background Customizer Button */}
          {onOpenBackgroundModal && (
            <button
              id="btn-commandbar-change-bg"
              onClick={onOpenBackgroundModal}
              className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors shrink-0 ${
                isDark 
                  ? 'border-purple-500/30 bg-purple-600/10 text-purple-300 hover:bg-purple-600/20' 
                  : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
              }`}
              title="Change Background Image or Color"
            >
              <Palette className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Change Background</span>
            </button>
          )}

          {/* Search Input */}
          <div className="relative flex-1">
            <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${
              isDark ? 'text-slate-500' : 'text-slate-400'
            }`} />
            <input
              id="input-search-websites"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search websites by name, URL, or notes... (Ctrl+F)"
              className={`w-full pl-9 pr-9 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                isDark 
                  ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500 focus:bg-slate-800' 
                  : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 focus:bg-white'
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => onSearchChange('')}
                className={`absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full ${
                  isDark ? 'hover:bg-slate-700 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
                }`}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Right: Sort & View Modes */}
        <div className="flex items-center space-x-2 shrink-0 self-end md:self-auto">
          {/* Sort Selection */}
          <div className="flex items-center space-x-1.5">
            <span className={`text-xs font-medium hidden sm:inline ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Sort:
            </span>
            <div className="relative">
              <select
                id="select-sort-order"
                value={settings.sort_by}
                onChange={(e) => onUpdateSettings({ sort_by: e.target.value as any })}
                className={`text-xs rounded-lg px-2.5 py-1.5 pr-7 appearance-none cursor-pointer border font-medium transition-colors focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-750' 
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <option value="frequent">Most Visited</option>
                <option value="recent">Recently Opened</option>
                <option value="created">Recently Added</option>
                <option value="name">Alphabetical (A-Z)</option>
              </select>
              <ArrowUpDown className={`absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`} />
            </div>
          </div>

          {/* View Mode Buttons */}
          <div className={`flex items-center p-0.5 rounded-lg border ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-100 border-slate-200'
          }`}>
            <button
              id="btn-view-grid"
              onClick={() => onUpdateSettings({ view_mode: 'grid' })}
              className={`p-1.5 rounded-md transition-colors ${
                settings.view_mode === 'grid'
                  ? isDark ? 'bg-slate-700 text-blue-400 shadow-xs' : 'bg-white text-blue-600 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Card Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              id="btn-view-compact"
              onClick={() => onUpdateSettings({ view_mode: 'compact' })}
              className={`p-1.5 rounded-md transition-colors ${
                settings.view_mode === 'compact'
                  ? isDark ? 'bg-slate-700 text-blue-400 shadow-xs' : 'bg-white text-blue-600 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Compact Tiles View"
            >
              <Grid2X2 className="w-4 h-4" />
            </button>
            <button
              id="btn-view-list"
              onClick={() => onUpdateSettings({ view_mode: 'list' })}
              className={`p-1.5 rounded-md transition-colors ${
                settings.view_mode === 'list'
                  ? isDark ? 'bg-slate-700 text-blue-400 shadow-xs' : 'bg-white text-blue-600 shadow-xs'
                  : isDark ? 'text-slate-400 hover:text-slate-200' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Detailed List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Category Filter Pills & Summary Counter */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-slate-200/40 dark:border-slate-800/60">
        <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 max-w-full">
          {/* All Filter */}
          <button
            id="filter-category-all"
            onClick={() => onSelectCategory('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center space-x-1.5 ${
              selectedCategory === 'all'
                ? 'bg-blue-600 text-white'
                : isDark 
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <span>All</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'all' ? 'bg-blue-700 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {totalWebsites}
            </span>
          </button>

          {/* Pinned Filter */}
          <button
            id="filter-category-pinned"
            onClick={() => onSelectCategory('pinned')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center space-x-1.5 ${
              selectedCategory === 'pinned'
                ? 'bg-amber-500 text-white'
                : isDark 
                  ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300' 
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
            }`}
          >
            <Star className={`w-3 h-3 ${selectedCategory === 'pinned' ? 'fill-white' : 'text-amber-400 fill-amber-400'}`} />
            <span>Favorites</span>
            <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
              selectedCategory === 'pinned' ? 'bg-amber-600 text-white' : isDark ? 'bg-slate-700 text-slate-300' : 'bg-slate-200 text-slate-700'
            }`}>
              {pinnedCount}
            </span>
          </button>

          {/* Category Tabs */}
          {categories.filter(c => c.name !== 'All Websites').map((cat) => (
            <button
              key={cat.id}
              id={`filter-category-${cat.id}`}
              onClick={() => onSelectCategory(cat.name)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors shrink-0 flex items-center space-x-1.5 ${
                selectedCategory.toLowerCase() === cat.name.toLowerCase()
                  ? 'bg-blue-600 text-white'
                  : isDark 
                    ? 'bg-slate-800/80 hover:bg-slate-800 text-slate-300' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              <span 
                className="w-2 h-2 rounded-full shrink-0" 
                style={{ backgroundColor: cat.color }} 
              />
              <span>{cat.name}</span>
            </button>
          ))}
        </div>

        {/* Quick Launch & Stats */}
        <div className={`hidden md:flex items-center space-x-3 text-xs ${
          isDark ? 'text-slate-400' : 'text-slate-500'
        }`}>
          <span>{totalLaunches} Total Launches</span>
          <span>•</span>
          <span className="flex items-center space-x-1">
            <FolderOpen className="w-3 h-3 text-blue-400" />
            <span>SQLite Active</span>
          </span>
          <span>•</span>
          {currentUser ? (
            <div className="flex items-center space-x-2">
              <button
                id="btn-status-synced-user"
                onClick={onOpenAuthModal}
                className="flex items-center space-x-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
                title="Cloud account active. Click to view profile & sync options."
              >
                <Cloud className="w-3 h-3 text-emerald-400" />
                <span>Synced ({currentUser.name})</span>
              </button>
              {onLogout && (
                <button
                  id="btn-status-logout"
                  onClick={onLogout}
                  className="flex items-center space-x-1 text-slate-400 hover:text-red-400 transition-colors pl-1 border-l border-slate-700/50"
                  title="Log out of WinLaunch"
                >
                  <LogOut className="w-3 h-3" />
                  <span className="text-[11px]">Log Out</span>
                </button>
              )}
            </div>
          ) : (
            <button
              onClick={onOpenAuthModal}
              className="flex items-center space-x-1 text-blue-400 hover:text-blue-300 transition-colors"
              title="Click to sign in or create an account to sync websites across devices"
            >
              <Cloud className="w-3 h-3 text-blue-400" />
              <span>Sync Devices</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

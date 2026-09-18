import React from 'react';
import { Star, Chrome, ExternalLink } from 'lucide-react';
import { Website, AppSettings } from '../types';

interface PinnedShelfProps {
  pinnedWebsites: Website[];
  settings: AppSettings;
  onLaunch: (website: Website, browser?: 'chrome' | 'default') => void;
}

export const PinnedShelf: React.FC<PinnedShelfProps> = ({
  pinnedWebsites,
  settings,
  onLaunch
}) => {
  const isDark = settings.theme === 'dark';

  if (pinnedWebsites.length === 0) return null;

  return (
    <div className={`px-4 py-3 border-b transition-colors ${
      isDark ? 'bg-slate-900/40 border-slate-800/80' : 'bg-slate-50/70 border-slate-200/80'
    }`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-amber-500 uppercase tracking-wider">
          <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
          <span>Pinned & Favorites</span>
        </div>
        <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
          Click to launch directly in Chrome
        </span>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {pinnedWebsites.map((site) => (
          <button
            key={site.id}
            id={`pinned-shelf-item-${site.id}`}
            onClick={() => onLaunch(site, 'chrome')}
            className={`group flex items-center space-x-2.5 px-3 py-1.5 rounded-lg border text-left transition-all shrink-0 hover:scale-102 active:scale-98 ${
              isDark 
                ? 'bg-slate-850/80 hover:bg-slate-800 border-slate-750 hover:border-blue-500/50 text-slate-200' 
                : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-400 text-slate-800 shadow-xs'
            }`}
            title={`Launch ${site.title} in Chrome`}
          >
            {/* Favicon */}
            <div className="w-6 h-6 rounded flex items-center justify-center bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
              <img
                src={site.favicon}
                alt=""
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(new URL(site.url).hostname)}&sz=64`;
                }}
                className="w-4 h-4 object-contain"
              />
            </div>

            {/* Title & Domain */}
            <div className="min-w-0 pr-1">
              <div className="text-xs font-medium truncate max-w-[120px]">{site.title}</div>
              <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                {new URL(site.url).hostname.replace(/^www\./i, '')}
              </div>
            </div>

            {/* Chrome Launch Icon on Hover */}
            <div className="w-4 h-4 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-blue-500">
              <Chrome className="w-3.5 h-3.5" />
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

import React from 'react';
import { Chrome, Star, ExternalLink, MoreHorizontal } from 'lucide-react';
import { Website, Category, AppSettings } from '../types';

interface WebsiteTileProps {
  website: Website;
  categoryObj?: Category;
  settings: AppSettings;
  onLaunch: (website: Website, browser?: 'chrome' | 'default') => void;
  onTogglePin: (id: string, current: boolean) => void;
  onEdit: (website: Website) => void;
}

export const WebsiteTile: React.FC<WebsiteTileProps> = ({
  website,
  categoryObj,
  settings,
  onLaunch,
  onTogglePin,
  onEdit
}) => {
  const isDark = settings.theme === 'dark';
  let domain = '';
  try {
    domain = new URL(website.url).hostname.replace(/^www\./i, '');
  } catch {
    domain = website.url;
  }

  return (
    <div
      id={`website-tile-${website.id}`}
      className={`group relative rounded-xl border p-3 flex items-center justify-between transition-all duration-150 ${
        isDark 
          ? 'bg-slate-850 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-100' 
          : 'bg-white hover:bg-slate-50 border-slate-200 hover:border-blue-300 text-slate-900 shadow-xs'
      }`}
    >
      {/* Favicon & Details */}
      <div 
        className="flex items-center space-x-3 min-w-0 flex-1 cursor-pointer"
        onClick={() => onLaunch(website, 'chrome')}
      >
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center p-1.5 shrink-0 overflow-hidden border ${
          isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
        }`}>
          <img
            src={website.favicon}
            alt=""
            referrerPolicy="no-referrer"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128`;
            }}
            className="w-full h-full object-contain"
          />
        </div>

        <div className="min-w-0 pr-2">
          <div className="flex items-center space-x-2">
            <h4 className="font-semibold text-sm truncate hover:text-blue-500 transition-colors">
              {website.title}
            </h4>
            {website.is_pinned && (
              <Star className="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-slate-400 mt-0.5">
            <span className="truncate max-w-[140px]">{domain}</span>
            <span>•</span>
            <span 
              className="text-[10px] font-medium" 
              style={{ color: categoryObj?.color || '#3b82f6' }}
            >
              {website.category}
            </span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center space-x-1 shrink-0">
        <button
          onClick={() => onLaunch(website, 'chrome')}
          className="p-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors"
          title="Open in Chrome"
        >
          <Chrome className="w-4 h-4" />
        </button>

        <button
          onClick={() => onTogglePin(website.id, website.is_pinned)}
          className={`p-1.5 rounded-lg transition-colors ${
            website.is_pinned ? 'text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
          }`}
          title="Toggle Favorite"
        >
          <Star className={`w-4 h-4 ${website.is_pinned ? 'fill-amber-400' : ''}`} />
        </button>

        <button
          onClick={() => onEdit(website)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          title="Edit Details"
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

import React from 'react';
import { 
  Chrome, 
  ExternalLink, 
  Star, 
  Copy, 
  Edit3, 
  Trash2, 
  Flame, 
  Clock 
} from 'lucide-react';
import { Website, Category, AppSettings } from '../types';

interface WebsiteListItemProps {
  website: Website;
  categoryObj?: Category;
  settings: AppSettings;
  onLaunch: (website: Website, browser?: 'chrome' | 'default') => void;
  onTogglePin: (id: string, current: boolean) => void;
  onEdit: (website: Website) => void;
  onDelete: (id: string) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const WebsiteListItem: React.FC<WebsiteListItemProps> = ({
  website,
  categoryObj,
  settings,
  onLaunch,
  onTogglePin,
  onEdit,
  onDelete,
  onShowToast
}) => {
  const isDark = settings.theme === 'dark';
  let domain = '';
  try {
    domain = new URL(website.url).hostname.replace(/^www\./i, '');
  } catch {
    domain = website.url;
  }

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(website.url);
    onShowToast(`Copied URL: ${website.url}`, 'success');
  };

  const formatLastOpened = (timestamp: number | null) => {
    if (!timestamp) return 'Never';
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / (1000 * 60));
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div
      id={`website-list-item-${website.id}`}
      className={`group flex items-center justify-between p-3 rounded-lg border transition-colors ${
        isDark 
          ? 'bg-slate-850 hover:bg-slate-800 border-slate-750' 
          : 'bg-white hover:bg-slate-50 border-slate-200 shadow-xs'
      }`}
    >
      {/* Left: Star + Favicon + Title + URL */}
      <div className="flex items-center space-x-3 min-w-0 flex-1">
        <button
          onClick={() => onTogglePin(website.id, website.is_pinned)}
          className={`p-1 rounded transition-colors ${
            website.is_pinned ? 'text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
          }`}
          title={website.is_pinned ? 'Unpin' : 'Pin'}
        >
          <Star className={`w-4 h-4 ${website.is_pinned ? 'fill-amber-400' : ''}`} />
        </button>

        <div className={`w-8 h-8 rounded-md flex items-center justify-center p-1 shrink-0 overflow-hidden border ${
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

        <div className="min-w-0 pr-3">
          <div className="flex items-center space-x-2">
            <span 
              className="font-medium text-sm truncate cursor-pointer hover:text-blue-500 transition-colors"
              onClick={() => onLaunch(website, 'chrome')}
            >
              {website.title}
            </span>
          </div>
          <div className="text-xs text-slate-400 truncate max-w-sm">
            {website.url}
          </div>
        </div>
      </div>

      {/* Center: Category Badge & Stats */}
      <div className="hidden md:flex items-center space-x-6 text-xs text-slate-400 shrink-0 px-4">
        {/* Category */}
        <span 
          className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full font-medium"
          style={{ 
            backgroundColor: `${categoryObj?.color || '#3b82f6'}18`,
            color: categoryObj?.color || '#3b82f6'
          }}
        >
          <span 
            className="w-1.5 h-1.5 rounded-full" 
            style={{ backgroundColor: categoryObj?.color || '#3b82f6' }} 
          />
          <span>{website.category}</span>
        </span>

        {/* Launches count */}
        <div className="flex items-center space-x-1" title="Launch count">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          <span>{website.launch_count || 0} launches</span>
        </div>

        {/* Last opened */}
        <div className="flex items-center space-x-1" title="Last opened">
          <Clock className="w-3.5 h-3.5 text-slate-500" />
          <span>{formatLastOpened(website.last_opened_at)}</span>
        </div>
      </div>

      {/* Right: Action Buttons */}
      <div className="flex items-center space-x-1.5 shrink-0">
        <button
          onClick={() => onLaunch(website, 'chrome')}
          className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-colors"
          title="Open in Google Chrome"
        >
          <Chrome className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Chrome</span>
        </button>

        <button
          onClick={() => onLaunch(website, 'default')}
          className={`p-1.5 rounded-md border transition-colors ${
            isDark ? 'border-slate-700 hover:bg-slate-750 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          title="Open in Default Browser"
        >
          <ExternalLink className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={handleCopyUrl}
          className={`p-1.5 rounded-md border transition-colors ${
            isDark ? 'border-slate-700 hover:bg-slate-750 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          title="Copy URL"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onEdit(website)}
          className={`p-1.5 rounded-md border transition-colors ${
            isDark ? 'border-slate-700 hover:bg-slate-750 text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
          }`}
          title="Edit Details"
        >
          <Edit3 className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => onDelete(website.id)}
          className={`p-1.5 rounded-md border transition-colors ${
            isDark ? 'border-slate-700 hover:bg-red-900/30 text-red-400' : 'border-slate-200 hover:bg-red-50 text-red-600'
          }`}
          title="Delete Website"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};

import React, { useState, useRef, useEffect } from 'react';
import { 
  Chrome, 
  ExternalLink, 
  Copy, 
  Edit3, 
  Trash2, 
  MoreVertical, 
  Star, 
  Check, 
  Clock, 
  Flame,
  Globe
} from 'lucide-react';
import { Website, Category, AppSettings } from '../types';

interface WebsiteCardProps {
  website: Website;
  categoryObj?: Category;
  settings: AppSettings;
  onLaunch: (website: Website, browser?: 'chrome' | 'default') => void;
  onTogglePin: (id: string, current: boolean) => void;
  onEdit: (website: Website) => void;
  onDelete: (id: string) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const WebsiteCard: React.FC<WebsiteCardProps> = ({
  website,
  categoryObj,
  settings,
  onLaunch,
  onTogglePin,
  onEdit,
  onDelete,
  onShowToast
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const isDark = settings.theme === 'dark';

  let domain = '';
  try {
    domain = new URL(website.url).hostname.replace(/^www\./i, '');
  } catch {
    domain = website.url;
  }

  // Close context menu on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    if (menuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);

  const handleCopyUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(website.url);
    setCopied(true);
    onShowToast(`Copied URL: ${website.url}`, 'success');
    setTimeout(() => setCopied(false), 2000);
    setMenuOpen(false);
  };

  const formatLastOpened = (timestamp: number | null) => {
    if (!timestamp) return 'Never opened';
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
      id={`website-card-${website.id}`}
      className={`group relative rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between hover:shadow-md ${
        isDark
          ? 'bg-slate-850 hover:bg-slate-800 border-slate-750 hover:border-slate-600 text-slate-100'
          : 'bg-white hover:bg-slate-50/90 border-slate-200 hover:border-blue-300 text-slate-900 shadow-xs'
      }`}
    >
      {/* Top Header: Favicon, Title, Pin & Menu */}
      <div>
        <div className="flex items-start justify-between gap-2 mb-2">
          {/* Favicon & Title */}
          <div className="flex items-center space-x-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center p-1.5 shrink-0 overflow-hidden border ${
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

            <div className="min-w-0">
              <h3 
                className="font-semibold text-sm truncate leading-snug cursor-pointer hover:text-blue-500 transition-colors"
                onClick={() => onLaunch(website, 'chrome')}
                title={`Open ${website.title} in Chrome`}
              >
                {website.title}
              </h3>
              <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-0.5">
                <Globe className="w-3 h-3 text-slate-400 shrink-0" />
                <span className="truncate">{domain}</span>
              </div>
            </div>
          </div>

          {/* Action icons: Star & More Menu */}
          <div className="flex items-center space-x-1 shrink-0">
            {/* Star / Pin Button */}
            <button
              onClick={() => onTogglePin(website.id, website.is_pinned)}
              className={`p-1.5 rounded-md transition-colors ${
                website.is_pinned
                  ? 'text-amber-400 hover:bg-amber-400/10'
                  : isDark ? 'text-slate-500 hover:text-slate-300 hover:bg-slate-800' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-100'
              }`}
              title={website.is_pinned ? 'Unpin from favorites' : 'Pin to favorites'}
            >
              <Star className={`w-4 h-4 ${website.is_pinned ? 'fill-amber-400' : ''}`} />
            </button>

            {/* Context Menu Trigger */}
            <div className="relative" ref={menuRef}>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen(!menuOpen);
                }}
                className={`p-1.5 rounded-md transition-colors ${
                  isDark ? 'hover:bg-slate-750 text-slate-400 hover:text-slate-200' : 'hover:bg-slate-100 text-slate-400 hover:text-slate-700'
                }`}
                title="Options"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {/* Dropdown Menu */}
              {menuOpen && (
                <div 
                  className={`absolute right-0 top-full mt-1 w-48 rounded-lg shadow-xl border py-1 z-30 text-xs ${
                    isDark 
                      ? 'bg-slate-800 border-slate-700 text-slate-200 divide-slate-750' 
                      : 'bg-white border-slate-200 text-slate-700 shadow-lg'
                  }`}
                >
                  <button
                    onClick={() => {
                      onLaunch(website, 'chrome');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Chrome className="w-3.5 h-3.5" />
                    <span>Open in Google Chrome</span>
                  </button>

                  <button
                    onClick={() => {
                      onLaunch(website, 'default');
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Open in Default Browser</span>
                  </button>

                  <button
                    onClick={handleCopyUrl}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied!' : 'Copy Website URL'}</span>
                  </button>

                  <div className="my-1 border-t border-slate-200 dark:border-slate-700" />

                  <button
                    onClick={() => {
                      onEdit(website);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-blue-600 hover:text-white transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Details</span>
                  </button>

                  <button
                    onClick={() => {
                      onDelete(website.id);
                      setMenuOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 flex items-center space-x-2 hover:bg-red-600 hover:text-white text-red-500 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete Website</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Description / Notes if any */}
        {website.description ? (
          <p className="text-xs text-slate-400 line-clamp-2 mt-2 leading-relaxed">
            {website.description}
          </p>
        ) : (
          <div className="h-2" />
        )}
      </div>

      {/* Footer: Category Tag, Metrics & Open Button */}
      <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80">
        <div className="flex items-center justify-between text-[11px] mb-3">
          {/* Category Badge */}
          <span 
            className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full font-medium"
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

          {/* Launch count & Last opened */}
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="flex items-center space-x-0.5" title="Total launches">
              <Flame className="w-3 h-3 text-orange-400" />
              <span>{website.launch_count || 0}</span>
            </span>
            <span>•</span>
            <span className="flex items-center space-x-0.5" title={`Last opened: ${formatLastOpened(website.last_opened_at)}`}>
              <Clock className="w-3 h-3 text-slate-500" />
              <span>{formatLastOpened(website.last_opened_at)}</span>
            </span>
          </div>
        </div>

        {/* Primary Action Button: Open in Google Chrome */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onLaunch(website, 'chrome')}
            className="flex-1 flex items-center justify-center space-x-2 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs shadow-xs hover:shadow transition-all active:scale-98"
          >
            <Chrome className="w-3.5 h-3.5" />
            <span>Open in Chrome</span>
          </button>

          <button
            onClick={() => onLaunch(website, 'default')}
            className={`p-2 rounded-lg border transition-colors ${
              isDark 
                ? 'border-slate-700 hover:bg-slate-750 text-slate-300' 
                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title="Open in Default Browser"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

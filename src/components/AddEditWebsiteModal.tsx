import React, { useState, useEffect } from 'react';
import { 
  X, 
  Sparkles, 
  Loader2, 
  Globe, 
  Chrome, 
  Star, 
  Tag, 
  Plus, 
  Check, 
  FileText 
} from 'lucide-react';
import { Website, Category, AppSettings } from '../types';
import { fetchWebsiteMetadata } from '../services/metadata';

interface AddEditWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (siteData: Omit<Website, 'id' | 'created_at' | 'launch_count' | 'last_opened_at'>, id?: string) => void;
  categories: Category[];
  onAddCategory: (name: string, color: string) => void;
  editingWebsite?: Website | null;
  settings: AppSettings;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const AddEditWebsiteModal: React.FC<AddEditWebsiteModalProps> = ({
  isOpen,
  onClose,
  onSave,
  categories,
  onAddCategory,
  editingWebsite,
  settings,
  onShowToast
}) => {
  const isDark = settings.theme === 'dark';

  const [url, setUrl] = useState('');
  const [title, setTitle] = useState('');
  const [favicon, setFavicon] = useState('');
  const [category, setCategory] = useState('Productivity');
  const [description, setDescription] = useState('');
  const [isPinned, setIsPinned] = useState(false);
  const [browserPreference, setBrowserPreference] = useState<'chrome' | 'default' | 'edge' | 'firefox'>('chrome');

  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [showNewCatInput, setShowNewCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState('#3b82f6');
  const [errorMsg, setErrorMsg] = useState('');

  // Pre-fill fields if editing
  useEffect(() => {
    if (editingWebsite) {
      setUrl(editingWebsite.url);
      setTitle(editingWebsite.title);
      setFavicon(editingWebsite.favicon);
      setCategory(editingWebsite.category || 'Productivity');
      setDescription(editingWebsite.description || '');
      setIsPinned(editingWebsite.is_pinned);
      setBrowserPreference(editingWebsite.browser_preference || 'chrome');
    } else {
      setUrl('');
      setTitle('');
      setFavicon('');
      setCategory('Productivity');
      setDescription('');
      setIsPinned(false);
      setBrowserPreference(settings.default_browser || 'chrome');
    }
    setErrorMsg('');
    setShowNewCatInput(false);
  }, [editingWebsite, isOpen, settings.default_browser]);

  if (!isOpen) return null;

  const handleFetchMetadata = async () => {
    if (!url.trim()) {
      setErrorMsg('Please enter a website URL first');
      return;
    }

    setIsLoadingMetadata(true);
    setErrorMsg('');

    try {
      const data = await fetchWebsiteMetadata(url);
      setUrl(data.url);
      if (!title || editingWebsite?.title === title) {
        setTitle(data.title);
      }
      setFavicon(data.favicon);
      if (data.description && !description) {
        setDescription(data.description);
      }
      onShowToast(`Fetched title and favicon for ${data.domain}`, 'success');
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not auto-fetch metadata');
      onShowToast('Could not fetch details, you can enter them manually', 'warning');
    } finally {
      setIsLoadingMetadata(false);
    }
  };

  const handleUrlBlur = () => {
    // If URL is typed and title is still empty, auto-fetch
    if (url.trim() && !title && !editingWebsite) {
      handleFetchMetadata();
    }
  };

  const handleCreateCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;
    onAddCategory(newCatName.trim(), newCatColor);
    setCategory(newCatName.trim());
    setNewCatName('');
    setShowNewCatInput(false);
    onShowToast(`Added category: ${newCatName.trim()}`, 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setErrorMsg('Website URL is required');
      return;
    }

    let finalUrl = url.trim();
    if (!/^https?:\/\//i.test(finalUrl)) {
      finalUrl = 'https://' + finalUrl;
    }

    let finalDomain = '';
    try {
      finalDomain = new URL(finalUrl).hostname;
    } catch {
      setErrorMsg('Invalid URL format');
      return;
    }

    const finalTitle = title.trim() || finalDomain.replace(/^www\./i, '');
    const finalFavicon = favicon.trim() || `https://www.google.com/s2/favicons?domain=${encodeURIComponent(finalDomain)}&sz=128`;

    onSave({
      url: finalUrl,
      title: finalTitle,
      favicon: finalFavicon,
      category,
      description: description.trim(),
      is_pinned: isPinned,
      browser_preference: browserPreference
    }, editingWebsite?.id);

    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="modal-add-edit-website"
        className={`w-full max-w-lg rounded-2xl border shadow-2xl overflow-hidden transition-all duration-150 ${
          isDark 
            ? 'bg-slate-900 border-slate-750 text-slate-100' 
            : 'bg-white border-slate-200 text-slate-900'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`flex items-center justify-between px-6 py-4 border-b ${
          isDark ? 'border-slate-800 bg-slate-850/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/10 text-blue-500 flex items-center justify-center">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">
                {editingWebsite ? 'Edit Website' : 'Add New Website'}
              </h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Saves to local SQLite database in %APPDATA%\WinLaunch
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-500'
            }`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-lg text-xs bg-red-500/10 border border-red-500/20 text-red-500">
              {errorMsg}
            </div>
          )}

          {/* URL Input & Auto-Fetch Button */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
              Website URL *
            </label>
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="input-website-url"
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  onBlur={handleUrlBlur}
                  placeholder="https://example.com"
                  autoFocus
                  required
                  className={`w-full pl-9 pr-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
              </div>

              <button
                type="button"
                id="btn-auto-fetch-metadata"
                onClick={handleFetchMetadata}
                disabled={isLoadingMetadata || !url.trim()}
                className={`flex items-center space-x-1.5 px-3 py-2 rounded-lg text-xs font-medium transition-all shrink-0 ${
                  isLoadingMetadata 
                    ? 'bg-blue-600/50 text-white cursor-wait' 
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-xs'
                }`}
                title="Fetch website name and favicon"
              >
                {isLoadingMetadata ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Auto-Fetch</span>
                  </>
                )}
              </button>
            </div>
            <p className={`text-[11px] mt-1 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              WinLaunch scrapes the page title and favicon automatically.
            </p>
          </div>

          {/* Title & Favicon Preview */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Website Name *
              </label>
              <input
                id="input-website-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. GitHub"
                required
                className={`w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                  isDark 
                    ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500' 
                    : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Favicon URL
              </label>
              <div className="flex items-center space-x-2">
                <input
                  id="input-website-favicon"
                  type="text"
                  value={favicon}
                  onChange={(e) => setFavicon(e.target.value)}
                  placeholder="Favicon URL"
                  className={`flex-1 px-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
                  }`}
                />
                {favicon && (
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center p-1 shrink-0 border overflow-hidden ${
                    isDark ? 'bg-slate-800 border-slate-700' : 'bg-slate-100 border-slate-200'
                  }`}>
                    <img 
                      src={favicon} 
                      alt="" 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = 'https://www.google.com/s2/favicons?domain=example.com';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Category & Browser Preference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Category Select */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider opacity-80">
                  Category
                </label>
                <button
                  type="button"
                  onClick={() => setShowNewCatInput(!showNewCatInput)}
                  className="text-xs text-blue-500 hover:text-blue-400 flex items-center space-x-1"
                >
                  <Plus className="w-3 h-3" />
                  <span>{showNewCatInput ? 'Cancel' : 'New'}</span>
                </button>
              </div>

              {!showNewCatInput ? (
                <select
                  id="select-website-category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-slate-100' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                >
                  {categories.filter(c => c.name !== 'All Websites').map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Category name"
                      className={`flex-1 px-2.5 py-1.5 rounded-lg text-xs ${
                        isDark ? 'bg-slate-800 border border-slate-700' : 'bg-slate-50 border border-slate-200'
                      }`}
                    />
                    <input
                      type="color"
                      value={newCatColor}
                      onChange={(e) => setNewCatColor(e.target.value)}
                      className="w-7 h-7 rounded border-0 cursor-pointer p-0 bg-transparent"
                      title="Pick category color"
                    />
                    <button
                      type="button"
                      onClick={handleCreateCategory}
                      className="px-2.5 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-medium"
                    >
                      Save
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Browser Option */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
                Target Browser
              </label>
              <div className="relative">
                <select
                  id="select-browser-override"
                  value={browserPreference}
                  onChange={(e) => setBrowserPreference(e.target.value as any)}
                  className={`w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                    isDark 
                      ? 'bg-slate-800 border border-slate-700 text-slate-100' 
                      : 'bg-slate-50 border border-slate-200 text-slate-900'
                  }`}
                >
                  <option value="chrome">Google Chrome (Recommended)</option>
                  <option value="default">Windows Default Browser</option>
                  <option value="edge">Microsoft Edge</option>
                </select>
              </div>
            </div>
          </div>

          {/* Description / Notes */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider mb-1.5 opacity-80">
              Notes / Description (Optional)
            </label>
            <textarea
              id="textarea-website-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add personal notes, keyboard shortcuts, or project references..."
              rows={2}
              className={`w-full px-3 py-2 rounded-lg text-sm transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 resize-none ${
                isDark 
                  ? 'bg-slate-800 border border-slate-700 text-slate-100 placeholder-slate-500' 
                  : 'bg-slate-50 border border-slate-200 text-slate-900 placeholder-slate-400'
              }`}
            />
          </div>

          {/* Pin to Favorites Checkbox */}
          <div className="flex items-center space-x-2 pt-1">
            <label className="flex items-center space-x-2.5 cursor-pointer text-sm">
              <input
                id="checkbox-is-pinned"
                type="checkbox"
                checked={isPinned}
                onChange={(e) => setIsPinned(e.target.checked)}
                className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500/50 cursor-pointer"
              />
              <span className="flex items-center space-x-1.5 font-medium">
                <Star className={`w-3.5 h-3.5 ${isPinned ? 'text-amber-400 fill-amber-400' : 'text-slate-400'}`} />
                <span>Pin to Favorites (Top quick shelf)</span>
              </span>
            </label>
          </div>

          {/* Footer Buttons */}
          <div className={`flex items-center justify-end space-x-3 pt-4 border-t ${
            isDark ? 'border-slate-800' : 'border-slate-200'
          }`}>
            <button
              type="button"
              onClick={onClose}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                isDark ? 'hover:bg-slate-800 text-slate-300' : 'hover:bg-slate-100 text-slate-700'
              }`}
            >
              Cancel
            </button>
            <button
              type="submit"
              id="btn-save-website-submit"
              className="flex items-center space-x-2 px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm shadow-sm hover:shadow transition-all"
            >
              <Check className="w-4 h-4" />
              <span>{editingWebsite ? 'Update Website' : 'Save to SQLite'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

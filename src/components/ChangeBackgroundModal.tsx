import React, { useState } from 'react';
import { 
  X, 
  Image as ImageIcon, 
  Palette, 
  Sparkles, 
  Upload, 
  RotateCcw, 
  Check, 
  Sliders, 
  Eye,
  Layers
} from 'lucide-react';
import { AppSettings, BackgroundConfig } from '../types';

interface ChangeBackgroundModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onShowToast: (msg: string, type?: 'info' | 'success' | 'warning') => void;
}

export const PRESET_WALLPAPERS = [
  {
    id: 'w11-bloom-dark',
    name: 'Windows 11 Bloom Dark',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=60',
    category: 'Fluent'
  },
  {
    id: 'w11-bloom-light',
    name: 'Windows 11 Bloom Light',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=300&q=60',
    category: 'Fluent'
  },
  {
    id: 'midnight-aurora',
    name: 'Midnight Aurora',
    url: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1579033461380-adb47c3eb938?auto=format&fit=crop&w=300&q=60',
    category: 'Nature'
  },
  {
    id: 'deep-space',
    name: 'Cosmic Nebula',
    url: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1506703719100-a0f3a48c0f86?auto=format&fit=crop&w=300&q=60',
    category: 'Space'
  },
  {
    id: 'sunset-dunes',
    name: 'Twilight Dunes',
    url: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=300&q=60',
    category: 'Landscape'
  },
  {
    id: 'mountain-mist',
    name: 'Mountain Mist',
    url: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=300&q=60',
    category: 'Landscape'
  },
  {
    id: 'cyber-dark',
    name: 'Cyberpunk Grid',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=300&q=60',
    category: 'Abstract'
  },
  {
    id: 'minimal-carbon',
    name: 'Geometric Carbon',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=1920&q=80',
    thumb: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=300&q=60',
    category: 'Abstract'
  }
];

export const COLOR_PRESETS = [
  { name: 'Pure Obsidian', value: '#080c14' },
  { name: 'Dark Slate', value: '#0f172a' },
  { name: 'Deep Navy', value: '#020617' },
  { name: 'Midnight Blue', value: '#172554' },
  { name: 'Royal Indigo', value: '#1e1b4b' },
  { name: 'Emerald Forest', value: '#064e3b' },
  { name: 'Velvet Plum', value: '#3b0764' },
  { name: 'Titanium Zinc', value: '#18181b' },
  { name: 'Pure White (Light)', value: '#f8fafc' },
  { name: 'Warm Cream (Light)', value: '#fafaf9' }
];

export const GRADIENT_PRESETS = [
  { name: 'Windows 11 Acrylic', value: 'linear-gradient(135deg, #0c121e 0%, #1e293b 100%)' },
  { name: 'Cosmic Indigo', value: 'linear-gradient(135deg, #0f172a 0%, #2e1065 100%)' },
  { name: 'Deep Sapphire', value: 'linear-gradient(135deg, #030712 0%, #0369a1 100%)' },
  { name: 'Emerald Dusk', value: 'linear-gradient(135deg, #022c22 0%, #064e3b 100%)' },
  { name: 'Cyber Neon', value: 'linear-gradient(135deg, #180026 0%, #4a044e 100%)' },
  { name: 'Sunrise Frost (Light)', value: 'linear-gradient(135deg, #f0fdf4 0%, #e0f2fe 100%)' }
];

export const ChangeBackgroundModal: React.FC<ChangeBackgroundModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onShowToast
}) => {
  const isDark = settings.theme === 'dark';
  const currentBg = settings.background || {
    type: 'default',
    color: '#0c121e',
    overlayOpacity: 0.35,
    blur: 0
  };

  const [activeTab, setActiveTab] = useState<'wallpapers' | 'custom_image' | 'color' | 'adjust'>('wallpapers');
  
  // Staging state
  const [bgType, setBgType] = useState<BackgroundConfig['type']>(currentBg.type);
  const [selectedColor, setSelectedColor] = useState<string>(currentBg.color || '#0c121e');
  const [customImageUrl, setCustomImageUrl] = useState<string>(currentBg.imageUrl || '');
  const [selectedPresetId, setSelectedPresetId] = useState<string>(currentBg.presetId || '');
  const [overlayOpacity, setOverlayOpacity] = useState<number>(
    typeof currentBg.overlayOpacity === 'number' ? currentBg.overlayOpacity : 0.35
  );
  const [blurAmount, setBlurAmount] = useState<number>(currentBg.blur || 0);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const handleApply = (newConfig?: Partial<BackgroundConfig>) => {
    const configToSave: BackgroundConfig = {
      type: newConfig?.type ?? bgType,
      color: newConfig?.color ?? selectedColor,
      imageUrl: newConfig?.imageUrl ?? customImageUrl,
      presetId: newConfig?.presetId ?? selectedPresetId,
      overlayOpacity: newConfig?.overlayOpacity ?? overlayOpacity,
      blur: newConfig?.blur ?? blurAmount
    };

    onUpdateSettings({ background: configToSave });
    onShowToast('Desktop background updated', 'success');
  };

  const handleSelectWallpaper = (wallpaper: typeof PRESET_WALLPAPERS[0]) => {
    setBgType('preset');
    setSelectedPresetId(wallpaper.id);
    setCustomImageUrl(wallpaper.url);

    handleApply({
      type: 'preset',
      presetId: wallpaper.id,
      imageUrl: wallpaper.url
    });
  };

  const handleSelectColor = (colorValue: string) => {
    setBgType('color');
    setSelectedColor(colorValue);

    handleApply({
      type: 'color',
      color: colorValue
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      onShowToast('Please select a valid image file (PNG, JPG, WebP)', 'warning');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      onShowToast('Image size exceeds 8MB. Please choose a smaller image.', 'warning');
      return;
    }

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setCustomImageUrl(dataUrl);
      setBgType('image');
      setSelectedPresetId('');
      setIsUploading(false);
      handleApply({
        type: 'image',
        imageUrl: dataUrl,
        presetId: ''
      });
      onShowToast('Custom image uploaded and set as background', 'success');
    };
    reader.onerror = () => {
      setIsUploading(false);
      onShowToast('Failed to read image file', 'warning');
    };
    reader.readAsDataURL(file);
  };

  const handleResetDefault = () => {
    setBgType('default');
    setSelectedPresetId('');
    setCustomImageUrl('');
    setSelectedColor(isDark ? '#0c121e' : '#f8fafc');
    setOverlayOpacity(0.35);
    setBlurAmount(0);

    onUpdateSettings({
      background: {
        type: 'default',
        color: isDark ? '#0c121e' : '#f8fafc',
        overlayOpacity: 0.35,
        blur: 0
      }
    });
    onShowToast('Reset background to Windows Fluent Mica', 'info');
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div 
        id="modal-change-background"
        className={`w-full max-w-3xl max-h-[85vh] rounded-2xl border shadow-2xl flex flex-col overflow-hidden transition-all duration-150 ${
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
              <Palette className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Change Background</h2>
              <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                Personalize your Windows desktop workspace with custom images, colors, or fluent themes
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

        {/* Tab Navigation */}
        <div className={`flex items-center px-6 border-b text-xs font-medium space-x-1 shrink-0 ${
          isDark ? 'border-slate-800 bg-slate-950/40' : 'border-slate-200 bg-slate-50/70'
        }`}>
          <button
            onClick={() => setActiveTab('wallpapers')}
            className={`flex items-center space-x-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'wallpapers'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Curated Wallpapers</span>
          </button>

          <button
            onClick={() => setActiveTab('custom_image')}
            className={`flex items-center space-x-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'custom_image'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>Custom Image / Upload</span>
          </button>

          <button
            onClick={() => setActiveTab('color')}
            className={`flex items-center space-x-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'color'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Solid Color & Gradients</span>
          </button>

          <button
            onClick={() => setActiveTab('adjust')}
            className={`flex items-center space-x-1.5 py-3 px-3 border-b-2 transition-all ${
              activeTab === 'adjust'
                ? 'border-blue-500 text-blue-500 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Acrylic Tint & Blur</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB 1: Curated Wallpapers */}
          {activeTab === 'wallpapers' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Windows 11 & High-Resolution Wallpapers
                </span>
                <span className="text-xs text-slate-400">Click any wallpaper to apply instantly</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {PRESET_WALLPAPERS.map((wp) => {
                  const isSelected = bgType === 'preset' && (selectedPresetId === wp.id || customImageUrl === wp.url);
                  return (
                    <button
                      key={wp.id}
                      onClick={() => handleSelectWallpaper(wp)}
                      className={`group relative rounded-xl overflow-hidden border text-left transition-all aspect-video flex flex-col justify-end p-2.5 ${
                        isSelected 
                          ? 'border-blue-500 ring-2 ring-blue-500/40 shadow-lg' 
                          : isDark ? 'border-slate-800 hover:border-slate-600' : 'border-slate-200 hover:border-slate-400'
                      }`}
                    >
                      <img 
                        src={wp.thumb} 
                        alt={wp.name}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                      
                      <div className="relative z-10 flex items-center justify-between w-full">
                        <span className="text-[11px] font-semibold text-white drop-shadow-sm truncate">
                          {wp.name}
                        </span>
                        {isSelected && (
                          <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: Custom Image & File Upload */}
          {activeTab === 'custom_image' && (
            <div className="space-y-5">
              {/* Option A: Upload local image file */}
              <div className={`p-5 rounded-xl border border-dashed text-center transition-all ${
                isDark ? 'border-slate-700 bg-slate-950/40 hover:border-blue-500/60' : 'border-slate-300 bg-slate-50 hover:border-blue-500/60'
              }`}>
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center mx-auto mb-3">
                  <Upload className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-semibold mb-1">Upload Wallpaper from your PC</h4>
                <p className={`text-xs max-w-sm mx-auto mb-4 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Select any JPG, PNG, or WebP image from your Windows files to use as your custom background.
                </p>

                <label className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isUploading ? 'Loading Image...' : 'Browse Local Files'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Option B: Enter Image URL */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Or Paste an Image URL
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={customImageUrl}
                    onChange={(e) => setCustomImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or your direct image link"
                    className={`flex-1 px-3.5 py-2 rounded-lg text-xs transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-800/80 border border-slate-700 text-slate-100 placeholder-slate-500' 
                        : 'bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400'
                    }`}
                  />
                  <button
                    onClick={() => {
                      if (!customImageUrl.trim()) {
                        onShowToast('Please enter an image URL', 'warning');
                        return;
                      }
                      setBgType('image');
                      setSelectedPresetId('');
                      handleApply({
                        type: 'image',
                        imageUrl: customImageUrl.trim(),
                        presetId: ''
                      });
                    }}
                    className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium shrink-0 transition-colors"
                  >
                    Apply URL
                  </button>
                </div>
              </div>

              {/* Preview if URL exists */}
              {customImageUrl && (
                <div className="space-y-2">
                  <span className="text-xs text-slate-400">Current Image Preview:</span>
                  <div className="relative h-40 rounded-xl overflow-hidden border border-slate-800">
                    <img 
                      src={customImageUrl} 
                      alt="Background Preview" 
                      className="w-full h-full object-cover"
                      onError={() => onShowToast('Image failed to load. Please verify URL.', 'warning')}
                    />
                    <div 
                      className="absolute inset-0"
                      style={{ 
                        backgroundColor: isDark 
                          ? `rgba(15, 23, 42, ${overlayOpacity})` 
                          : `rgba(255, 255, 255, ${overlayOpacity})`
                      }}
                    />
                    <div className="absolute bottom-2 left-3 text-xs font-medium text-white drop-shadow-md">
                      Active Custom Image
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: Solid Color & Gradients */}
          {activeTab === 'color' && (
            <div className="space-y-6">
              {/* Custom Color Picker */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Custom Color Picker
                </span>
                <div className="flex items-center space-x-3">
                  <input
                    type="color"
                    value={selectedColor.startsWith('#') ? selectedColor : '#0c121e'}
                    onChange={(e) => handleSelectColor(e.target.value)}
                    className="w-12 h-10 rounded-lg cursor-pointer border border-slate-700 bg-transparent p-1"
                  />
                  <input
                    type="text"
                    value={selectedColor}
                    onChange={(e) => handleSelectColor(e.target.value)}
                    placeholder="#0f172a or css gradient"
                    className={`flex-1 px-3 py-2 rounded-lg text-xs font-mono transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/50 ${
                      isDark 
                        ? 'bg-slate-800/80 border border-slate-700 text-slate-100' 
                        : 'bg-slate-100 border border-slate-200 text-slate-900'
                    }`}
                  />
                </div>
              </div>

              {/* Solid Color Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Solid Color Presets
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {COLOR_PRESETS.map((cp) => {
                    const isSelected = bgType === 'color' && selectedColor.toLowerCase() === cp.value.toLowerCase();
                    return (
                      <button
                        key={cp.name}
                        onClick={() => handleSelectColor(cp.value)}
                        className={`p-2.5 rounded-xl border flex items-center space-x-2 text-left transition-all ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-500/40 bg-blue-500/10' 
                            : isDark ? 'border-slate-800 hover:border-slate-700 bg-slate-950/40' : 'border-slate-200 hover:border-slate-300 bg-white'
                        }`}
                      >
                        <span 
                          className="w-5 h-5 rounded-md border border-white/20 shrink-0"
                          style={{ backgroundColor: cp.value }}
                        />
                        <span className="text-xs truncate font-medium">{cp.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Gradient Presets */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                  Fluent Gradients
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {GRADIENT_PRESETS.map((gp) => {
                    const isSelected = bgType === 'color' && selectedColor === gp.value;
                    return (
                      <button
                        key={gp.name}
                        onClick={() => handleSelectColor(gp.value)}
                        className={`h-16 rounded-xl border p-2 text-left relative overflow-hidden transition-all flex flex-col justify-end ${
                          isSelected 
                            ? 'border-blue-500 ring-2 ring-blue-500/40' 
                            : isDark ? 'border-slate-800 hover:border-slate-700' : 'border-slate-200 hover:border-slate-300'
                        }`}
                        style={{ background: gp.value }}
                      >
                        <div className="relative z-10 flex items-center justify-between w-full">
                          <span className="text-[11px] font-semibold text-white drop-shadow-md truncate">
                            {gp.name}
                          </span>
                          {isSelected && (
                            <div className="w-4 h-4 rounded-full bg-blue-600 text-white flex items-center justify-center shrink-0">
                              <Check className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Adjust Acrylic Frosted Glass & Dimming */}
          {activeTab === 'adjust' && (
            <div className="space-y-6">
              <div className={`p-4 rounded-xl border ${
                isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-blue-50/50 border-blue-100'
              }`}>
                <div className="flex items-center space-x-2 text-xs font-semibold text-blue-400 mb-1">
                  <Layers className="w-4 h-4" />
                  <span>Readability & Contrast Enhancement</span>
                </div>
                <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                  Adjust the overlay dimming and acrylic blur to keep your website cards, titles, and text clean and easy to read over colorful wallpapers.
                </p>
              </div>

              {/* Overlay Dimming Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Overlay Tint / Dimming:</span>
                  <span className="font-mono text-blue-400">{Math.round(overlayOpacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.85"
                  step="0.05"
                  value={overlayOpacity}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setOverlayOpacity(val);
                    handleApply({ overlayOpacity: val });
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0% (Vivid Photo)</span>
                  <span>40% (Recommended)</span>
                  <span>85% (High Contrast)</span>
                </div>
              </div>

              {/* Acrylic Frosted Blur Slider */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-medium">
                  <span>Frosted Glass Blur:</span>
                  <span className="font-mono text-blue-400">{blurAmount}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="20"
                  step="2"
                  value={blurAmount}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    setBlurAmount(val);
                    handleApply({ blur: val });
                  }}
                  className="w-full accent-blue-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>0px (Crisp Wallpaper)</span>
                  <span>8px (Subtle Acrylic)</span>
                  <span>20px (Deep Frosted Glass)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-between px-6 py-3.5 border-t text-xs ${
          isDark ? 'border-slate-800 bg-slate-850/60' : 'border-slate-200 bg-slate-50'
        }`}>
          <button
            onClick={handleResetDefault}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-200 text-slate-600'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default Mica</span>
          </button>

          <button
            onClick={onClose}
            className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

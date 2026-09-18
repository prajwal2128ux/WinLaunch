import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  text: string;
  type?: 'info' | 'success' | 'warning';
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
  isDark: boolean;
}

export const Toast: React.FC<ToastProps> = ({ toasts, onDismiss, isDark }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col space-y-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-center justify-between p-3.5 rounded-xl border shadow-xl backdrop-blur-md transition-all animate-in slide-in-from-bottom-2 fade-in duration-200 ${
            isDark 
              ? 'bg-slate-900/95 border-slate-750 text-slate-100' 
              : 'bg-white/95 border-slate-200 text-slate-900'
          }`}
        >
          <div className="flex items-center space-x-2.5 min-w-0 pr-2">
            {t.type === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />}
            {t.type === 'warning' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
            {(!t.type || t.type === 'info') && <Info className="w-4 h-4 text-blue-500 shrink-0" />}
            <span className="text-xs font-medium truncate">{t.text}</span>
          </div>

          <button
            onClick={() => onDismiss(t.id)}
            className={`p-1 rounded-md transition-colors shrink-0 ${
              isDark ? 'hover:bg-slate-800 text-slate-400' : 'hover:bg-slate-100 text-slate-500'
            }`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
};

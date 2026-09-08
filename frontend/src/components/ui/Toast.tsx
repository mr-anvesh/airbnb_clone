'use client';

import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 flex flex-col gap-3 max-w-[calc(100vw-2rem)] sm:max-w-sm">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-3 rounded-[12px] px-4 py-3 shadow-lg text-white text-sm font-medium ${
            toast.type === 'error'
              ? 'bg-[#c13515]'
              : 'bg-[#222222] dark:bg-[#2c2c2c] dark:border dark:border-[#3d3d3d]'
          }`}
        >
          {toast.type === 'success' && <CheckCircle size={18} className="shrink-0 mt-0.5" />}
          {toast.type === 'error' && <AlertCircle size={18} className="shrink-0 mt-0.5" />}
          {toast.type === 'info' && <Info size={18} className="shrink-0 mt-0.5" />}
          <span className="flex-1">{toast.message}</span>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100 transition-opacity"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

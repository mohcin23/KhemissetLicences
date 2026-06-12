import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const toastClass = toast?.type === 'error'
    ? 'bg-[#7f1d1d] text-[#fca5a5] border border-[#ef4444] dark:bg-[#450a0a] dark:text-[#fecaca] dark:border-[#b91c1c]'
    : toast?.type === 'warn'
    ? 'bg-[#1e3a5f] text-[#bfdbfe] border border-[#3b82f6]'
    : 'bg-[#0d1f3c] text-[#d4aa4a] border border-[#c9a84c] dark:bg-gradient-to-br dark:from-[#0f2744] dark:to-[#153a5c] dark:text-[#fde68a] dark:border-[rgba(251,191,36,0.35)]';

  return (
    <ToastContext.Provider value={{ toast, showToast }}>
      {children}
      {toast && (
        <div className={`fixed top-5 left-1/2 -translate-x-1/2 z-[9999] px-7 py-3.5 rounded-lg text-sm font-semibold flex items-center gap-2.5 shadow-[0_10px_40px_rgba(13,31,60,0.13)] min-w-[280px] text-center justify-center animate-[slideDown_0.3s_ease] ${toastClass}`} role="alert">
          {toast.msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

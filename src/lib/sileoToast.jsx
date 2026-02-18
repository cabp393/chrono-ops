import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

const SileoToastContext = createContext({
  info: () => {},
  success: () => {},
  error: () => {}
});

function createToastId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function buildToast(type, message) {
  return {
    id: createToastId(),
    type,
    message,
    createdAt: Date.now()
  };
}

export function SileoToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Set());

  const push = useCallback((type, message) => {
    const next = buildToast(type, message);
    setToasts((prev) => [...prev, next].slice(-5));

    if (typeof window === 'undefined') return;
    const timer = window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== next.id));
      timersRef.current.delete(timer);
    }, 3500);
    timersRef.current.add(timer);
  }, []);

  const api = useMemo(
    () => ({
      info: (message) => push('info', message),
      success: (message) => push('success', message),
      error: (message) => push('error', message)
    }),
    [push]
  );

  return (
    <SileoToastContext.Provider value={api}>
      {children}
      <div className="sileo-toaster" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div key={toast.id} className={`sileo-toast ${toast.type}`} role="status">
            {toast.message}
          </div>
        ))}
      </div>
    </SileoToastContext.Provider>
  );
}

export function useSileoToast() {
  return useContext(SileoToastContext);
}

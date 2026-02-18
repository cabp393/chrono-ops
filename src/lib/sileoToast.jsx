import { createContext, useCallback, useContext, useMemo, useState } from 'react';

const SileoToastContext = createContext({
  info: () => {},
  success: () => {},
  error: () => {}
});

function buildToast(type, message) {
  return {
    id: crypto.randomUUID(),
    type,
    message,
    createdAt: Date.now()
  };
}

export function SileoToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const push = useCallback((type, message) => {
    const next = buildToast(type, message);
    setToasts((prev) => [...prev, next].slice(-5));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== next.id));
    }, 3500);
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

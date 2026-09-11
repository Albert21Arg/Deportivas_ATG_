import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const NotificationContext = createContext(null);

function Notification({ notification, onDismiss }) {
  useEffect(() => {
    const timeoutId = window.setTimeout(() => onDismiss(notification.id), notification.duration);

    return () => window.clearTimeout(timeoutId);
  }, [notification.duration, notification.id, onDismiss]);

  const isSuccess = notification.type === 'success';
  const tone = isSuccess
    ? 'border-emerald-500/40 bg-emerald-950/95 text-emerald-100'
    : 'border-red-500/40 bg-red-950/95 text-red-100';

  return (
    <div className={`pointer-events-auto w-full max-w-sm rounded-xl border p-4 shadow-2xl backdrop-blur ${tone}`} role="alert">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg" aria-hidden="true">{isSuccess ? '✓' : '!'}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{notification.title}</p>
          <p className="mt-1 text-sm leading-5 opacity-90">{notification.message}</p>
        </div>
        <button
          className="rounded p-1 text-lg leading-none opacity-70 transition hover:opacity-100"
          type="button"
          aria-label="Cerrar notificación"
          onClick={() => onDismiss(notification.id)}
        >
          ×
        </button>
      </div>
    </div>
  );
}

export function NotificationProvider({ children }) {
  const [notifications, setNotifications] = useState([]);

  const notify = useCallback(({ type = 'error', title, message, duration = 6000 }) => {
    const id = `${Date.now()}-${Math.random()}`;
    setNotifications((current) => [...current, { id, type, title, message, duration }]);
  }, []);

  const dismiss = useCallback((id) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id));
  }, []);

  return (
    <NotificationContext.Provider value={{ notify, dismiss }}>
      {children}
      <div className="pointer-events-none fixed inset-x-4 top-4 z-50 flex flex-col items-end gap-3 sm:inset-x-auto sm:right-6 sm:w-auto" aria-live="polite">
        {notifications.map((notification) => (
          <Notification key={notification.id} notification={notification} onDismiss={dismiss} />
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);

  if (!context) {
    throw new Error('useNotifications debe utilizarse dentro de NotificationProvider');
  }

  return context;
}

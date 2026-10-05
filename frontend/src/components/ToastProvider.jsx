import React, { useCallback, useState } from 'react';
import { AlertCircle, CheckCircle2, X } from 'lucide-react';
import { ToastContext } from '../utils/toast';

const TOAST_DURATION_MS = 4500;
let nextId = 1;

// Holds the list of visible notifications and renders them in the bottom-right corner
export default function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);

  const showToast = useCallback(
    (message, type = 'success') => {
      if (!message) return;
      const id = nextId++;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismiss(id), TOAST_DURATION_MS);
    },
    [dismiss]
  );

  return (
    <ToastContext.Provider value={showToast}>
      {children}
      <div className="toast-stack" role="status" aria-live="polite">
        {toasts.map(({ id, message, type }) => {
          const Icon = type === 'error' ? AlertCircle : CheckCircle2;
          return (
            <div key={id} className={`toast toast-${type}`}>
              <Icon size={16} className="toast-icon" />
              <span>{message}</span>
              <button type="button" className="toast-close" onClick={() => dismiss(id)} aria-label="Dismiss">
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

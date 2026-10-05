import { createContext, useContext } from 'react';

export const ToastContext = createContext(() => {});

// showToast(message, type) shows a small notification that hides itself. type: 'success' | 'error'
export const useToast = () => useContext(ToastContext);

import { useEffect } from 'react';

// localStorage keys
export const STORAGE_KEYS = {
  user: 'anugrah_user',
  token: 'anugrah_token',
  theme: 'anugrah_theme',
  sidebarCollapsed: 'anugrah_sidebar_collapsed',
};

// One-time move of values saved under the old "beacon_" names, so nobody gets logged out
try {
  Object.values(STORAGE_KEYS).forEach((key) => {
    const oldKey = key.replace('anugrah_', 'beacon_');
    const oldValue = localStorage.getItem(oldKey);
    if (oldValue !== null && localStorage.getItem(key) === null) localStorage.setItem(key, oldValue);
    localStorage.removeItem(oldKey);
  });
} catch {
  // storage unavailable
}

// localStorage can throw (private mode, blocked storage), so wrap every access.
export const storage = {
  get(key) {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, value);
    } catch {
      // ignore
    }
  },
  remove(...keys) {
    try {
      keys.forEach((key) => localStorage.removeItem(key));
    } catch {
      // ignore
    }
  },
};

export const fullName = (user) => `${user?.firstname || ''} ${user?.lastname || ''}`.trim();

export const getInitials = (user) => `${user?.firstname?.[0] || ''}${user?.lastname?.[0] || ''}`.toUpperCase() || 'U';

// Default note the server writes when a mentor leaves the note empty (it only repeats what the card shows)
export const isAutoNote = (req) => /^Mentor .+ requested (to mentor|removal of mentee) /.test(req.notes || '');

// Admins always count as verified
export const isVerified = (user) => Boolean(user?.isApproved || user?.role === 'Admin');

// True when `query` is empty or appears in any of the given text values
export const matchesSearch = (query, values) => {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return values.some((value) => (value || '').toLowerCase().includes(q));
};

// Close a modal when Escape is pressed
export function useEscapeKey(onEscape) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onEscape();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onEscape]);
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Read an image file as a data URL. Rejects files over 8MB.
export const readImageFile = (file) =>
  new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error('Image file size should be less than 8MB.'));
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the image file.'));
    reader.readAsDataURL(file);
  });

// Same rules as the backend (backend/utils/helpers.js)
export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(email || '').trim());

// 10-digit mobile number, optionally with +91 / 0 in front and spaces or dashes
export const isValidMobile = (value) => {
  let digits = String(value || '').replace(/[\s-]/g, '');
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('0')) digits = digits.slice(1);
  return /^\d{10}$/.test(digits);
};

export const INVALID_MOBILE_MESSAGE = 'Enter a valid 10-digit mobile number.';
export const INVALID_EMAIL_MESSAGE = 'Enter a valid email address.';

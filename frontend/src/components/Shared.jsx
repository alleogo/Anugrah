import React, { useState } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { fullName, getInitials, useEscapeKey } from '../utils/helpers';

// Colors used for each role across avatars and badges
const ROLE_STYLES = {
  Admin: {
    gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
    border: 'rgba(239, 68, 68, 0.5)',
    badge: 'badge-coral',
  },
  Mentor: {
    gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    border: 'rgba(245, 158, 11, 0.5)',
    badge: 'badge-amber',
  },
  Mentee: {
    gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    border: 'rgba(16, 185, 129, 0.5)',
    badge: 'badge-emerald',
  },
};

export const roleGradient = (role) => (ROLE_STYLES[role] || ROLE_STYLES.Mentee).gradient;

// Round profile picture, or the user's initials on a role-colored circle.
// `src` overrides user.avatar (e.g. to preview a freshly cropped image).
export function Avatar({ user, size = 40, src = user?.avatar, shadow = false }) {
  const roleStyle = ROLE_STYLES[user?.role] || ROLE_STYLES.Mentee;
  const base = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: '50%',
    flexShrink: 0,
    boxShadow: shadow ? '0 4px 14px rgba(0, 0, 0, 0.15)' : undefined,
  };

  if (src) {
    return (
      <img
        src={src}
        alt={fullName(user)}
        style={{ ...base, objectFit: 'cover', border: `2px solid ${roleStyle.border}` }}
      />
    );
  }

  return (
    <div
      style={{
        ...base,
        background: roleStyle.gradient,
        color: '#ffffff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: `${Math.round(size * 0.38)}px`,
        fontWeight: 700,
      }}
    >
      {getInitials(user)}
    </div>
  );
}

export function RoleBadge({ role, style }) {
  const roleStyle = ROLE_STYLES[role];
  if (!roleStyle) return null;
  return (
    <span className={`badge ${roleStyle.badge}`} style={style}>
      {role}
    </span>
  );
}

export function LinkedInIcon({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#0077b5">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.763z" />
    </svg>
  );
}

// Red error / green success banner
export function Alert({ type = 'error', message, style }) {
  if (!message) return null;
  const Icon = type === 'error' ? AlertCircle : CheckCircle2;
  return (
    <div className={`alert alert-${type}`} style={style}>
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}

// Page title shown at the top of each dashboard
export function PageHeader({ title, subtitle }) {
  return (
    <header className="page-header">
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </header>
  );
}

// Placeholder blocks shown while data loads (instead of a spinner)
export function LoadingBlocks({ rows = 3 }) {
  return (
    <div className="loading-blocks" aria-busy="true" aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="loading-block" />
      ))}
    </div>
  );
}

// In-app replacement for window.confirm / window.prompt.
// Pass `noteLabel` to show an optional text box; its value is given to onConfirm.
export function ConfirmDialog({
  title,
  message,
  confirmLabel = 'Confirm',
  danger = false,
  noteLabel,
  onConfirm,
  onCancel,
}) {
  const [note, setNote] = useState('');
  useEscapeKey(onCancel);

  return (
    <div className="dialog-backdrop" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
        <h2 id="confirm-dialog-title">{title}</h2>
        {message && <p>{message}</p>}
        {noteLabel && (
          <label className="dialog-note">
            <span>{noteLabel}</span>
            <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className="input-field" />
          </label>
        )}
        <div className="dialog-actions">
          <button type="button" className="btn-secondary" onClick={onCancel} autoFocus>
            Cancel
          </button>
          <button
            type="button"
            className={danger ? 'btn-danger' : 'btn-primary'}
            onClick={() => onConfirm(note.trim())}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

import React, { useId } from 'react';

/**
 * AnugrahLogo - Signature emblem for the ANUGRAH Mentorship Platform.
 * Features a high-contrast glowing Deepak/Flame of knowledge (Jyoti)
 * cradled in the golden vessel of grace (Anugrah).
 */
export default function AnugrahLogo({ size = 26, className = '', style = {} }) {
  // Unique gradient ids so several logos on one page don't clash
  const uniqueId = useId().replace(/:/g, '');

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.35))',
        ...style,
      }}
      aria-label="ANUGRAH Logo"
    >
      <defs>
        {/* Outer Grace Arc Gradient */}
        <linearGradient id={`${uniqueId}-arc`} x1="4" y1="26" x2="28" y2="16" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="50%" stopColor="#fbbf24" />
          <stop offset="100%" stopColor="#d97706" />
        </linearGradient>

        {/* Primary Wisdom Flame Gradient */}
        <linearGradient id={`${uniqueId}-flame`} x1="16" y1="2" x2="16" y2="24" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="20%" stopColor="#fef08a" />
          <stop offset="50%" stopColor="#f59e0b" />
          <stop offset="85%" stopColor="#d97706" />
          <stop offset="100%" stopColor="#9a3412" />
        </linearGradient>

        {/* Inner Core Enlightenment Gradient */}
        <linearGradient id={`${uniqueId}-core`} x1="16" y1="8" x2="16" y2="21" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="60%" stopColor="#fef08a" />
          <stop offset="100%" stopColor="#f59e0b" />
        </linearGradient>
      </defs>

      {/* Subtle Radiant Warm Aura */}
      <circle cx="16" cy="16" r="14" fill="#f59e0b" opacity="0.12" />

      {/* Base Vessel / Cradle of Grace (Diya Base) */}
      <path
        d="M 5 20 C 5 26.5, 27 26.5, 27 20 C 25 24, 19.5 25.5, 16 25.5 C 12.5 25.5, 7 24, 5 20 Z"
        fill={`url(#${uniqueId}-arc)`}
      />

      {/* Main Ascending Flame of Knowledge */}
      <path
        d="M 16 2.5 C 18.4 7, 23 11.5, 23 16.5 C 23 20.5, 19.8 23.5, 16 23.5 C 12.2 23.5, 9 20.5, 9 16.5 C 9 11.5, 13.6 7, 16 2.5 Z"
        fill={`url(#${uniqueId}-flame)`}
      />

      {/* Inner Heart / Luminescent Flame Core */}
      <path
        d="M 16 8 C 17.5 11, 19.6 13.5, 19.6 16.5 C 19.6 18.6, 18 20.3, 16 20.3 C 14 20.3, 12.4 18.6, 12.4 16.5 C 12.4 13.5, 14.5 11, 16 8 Z"
        fill={`url(#${uniqueId}-core)`}
      />

      {/* Radiant Bindu (Point of Insight & Guidance) */}
      <circle cx="16" cy="15.5" r="1.8" fill="#ffffff" />
    </svg>
  );
}

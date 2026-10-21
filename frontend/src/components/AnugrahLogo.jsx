import React from 'react';
import logoUrl from '../assets/anugrah-logo.png';

// Anugrah logo: a mentor helping a mentee up the steps, towards a star.
// In dark mode it sits on a light round badge (see .anugrah-logo in index.css) so the navy stays visible.
export default function AnugrahLogo({ size = 26, className = '', style = {} }) {
  return (
    <img
      src={logoUrl}
      width={size}
      height={size}
      alt="ANUGRAH Logo"
      className={`anugrah-logo ${className}`.trim()}
      style={style}
    />
  );
}

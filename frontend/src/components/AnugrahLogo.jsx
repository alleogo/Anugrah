import React from 'react';
import logoUrl from '../assets/anugrah-logo.png';

// Anugrah logo: a mentor helping a mentee up the steps, towards a star.
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

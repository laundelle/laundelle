'use client';

import React, { useEffect, useState } from 'react';

/**
 * BottomBlurMask Component
 * Keeps the bottom 30–40% of the viewport softly blurred as the user scrolls,
 * creating a modern, premium frosted-glass reveal mask for content emerging
 * from the bottom of the screen.
 *
 * Fully non-blocking (pointer-events-none) and responsive across all viewports.
 */
export const BottomBlurMask: React.FC = () => {
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      // Fade in smoothly as the user starts scrolling through content
      if (window.scrollY > 20) {
        setHasScrolled(true);
      } else {
        setHasScrolled(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed bottom-14 lg:bottom-0 left-0 right-0 z-20 h-[30vh] sm:h-[34vh] md:h-[38vh] transition-opacity duration-700 ease-out select-none ${
        hasScrolled ? 'opacity-100' : 'opacity-0'
      }`}
      style={{
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        maskImage:
          'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
        WebkitMaskImage:
          'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0.7) 35%, rgba(0,0,0,0.2) 70%, rgba(0,0,0,0) 100%)',
      }}
    />
  );
};

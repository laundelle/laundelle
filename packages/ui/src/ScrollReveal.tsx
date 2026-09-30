'use client';

import React from 'react';
import { motion } from 'motion/react';

interface ScrollRevealProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  yOffset?: number;
  blur?: number;
  duration?: number;
  threshold?: number;
  once?: boolean;
}

/**
 * ScrollReveal Component
 * Smooth reveal effect for components as they enter the viewport.
 * Animates opacity and vertical translation smoothly into position without blur effects.
 */
export const ScrollReveal: React.FC<ScrollRevealProps> = ({
  children,
  className = '',
  delay = 0,
  yOffset = 32,
  blur = 0,
  duration = 0.8,
  threshold = 0.06,
  once = true,
}) => {
  return (
    <motion.div
      initial={{
        opacity: 0.25,
        y: yOffset,
      }}
      whileInView={{
        opacity: 1,
        y: 0,
      }}
      viewport={{
        once,
        amount: threshold,
        margin: '0px 0px -60px 0px',
      }}
      transition={{
        duration,
        delay,
        ease: [0.16, 1, 0.3, 1], // Smooth fluid SaaS cubic-bezier curve
      }}
      className={className}
      style={{
        willChange: 'transform, opacity',
        transform: 'translateZ(0)',
      }}
    >
      {children}
    </motion.div>
  );
};


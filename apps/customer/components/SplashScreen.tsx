'use client';

import React, { useEffect, useState } from 'react';
import { Shirt, ShoppingBasket, Bike, Droplets, Sparkles } from 'lucide-react';

interface SplashScreenProps {
  onComplete?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  durationMs = 3200,
}) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        if (onComplete) {
          onComplete();
        }
      }, 500);
    }, durationMs - 500);

    return () => clearTimeout(timer);
  }, [durationMs, onComplete]);

  const handleSkip = () => {
    setIsExiting(true);
    setTimeout(() => {
      if (onComplete) {
        onComplete();
      }
    }, 300);
  };

  return (
    <div
      onClick={handleSkip}
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-[#FAFCFF] overflow-hidden select-none cursor-pointer transition-all duration-500 ${
        isExiting ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* ---------------------------------------------------- */}
      {/* TOP-RIGHT RICH DIFFUSED COLOR AURA GLOW (#03045E)     */}
      {/* (Ultra-heavy blur, no hard border or shape outline)  */}
      {/* ---------------------------------------------------- */}
      <div className="absolute -top-24 -right-24 w-[400px] sm:w-[550px] md:w-[650px] h-[400px] sm:h-[550px] md:h-[650px] rounded-full bg-gradient-to-br from-[#03045E]/45 via-[#023E8A]/30 to-transparent blur-3xl sm:blur-[110px] pointer-events-none z-0" />

      {/* ---------------------------------------------------- */}
      {/* BOTTOM-LEFT RICH DIFFUSED COLOR AURA GLOW (#00B4D8)   */}
      {/* (Ultra-heavy blur, no hard border or shape outline)  */}
      {/* ---------------------------------------------------- */}
      <div className="absolute -bottom-24 -left-24 w-[400px] sm:w-[550px] md:w-[650px] h-[400px] sm:h-[550px] md:h-[650px] rounded-full bg-gradient-to-tr from-[#00B4D8]/45 via-[#48CAE4]/30 to-transparent blur-3xl sm:blur-[110px] pointer-events-none z-0" />

      {/* ---------------------------------------------------- */}
      {/* SINGLE DASHED LINE ON TOP-LEFT SIDE                  */}
      {/* ---------------------------------------------------- */}
      <div className="absolute top-0 left-0 w-[280px] sm:w-[420px] md:w-[500px] h-[280px] sm:h-[420px] md:h-[500px] pointer-events-none z-1 overflow-hidden opacity-40">
        <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M -30 180 C 180 180, 280 100, 380 -30"
            stroke="#0077B6"
            strokeWidth="3"
            strokeDasharray="8 8"
          />
        </svg>
      </div>

      {/* ---------------------------------------------------- */}
      {/* SINGLE DASHED LINE ON BOTTOM-RIGHT SIDE              */}
      {/* ---------------------------------------------------- */}
      <div className="absolute bottom-0 right-0 w-[280px] sm:w-[420px] md:w-[500px] h-[280px] sm:h-[420px] md:h-[500px] pointer-events-none z-1 overflow-hidden opacity-40">
        <svg className="w-full h-full" viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M 530 320 C 320 320, 220 400, 120 530"
            stroke="#00B4D8"
            strokeWidth="3"
            strokeDasharray="8 8"
          />
        </svg>
      </div>

      {/* ---------------------------------------------------- */}
      {/* 5 STATIONARY STILL ICONS (FAINT 20% OPACITY)         */}
      {/* ---------------------------------------------------- */}
      <div className="absolute inset-0 pointer-events-none z-5 overflow-hidden">
        {/* 1. Shirt Icon - Upper Right Area */}
        <div className="absolute top-[22%] right-[26%] sm:right-[30%] opacity-20 text-[#0077B6] transform rotate-12">
          <Shirt className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* 2. Laundry Basket Icon - Lower Left Area */}
        <div className="absolute bottom-[22%] left-[24%] sm:left-[28%] opacity-20 text-[#03045E] transform -rotate-12">
          <ShoppingBasket className="w-9 h-9 sm:w-11 sm:h-11" />
        </div>

        {/* 3. Delivery Bike Icon - Mid Left Area */}
        <div className="absolute top-[34%] left-[22%] sm:left-[25%] opacity-20 text-[#00B4D8] transform -rotate-6">
          <Bike className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* 4. Water Droplets Icon - Mid Right Area */}
        <div className="absolute top-[48%] right-[20%] sm:right-[24%] opacity-20 text-[#00B4D8] transform rotate-6">
          <Droplets className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>

        {/* 5. Sparkles / Towel Care Icon - Lower Right Area */}
        <div className="absolute bottom-[28%] right-[30%] sm:right-[34%] opacity-20 text-[#0077B6] transform rotate-4">
          <Sparkles className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
      </div>

      {/* Ambient Center Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[420px] sm:w-[500px] h-[420px] sm:h-[500px] bg-[#CAF0F8]/50 rounded-full blur-3xl pointer-events-none" />

      {/* ---------------------------------------------------- */}
      {/* CENTERED CLEAN UNBOXED BRAND CONTENT                 */}
      {/* ---------------------------------------------------- */}
      <div className="relative z-20 flex flex-col items-center justify-center px-4 sm:px-8 text-center max-w-lg sm:max-w-xl md:max-w-2xl w-full">
        
        {/* 1. TOP OVERFLOW CONTAINER FOR LAUNDELLE TEXT */}
        {/* Text emerges UPWARDS out from behind the horizontal line */}
        <div className="overflow-hidden px-2 pt-3 pb-1">
          <h1 className="text-5xl sm:text-6xl md:text-7xl lg:text-7xl xl:text-8xl font-heading font-black tracking-widest uppercase leading-none flex items-center justify-center animate-slide-up-from-line">
            <span className="text-[#03045E]">LAUN</span>
            <span className="text-[#00B4D8]">DELLE</span>
          </h1>
        </div>

        {/* 2. CENTER HORIZONTAL DIVIDER LINE */}
        {/* Expands horizontally outwards from center */}
        <div className="w-[85%] sm:w-[90%] md:w-[95%] h-[3px] my-1.5 relative">
          <div className="w-full h-full bg-gradient-to-r from-[#03045E] via-[#0077B6] to-[#00B4D8] rounded-full animate-expand-line shadow-xs" />
        </div>

        {/* 3. BOTTOM OVERFLOW CONTAINER FOR SUBTITLE TEXT */}
        {/* Subtitle text emerges DOWNWARDS out from behind the horizontal line */}
        <div className="overflow-hidden px-2 pt-1 pb-3">
          <p className="text-[11px] sm:text-xs md:text-sm font-bold tracking-[0.3em] sm:tracking-[0.35em] text-[#0077B6] uppercase animate-slide-down-from-line">
            Fresh & Spotless Delivered
          </p>
        </div>

        {/* Tap to skip prompt */}
        <span className="mt-10 sm:mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest hover:text-[#03045E] transition-colors opacity-75">
          Tap anywhere to enter
        </span>
      </div>
    </div>
  );
};

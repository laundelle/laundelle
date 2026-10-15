'use client';

import React from 'react';
import Image from 'next/image';
import { useAuth0 } from '@auth0/auth0-react';
import { Building2, Lock, Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, LogOut } from 'lucide-react';
import { LAUNDELLE_IMAGES, getOptimizedImageUrl } from '@laundelle/config';

interface ManagerLoginPageProps {
  onManagerLoginSuccess?: (email: string, name: string, role?: string) => void;
  onNavigateToCustomer: () => void;
  onNavigateToAdminLogin?: () => void;
  errorMessage?: string | null;
  onAuth0Logout?: () => void;
}

export const ManagerLoginPage: React.FC<ManagerLoginPageProps> = ({
  onNavigateToCustomer,
  onNavigateToAdminLogin,
  errorMessage,
  onAuth0Logout,
}) => {
  const { loginWithRedirect, isLoading: isAuth0Loading, isAuthenticated: isAuth0Authenticated, logout } = useAuth0();

  const handleEmailAuth0Login = () => {
    const authParams: any = {
      prompt: 'login',
    };
    const dbConnection = process.env.NEXT_PUBLIC_AUTH0_DB_CONNECTION || 'Username-Password-Authentication';
    if (dbConnection) authParams.connection = dbConnection;

    loginWithRedirect({
      appState: {
        returnTo: '/manager',
      },
      authorizationParams: authParams,
    }).catch(() => {
      loginWithRedirect({
        appState: {
          returnTo: '/manager',
        },
        authorizationParams: {
          prompt: 'login',
        },
      });
    });
  };

  const handleLogout = () => {
    if (onAuth0Logout) {
      onAuth0Logout();
    } else {
      logout({
        logoutParams: {
          returnTo: typeof window !== 'undefined' ? `${window.location.origin}/manager` : undefined,
        },
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-4xl bg-white rounded-3xl p-6 sm:p-10 lg:p-12 shadow-xl border border-slate-200 animate-in fade-in duration-200 relative overflow-hidden">
        <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
          {/* Left Column: Avatar & Brand Hero */}
          <div className="flex flex-col items-center justify-center text-center">
            <div className="relative w-64 h-64 sm:w-72 sm:h-72 md:w-80 md:h-80 flex items-center justify-center">
              <Image
                src={getOptimizedImageUrl(LAUNDELLE_IMAGES.managerAuthHero, { width: 640, quality: 'auto', format: 'auto' })}
                alt="Plant Manager"
                fill
                sizes="(max-width: 768px) 288px, 320px"
                priority
                className="relative z-10 object-contain rounded-full drop-shadow-md"
              />
            </div>
            <div className="mt-4 flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-bold">
              <Building2 className="w-3.5 h-3.5 text-[#0077B6]" />
              <span>Plant Facility Dispatch & Management</span>
            </div>
          </div>

          {/* Right Column: Log in or create an account */}
          <div className="flex flex-col justify-center space-y-4">
            <div className="space-y-1">
              <h1 className="text-2xl sm:text-3xl font-heading font-black text-slate-900 tracking-tight">
                Log in or create an account
              </h1>
              <p className="text-xs text-slate-500">
                Sign in with your verified facility manager credentials via Auth0 SSO.
              </p>
            </div>

            {/* Access Restriction Card */}
            {errorMessage && (
              <div className="bg-red-50 text-red-800 p-4 sm:p-5 rounded-2xl text-xs font-semibold border border-red-200 space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 shrink-0 text-red-600 mt-0.5" />
                  <div className="space-y-1 flex-1">
                    <span className="font-extrabold text-red-900 text-sm block">Access Restricted</span>
                    <span className="text-red-700 leading-relaxed block">{errorMessage}</span>
                  </div>
                </div>
                {isAuth0Authenticated && (
                  <div className="pt-2 border-t border-red-200/60 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors flex items-center gap-1.5"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Switch Account</span>
                    </button>
                    <button
                      type="button"
                      onClick={onNavigateToCustomer}
                      className="text-red-700 hover:text-red-900 underline font-bold text-xs cursor-pointer"
                    >
                      Customer Portal →
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Email-Only Authentication Option */}
            <div className="space-y-3 pt-1">
              <button
                type="button"
                onClick={handleEmailAuth0Login}
                disabled={isAuth0Loading}
                className="w-full h-13 bg-linear-to-r from-slate-950 via-slate-900 to-[#0077B6] hover:from-slate-900 hover:to-[#005f92] text-white rounded-xl px-5 flex items-center justify-between text-sm font-bold shadow-md hover:shadow-lg transition-all cursor-pointer group active:scale-99 disabled:opacity-60"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                    <Mail className="w-4 h-4 text-white" />
                  </div>
                  <span>Continue with Manager Email</span>
                </div>
                {isAuth0Loading ? (
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <ArrowRight className="w-4 h-4 text-white/80 group-hover:translate-x-1 transition-transform" />
                )}
              </button>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 leading-relaxed space-y-1">
                <div className="flex items-center gap-1.5 font-semibold text-slate-700">
                  <Lock className="w-3.5 h-3.5 text-[#0077B6]" />
                  <span>Manager Authentication Policy</span>
                </div>
                <p>
                  Social identity providers (Google, Apple, Facebook, Microsoft) are disabled for plant operations. Please sign in with your authorized manager email.
                </p>
              </div>
            </div>

            {isAuth0Authenticated && errorMessage && (
              <button
                type="button"
                onClick={handleLogout}
                className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98 mt-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Switch Auth0 Account</span>
              </button>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-slate-100 text-xs font-bold">
              <button
                onClick={onNavigateToCustomer}
                className="text-slate-500 hover:text-slate-900 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Operations Home
              </button>
              {onNavigateToAdminLogin && (
                <button
                  onClick={onNavigateToAdminLogin}
                  className="text-[#0077B6] hover:underline cursor-pointer transition-colors"
                >
                  Admin Portal →
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Decorative Wave structure inside the box */}
        <svg
          className="absolute bottom-0 left-0 w-full h-24 sm:h-32 pointer-events-none z-0"
          viewBox="0 0 1440 200"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <path
            fill="#2563eb"
            d="M0,70 C180,170 360,10 540,70
               S900,170 1080,70
               S1260,10 1440,70
               L1440,200 L0,200 Z"
          />
        </svg>
      </div>
    </div>
  );
};

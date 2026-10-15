'use client';

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Truck, Lock, Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface DriverLoginPageProps {
  onDriverLoginSuccess?: (email: string, name: string, role?: string) => void;
  onNavigateToCustomer: () => void;
  errorMessage?: string | null;
  onAuth0Logout?: () => void;
}

export const DriverLoginPage: React.FC<DriverLoginPageProps> = ({
  onNavigateToCustomer,
  errorMessage,
  onAuth0Logout,
}) => {
  const { loginWithRedirect, isLoading: isAuth0Loading, isAuthenticated: isAuth0Authenticated, logout } = useAuth0();

  const handleAuth0Login = () => {
    const authParams: any = {
      prompt: 'login',
    };
    const dbConnection = process.env.NEXT_PUBLIC_AUTH0_DB_CONNECTION || 'Username-Password-Authentication';
    if (dbConnection) authParams.connection = dbConnection;

    loginWithRedirect({
      appState: {
        returnTo: '/driver',
      },
      authorizationParams: authParams,
    }).catch(() => {
      loginWithRedirect({
        appState: {
          returnTo: '/driver',
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
          returnTo: typeof window !== 'undefined' ? `${window.location.origin}/driver` : undefined,
        },
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl p-8 shadow-xl space-y-6 relative overflow-hidden border border-slate-200 animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5 pb-1">
          <div className="w-12 h-12 bg-blue-50 text-[#0077B6] rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-xl border border-blue-100 shadow-xs">
            <Truck className="w-6 h-6 text-[#0077B6]" />
          </div>
          <div>
            <h1 className="text-2xl font-heading font-extrabold text-slate-900">Driver Portal</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
              Sign in with your Auth0 courier credentials to view live runs, collection manifests, and OTP verification.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-2xl text-xs font-semibold border border-red-200 flex items-start gap-2.5 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMessage}</span>
              {isAuth0Authenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block text-red-700 font-bold underline hover:text-red-900 cursor-pointer text-[11px]"
                >
                  Log out of this Auth0 account
                </button>
              )}
            </div>
          </div>
        )}

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center gap-2 font-bold text-slate-900">
            <Lock className="w-3.5 h-3.5 text-[#0077B6]" />
            <span>Courier Email Authentication</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Courier access requires authorized email credentials. Social sign-in (Google, Apple, Facebook, Microsoft) is disabled for logistics security.
          </p>
        </div>

        <div className="space-y-3 pt-1">
          {isAuth0Authenticated && errorMessage ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-xs cursor-pointer transition-all active:scale-98"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAuth0Login}
              disabled={isAuth0Loading}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 px-4 rounded-xl text-xs font-extrabold flex items-center justify-center gap-2.5 shadow-xs cursor-pointer transition-all active:scale-98 disabled:opacity-60"
            >
              {isAuth0Loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting to Auth0...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4 text-slate-300" />
                  <span>Continue with Courier Email</span>
                  <ArrowRight className="w-4 h-4 text-slate-300" />
                </>
              )}
            </button>
          )}

          <p className="text-[11px] text-center text-slate-400">
            Email credential login enforced &bull; Route & delivery integrity protected
          </p>
        </div>

        <div className="pt-4 border-t border-slate-100 text-center relative z-10">
          <button
            onClick={onNavigateToCustomer}
            className="text-xs font-bold text-slate-500 hover:text-slate-900 flex items-center justify-center gap-1 mx-auto cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Home
          </button>
        </div>

        {/* Decorative Wave structure inside the box */}
        <svg
          className="absolute bottom-0 left-0 w-full h-20 sm:h-24 pointer-events-none z-0"
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

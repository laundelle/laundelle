'use client';

import React from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Cpu, Lock, Mail, ArrowRight, ArrowLeft, Loader2, AlertCircle, LogOut } from 'lucide-react';

interface ProcessorLoginPageProps {
  onProcessorLoginSuccess?: (email: string, name: string, role?: string) => void;
  onNavigateToCustomer: () => void;
  errorMessage?: string | null;
  onAuth0Logout?: () => void;
}

export const ProcessorLoginPage: React.FC<ProcessorLoginPageProps> = ({
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
        returnTo: '/processor',
      },
      authorizationParams: authParams,
    }).catch(() => {
      loginWithRedirect({
        appState: {
          returnTo: '/processor',
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
          returnTo: typeof window !== 'undefined' ? `${window.location.origin}/processor` : undefined,
        },
      });
    }
  };

  return (
    <div className="w-full min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl p-7 shadow-2xs space-y-6 border border-slate-200/80 animate-in fade-in duration-200">
        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="w-11 h-11 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center mx-auto mb-2 border border-blue-100">
            <Cpu className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Processor Portal</h1>
            <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed mt-1">
              Sign in to manage plant wash queues and quality checks.
            </p>
          </div>
        </div>

        {errorMessage && (
          <div className="bg-red-50 text-red-700 p-3 rounded-xl text-xs font-medium border border-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500 mt-0.5" />
            <div className="space-y-1">
              <span>{errorMessage}</span>
              {isAuth0Authenticated && (
                <button
                  type="button"
                  onClick={handleLogout}
                  className="block text-red-700 font-semibold underline hover:text-red-900 cursor-pointer text-[11px]"
                >
                  Log out of this Auth0 account
                </button>
              )}
            </div>
          </div>
        )}

        <div className="space-y-3 pt-1">
          {isAuth0Authenticated && errorMessage ? (
            <button
              type="button"
              onClick={handleLogout}
              className="w-full bg-red-600 hover:bg-red-700 text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors"
            >
              <LogOut className="w-4 h-4" />
              <span>Switch Account</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAuth0Login}
              disabled={isAuth0Loading}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs cursor-pointer transition-colors disabled:opacity-60"
            >
              {isAuth0Loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Connecting to Auth0...</span>
                </>
              ) : (
                <>
                  <Mail className="w-4 h-4" />
                  <span>Continue with Operator Email</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 text-center">
          <button
            onClick={onNavigateToCustomer}
            className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center justify-center gap-1 mx-auto cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Operations Home
          </button>
        </div>
      </div>
    </div>
  );
};

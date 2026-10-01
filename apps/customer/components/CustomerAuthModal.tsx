'use client';

import React, { useState } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { X, Lock, ArrowRight, ShieldCheck, Mail, User, Phone, Eye, EyeOff, AlertCircle, Loader2 } from 'lucide-react';
import { mongoSignIn, mongoSignUp } from '@laundelle/api-client';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess?: (email: string, name: string, userId?: string) => void;
  onNavigateRoleLogin?: (role: any) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
}) => {
  const { loginWithRedirect, isLoading: isAuth0Loading } = useAuth0();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form State
  const [fullName, setFullName] = useState('');
  const [phoneCountryCode, setPhoneCountryCode] = useState('+44');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleAuth0Action = () => {
    try {
      if (typeof window !== 'undefined') {
        const cartWasOpen = document.querySelector('[data-cart-drawer="open"]');
        if (cartWasOpen) localStorage.setItem('laundelle_open_cart', 'true');
      }
    } catch {}

    loginWithRedirect({
      appState: {
        returnTo: typeof window !== 'undefined' && window.location.pathname !== '/' ? window.location.pathname : '/home',
      },
      authorizationParams: {
        screen_hint: mode === 'register' ? 'signup' : undefined,
      },
    });
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const formattedEmail = email.toLowerCase().trim();
    if (!formattedEmail || !password) {
      setError('Please provide your email and password.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const trimmedName = fullName.trim();
        const cleanedPhone = phone.replace(/[^0-9]/g, '');

        if (!trimmedName || trimmedName.length < 2) {
          setError('Please provide your username / full name (minimum 2 characters).');
          setIsSubmitting(false);
          return;
        }

        if (!cleanedPhone || cleanedPhone.length < 7) {
          setError('Please provide a valid mobile number (minimum 7 digits).');
          setIsSubmitting(false);
          return;
        }

        if (password.length < 8) {
          setError('Password must be at least 8 characters long.');
          setIsSubmitting(false);
          return;
        }

        const fullPhoneNumber = `${phoneCountryCode}${cleanedPhone}`;
        const result = await mongoSignUp(formattedEmail, password, trimmedName, fullPhoneNumber);

        if (result.error || !result.user) {
          setError(result.error || 'Registration failed. Please try again.');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess?.(result.user.email, result.user.name, result.user.id);
        onClose();
      } else {
        // Sign In
        const result = await mongoSignIn(formattedEmail, password);

        if (result.error || !result.user) {
          setError(result.error || 'Invalid email or password.');
          setIsSubmitting(false);
          return;
        }

        onLoginSuccess?.(result.user.email, result.user.name, result.user.id);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-5 relative my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-2xl shadow-sm">
            L2U
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-[#03045E]">
            {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Sign in to track live orders, view invoices, and book laundry slots.'
              : 'Register to manage orders, schedule pickups, and get pristine clothes delivered.'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl text-xs font-extrabold">
          <button
            onClick={() => {
              setMode('login');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${mode === 'login' ? 'bg-[#03045E] text-white shadow-xs' : 'text-gray-600'}`}
          >
            Sign In
          </button>
          <button
            onClick={() => {
              setMode('register');
              setError(null);
            }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${mode === 'register' ? 'bg-[#03045E] text-white shadow-xs' : 'text-gray-600'}`}
          >
            Sign Up
          </button>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        {/* Social / Auth0 Universal Login Button */}
        <div>
          <button
            type="button"
            onClick={handleAuth0Action}
            disabled={isAuth0Loading}
            className="w-full py-3 px-4 bg-gray-50 hover:bg-gray-100 text-[#03045E] border border-gray-200 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-98 disabled:opacity-60"
          >
            <Lock className="w-4 h-4 text-[#0077B6]" />
            <span>Continue with Google / Auth0 ({mode === 'login' ? 'Sign In' : 'Sign Up'})</span>
            <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
          </button>
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center">
          <div className="border-t border-gray-200 w-full" />
          <span className="bg-white px-3 text-[11px] font-bold text-gray-400 uppercase tracking-wider shrink-0">
            or {mode === 'register' ? 'register with details' : 'sign in with email'}
          </span>
          <div className="border-t border-gray-200 w-full" />
        </div>

        {/* Manual Form */}
        <form onSubmit={handleManualSubmit} className="space-y-3.5">
          {mode === 'register' && (
            <>
              {/* Username / Full Name */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Username / Full Name <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full h-10.5 pl-10 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                  />
                </div>
              </div>

              {/* Mobile Number with Country Code Dropdown */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mobile Number <span className="text-red-500">*</span>
                </label>
                <div className="relative flex items-center">
                  <select
                    value={phoneCountryCode}
                    onChange={(e) => setPhoneCountryCode(e.target.value)}
                    className="h-10.5 px-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#0077B6] cursor-pointer shrink-0"
                  >
                    <option value="+44">🇬🇧 +44 (UK)</option>
                    <option value="+1">🇺🇸 +1 (US)</option>
                    <option value="+91">🇮🇳 +91 (IN)</option>
                    <option value="+971">🇦🇪 +971 (AE)</option>
                    <option value="+61">🇦🇺 +61 (AU)</option>
                    <option value="+33">🇫🇷 +33 (FR)</option>
                    <option value="+49">🇩🇪 +49 (DE)</option>
                    <option value="+353">🇮🇪 +353 (IE)</option>
                  </select>
                  <div className="relative flex-1">
                    <div className="absolute left-3 top-3 text-gray-400 pointer-events-none">
                      <Phone className="w-4 h-4" />
                    </div>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="7700 900000"
                      className="w-full h-10.5 pl-9 pr-3.5 rounded-r-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Email Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full h-10.5 pl-10 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Minimum 8 characters' : 'Enter password'}
                className="w-full h-10.5 pl-10 pr-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#48CAE4]" />
                  <span>{mode === 'register' ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{mode === 'register' ? 'Create Customer Account' : 'Sign In with Email'}</span>
              )}
            </button>
          </div>
        </form>

        {/* Security Assurance */}
        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium pt-1">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Encrypted and stored in Laundelle MongoDB database</span>
        </div>
      </div>
    </div>
  );
};

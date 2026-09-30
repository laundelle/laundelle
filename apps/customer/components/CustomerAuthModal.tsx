import React, { useState } from 'react';
import { X, Mail, Lock, User, Phone, ArrowRight } from 'lucide-react';
import { mongoSignIn, mongoSignUp } from '@laundelle/api-client';

interface CustomerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (email: string, name: string, userId?: string) => void;
  onNavigateRoleLogin?: (role: any) => void;
}

export const CustomerAuthModal: React.FC<CustomerAuthModalProps> = ({
  isOpen,
  onClose,
  onLoginSuccess,
  onNavigateRoleLogin: _onNavigateRoleLogin,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [countryCode, setCountryCode] = useState('+91');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);



  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'login') {
        const { user, error } = await mongoSignIn(email, password);
        if (error || !user) throw new Error(error || 'Login failed');
        onLoginSuccess(user.email, user.name, user.id);
        onClose();
      } else {
        if (!fullName.trim()) {
          setErrorMsg('Please enter your full name.');
          setLoading(false);
          return;
        }
        const fullPhone = `${countryCode}${phone.trim().replace(/^0/, '')}`;
        const { user, error } = await mongoSignUp(email, password, fullName, fullPhone);
        if (error || !user) throw new Error(error || 'Registration failed');
        onLoginSuccess(user.email, user.name, user.id);
        onClose();
      }
    } catch (err: any) {
      console.error('[CustomerAuthModal] MongoDB auth error:', err);
      setErrorMsg(err.message || 'Authentication failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white w-full max-w-md max-h-[85vh] sm:max-h-[90vh] rounded-3xl p-5 sm:p-8 shadow-2xl space-y-5 relative animate-in fade-in zoom-in duration-150 overflow-y-auto my-auto">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-gray-400 hover:text-gray-700 bg-gray-100 p-2 rounded-full cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Branding */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-xl">
            L2U
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-[#03045E]">
            {mode === 'login' ? 'Customer Sign In' : 'Create Customer Account'}
          </h2>
          <p className="text-xs text-gray-500">
            {mode === 'login'
              ? 'Enter your details to track orders & book pickups'
              : 'Sign up to get fresh clothes delivered to your doorstep'}
          </p>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-gray-100 p-1.5 rounded-2xl text-xs font-extrabold">
          <button
            onClick={() => { setMode('login'); setErrorMsg(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${mode === 'login' ? 'bg-[#03045E] text-white shadow-xs' : 'text-gray-600'}`}
          >
            Log In
          </button>
          <button
            onClick={() => { setMode('register'); setErrorMsg(null); }}
            className={`py-2 rounded-xl transition-all cursor-pointer ${mode === 'register' ? 'bg-[#03045E] text-white shadow-xs' : 'text-gray-600'}`}
          >
            Register
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-[11px] leading-relaxed text-center font-semibold">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Full Name</label>
              <div className="relative">
                <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="customer@example.com"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Password (min 8 characters)</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
              />
            </div>
          </div>

          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Mobile Phone Number</label>
              <div className="flex gap-2">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="w-24 px-2 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-[#03045E] focus:ring-2 focus:ring-[#03045E] focus:outline-hidden cursor-pointer"
                >
                  <option value="+91">IN (+91)</option>
                  <option value="+44">UK (+44)</option>
                  <option value="+1">US (+1)</option>
                  <option value="+971">AE (+971)</option>
                  <option value="+61">AU (+61)</option>
                </select>
                <div className="relative flex-1">
                  <Phone className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="8309664356"
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:ring-2 focus:ring-[#03045E] focus:outline-hidden"
                  />
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3 rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all disabled:opacity-50"
          >
            <span>{loading ? 'Processing...' : mode === 'login' ? 'Sign In to Account' : 'Complete Registration'}</span>
            {!loading && <ArrowRight className="w-4 h-4 text-[#48CAE4]" />}
          </button>
        </form>

      </div>
    </div>
  );
};

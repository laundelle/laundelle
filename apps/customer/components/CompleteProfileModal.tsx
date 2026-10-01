'use client';

import React, { useState } from 'react';
import { User, Phone, CheckCircle2, ShieldCheck, AlertCircle, Loader2 } from 'lucide-react';
import { dbUpdateProfile } from '@laundelle/api-client';

interface CompleteProfileModalProps {
  isOpen: boolean;
  userId: string;
  initialUsername?: string;
  initialPhone?: string;
  onSuccess: (updatedName: string, updatedPhone: string) => void;
  onClose?: () => void;
}

export const CompleteProfileModal: React.FC<CompleteProfileModalProps> = ({
  isOpen,
  userId,
  initialUsername = '',
  initialPhone = '',
  onSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState(initialUsername);
  const [countryCode, setCountryCode] = useState('+44');
  const [phoneDigits, setPhoneDigits] = useState(() => {
    if (!initialPhone) return '';
    // Strip common country code prefixes if present
    return initialPhone.replace(/^\+?[0-9]{1,4}/, '').trim();
  });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync if initial props change
  React.useEffect(() => {
    if (initialUsername && !username) {
      setUsername(initialUsername);
    }
  }, [initialUsername]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = username.trim();
    const cleanedDigits = phoneDigits.replace(/[^0-9]/g, '');

    if (!trimmedName || trimmedName.length < 2) {
      setError('Please enter a valid username (minimum 2 characters).');
      return;
    }

    if (!cleanedDigits || cleanedDigits.length < 7) {
      setError('Please enter a valid mobile number (minimum 7 digits).');
      return;
    }

    const fullPhoneNumber = `${countryCode}${cleanedDigits}`;
    setIsSubmitting(true);

    try {
      await dbUpdateProfile(userId, trimmedName, fullPhoneNumber);
      onSuccess(trimmedName, fullPhoneNumber);
    } catch (err: any) {
      setError(err?.message || 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/70 backdrop-blur-xs p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative border border-gray-100 my-auto">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-[#E0F2FE] text-[#03045E] rounded-2xl flex items-center justify-center mx-auto mb-2 font-black text-2xl shadow-sm">
            <CheckCircle2 className="w-7 h-7 text-[#0077B6]" />
          </div>
          <h2 className="text-2xl font-heading font-extrabold text-[#03045E]">
            Complete Your Profile
          </h2>
          <p className="text-xs text-gray-500 max-w-xs mx-auto leading-relaxed">
            Welcome to Laundelle! Please confirm your username and mobile number to receive live driver tracking updates.
          </p>
        </div>

        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-2.5 text-xs text-red-700 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            <span className="font-semibold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Username Input */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Username / Full Name <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 text-gray-400 pointer-events-none">
                <User className="w-4 h-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. John Doe"
                className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6] transition-all"
              />
            </div>
          </div>

          {/* Mobile Number with Country Code Dropdown */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mobile Number <span className="text-red-500">*</span>
            </label>
            <div className="relative flex items-center">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="h-11 px-2.5 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-gray-800 focus:outline-none focus:border-[#0077B6] cursor-pointer shrink-0"
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
                <div className="absolute left-3 top-3.5 text-gray-400 pointer-events-none">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="tel"
                  required
                  value={phoneDigits}
                  onChange={(e) => setPhoneDigits(e.target.value)}
                  placeholder="7700 900000"
                  className="w-full h-11 pl-9 pr-3.5 rounded-r-xl border border-gray-200 bg-white text-xs font-semibold text-[#03045E] focus:outline-none focus:border-[#0077B6] focus:ring-1 focus:ring-[#0077B6] transition-all"
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">
              Your courier will use this number for contactless delivery calls and SMS pin codes.
            </p>
          </div>

          {/* Submit Action */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3.5 px-5 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-extrabold flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer active:scale-98 disabled:opacity-60"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-[#48CAE4]" />
                  <span>Saving to Database...</span>
                </>
              ) : (
                <span>Save & Continue</span>
              )}
            </button>
          </div>
        </form>

        <div className="flex items-center justify-center gap-1.5 text-[11px] text-gray-400 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Stored securely in Laundelle MongoDB database</span>
        </div>
      </div>
    </div>
  );
};

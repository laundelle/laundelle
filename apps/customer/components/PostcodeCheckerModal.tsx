import React, { useState } from 'react';
import { MapPin, CheckCircle2, AlertCircle, Sparkles, X, ArrowRight, Bell, ShieldCheck } from 'lucide-react';
import { checkPostcodeSectorActive, joinWaitingList } from '@laundelle/api-client';

interface PostcodeCheckerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onBookNow: (postcode: string) => void;
}

export const PostcodeCheckerModal: React.FC<PostcodeCheckerModalProps> = ({
  isOpen,
  onClose,
  onBookNow,
}) => {
  const [postcode, setPostcode] = useState('');
  const [checkedStatus, setCheckedStatus] = useState<'idle' | 'available' | 'unavailable'>('idle');
  const [showWaitingListForm, setShowWaitingListForm] = useState(false);
  const [waitingListSuccess, setWaitingListSuccess] = useState(false);
  const [checking, setChecking] = useState(false);

  // Form fields for waiting list
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [requestedService, setRequestedService] = useState('Everyday Wash & Fold');
  const [launchConsent, setLaunchConsent] = useState(true);

  if (!isOpen) return null;

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPostcode = postcode.trim().toUpperCase().replace(/\s+/g, '');
    if (!cleanPostcode) return;

    setChecking(true);
    try {
      const isServiceable = await checkPostcodeSectorActive(cleanPostcode);
      if (isServiceable) {
        setCheckedStatus('available');
        setShowWaitingListForm(false);
      } else {
        setCheckedStatus('unavailable');
        setShowWaitingListForm(true);
      }
    } catch (err) {
      console.error('Error checking postcode availability:', err);
      setCheckedStatus('unavailable');
      setShowWaitingListForm(true);
    } finally {
      setChecking(false);
    }
  };

  const handleWaitingListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email) return;

    setChecking(true);
    try {
      const res = await joinWaitingList({
        full_name: fullName,
        email,
        phone,
        postcode: postcode.trim().toUpperCase(),
        requested_service_id: requestedService,
        launch_notification_consent: launchConsent,
      });

      if (res.success) {
        setWaitingListSuccess(true);
      } else {
        alert(res.error || 'Failed to submit postcode waiting list request.');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred during submission.');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in">
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[85vh] sm:max-h-[90vh] overflow-hidden shadow-2xl transition-all border border-gray-100 flex flex-col my-auto">
        {/* Header */}
        <div className="bg-[#03045E] text-white p-5 sm:p-6 relative shrink-0">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-white/80 hover:text-white p-1 rounded-full hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2 text-xs font-bold text-[#48CAE4] uppercase tracking-wider mb-1">
            <MapPin className="w-4 h-4" />
            <span>Service Coverage Area</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-heading font-extrabold">Check Postcode Availability</h2>
          <p className="text-xs text-white/80 mt-1">
            Enter your postal code to check instant 30-min pickup slots in your neighbourhood.
          </p>
        </div>

        <div className="p-5 sm:p-6 space-y-6 overflow-y-auto flex-1 min-h-0">
          {/* Postcode Search Form */}
          {!waitingListSuccess && (
            <form onSubmit={handleCheck} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">
                  Enter Your Postcode / Area Code
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <MapPin className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={postcode}
                      onChange={(e) => {
                        setPostcode(e.target.value);
                        if (checkedStatus !== 'idle') setCheckedStatus('idle');
                      }}
                      placeholder="e.g. SW1A 1AA, W1, EC1, 500001"
                      className="w-full pl-10 pr-4 py-3 bg-[#CAF0F8]/20 border border-gray-200 rounded-xl text-sm font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-hidden focus:border-[#03045E] uppercase"
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={checking}
                    className="bg-[#03045E] hover:bg-[#023E8A] text-white px-5 py-3 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-97 cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    Check Availability
                  </button>
                </div>
              </div>

              {/* Sample test shortcuts */}
              <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500">
                <span>Quick try:</span>
                <button
                  type="button"
                  onClick={() => { setPostcode('SW1A 1AA'); setCheckedStatus('idle'); }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
                >
                  SW1A (Available)
                </button>
                <button
                  type="button"
                  onClick={() => { setPostcode('W1D 4FA'); setCheckedStatus('idle'); }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
                >
                  W1D (Available)
                </button>
                <button
                  type="button"
                  onClick={() => { setPostcode('OX1 2JD'); setCheckedStatus('idle'); }}
                  className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 rounded-md font-medium text-gray-700 cursor-pointer"
                >
                  OX1 (Waiting List)
                </button>
              </div>
            </form>
          )}

          {/* AVAILABLE STATE */}
          {checkedStatus === 'available' && (
            <div className="p-5 bg-[#CAF0F8] border border-[#ADE8F4] rounded-2xl space-y-4 animate-in fade-in">
              <div className="flex items-start gap-3">
                <CheckCircle2 className="w-6 h-6 text-[#03045E] shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-base font-heading font-bold text-[#03045E]">
                    Great News! Doorstep Laundry is Available in {postcode.toUpperCase()}
                  </h3>
                  <p className="text-xs text-gray-600 mt-1">
                    Free doorstep collection & next-day delivery slots are active right now in your area.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 text-[11px]">
                <div className="bg-white p-2.5 rounded-xl text-center">
                  <span className="text-gray-500 block">Next Available Pickup</span>
                  <span className="font-bold text-[#03045E]">Today, in 45 mins</span>
                </div>
                <div className="bg-white p-2.5 rounded-xl text-center">
                  <span className="text-gray-500 block">Express Turnaround</span>
                  <span className="font-bold text-[#03045E]">Same-Day & 24h</span>
                </div>
              </div>

              <button
                onClick={() => {
                  onClose();
                  onBookNow(postcode.trim().toUpperCase());
                }}
                className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
              >
                <span>Book Your Laundry Now</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* UNAVAILABLE STATE + WAITING LIST FORM */}
          {checkedStatus === 'unavailable' && showWaitingListForm && !waitingListSuccess && (
            <div className="space-y-4 animate-in fade-in">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-amber-900">
                    We are not operating in {postcode.toUpperCase()} just yet!
                  </h4>
                  <p className="text-xs text-amber-800 mt-0.5">
                    We are expanding our electric courier routes rapidly. Join our VIP waiting list to get notified the day we launch, plus receive £10 off your first booking.
                  </p>
                </div>
              </div>

              {/* Waiting List Form */}
              <form onSubmit={handleWaitingListSubmit} className="space-y-3 pt-1">
                <h4 className="text-xs font-bold text-gray-800 uppercase tracking-wider">
                  Join VIP Area Launch Waiting List
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Full Name *</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Jane Doe"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#03045E]"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Email Address *</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jane@example.com"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#03045E]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+44 7700 900000"
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#03045E]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-600 mb-1">Primary Laundry Service</label>
                    <select
                      value={requestedService}
                      onChange={(e) => setRequestedService(e.target.value)}
                      className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:outline-hidden focus:border-[#03045E]"
                    >
                      <option value="Wash + Dry + Fold">Wash + Dry + Fold</option>
                      <option value="Wash + Steam Iron">Wash + Steam Iron</option>
                      <option value="Ironing / Pressing">Ironing / Pressing</option>
                      <option value="Duvets & Bulky Bedding">Duvets & Bulky Bedding</option>
                      <option value="Suits & Dry Cleaning">Suits & Dry Cleaning</option>
                      <option value="Recurring Weekly Subscription">Recurring Weekly Subscription</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id="launchConsent"
                    checked={launchConsent}
                    onChange={(e) => setLaunchConsent(e.target.checked)}
                    className="w-4 h-4 accent-[#03045E] rounded cursor-pointer"
                  />
                  <label htmlFor="launchConsent" className="text-[11px] text-gray-600 cursor-pointer">
                    Send me a notification and £10 welcome credit when Laundelle launches in my area.
                  </label>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3 rounded-xl text-xs font-bold shadow-md transition-all cursor-pointer mt-2"
                >
                  Join Waiting List
                </button>
              </form>
            </div>
          )}

          {/* WAITING LIST SUCCESS */}
          {waitingListSuccess && (
            <div className="p-6 bg-[#CAF0F8] rounded-2xl text-center space-y-3 animate-in zoom-in-95">
              <div className="w-12 h-12 rounded-full bg-[#03045E] text-white flex items-center justify-center mx-auto shadow-md">
                <Bell className="w-6 h-6" />
              </div>
              <h3 className="text-base font-heading font-extrabold text-[#03045E]">
                You are on the VIP Waiting List!
              </h3>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                Thank you, <strong>{fullName}</strong>. We've logged your interest for <strong>{postcode.toUpperCase()}</strong>. We will notify you via <strong>{email}</strong> the moment our courier routes open in your sector!
              </p>
              <button
                onClick={onClose}
                className="bg-[#03045E] text-white px-6 py-2.5 rounded-xl text-xs font-bold hover:bg-[#023E8A] transition-all cursor-pointer"
              >
                Done
              </button>
            </div>
          )}

          {/* Trust Guarantees */}
          <div className="border-t border-gray-100 pt-4 flex items-center justify-between text-[11px] text-gray-500">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-[#03045E]" />
              Eco-Friendly Hubs
            </span>
            <span className="flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#03045E]" />
              Free Doorstep Pickup
            </span>
            <span>24/7 Support</span>
          </div>
        </div>
      </div>
    </div>
  );
};

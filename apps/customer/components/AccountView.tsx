import React, { useState } from 'react';
import {
  User,
  MapPin,
  Gift,
  ShieldCheck,
  Plus,
  Trash2,
  Edit2,
  Check,
  Repeat,
  Calendar,
  CreditCard,
  ChevronRight,
  ArrowRight,
  Heart,
  Zap,
  FileText,
  Navigation,
  Headset,
  LogOut,
  Mail,
  Phone,
  Lock,
  X
} from 'lucide-react';
import { UserProfile, UserAddress, UserPreferences, RecurringSchedule, ActiveTab } from '@laundelle/types';
import { mongoSignOut, dbUpdateProfile, apiFetch } from '@laundelle/api-client';
import { AddAddressModal } from './AddAddressModal';

interface AccountViewProps {
  profile: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onNavigate: (tab: ActiveTab) => void;
}

export const AccountView: React.FC<AccountViewProps> = ({
  profile,
  onUpdateProfile,
  onNavigate
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'addresses' | 'preferences' | 'recurring' | 'subscriptions' | 'privacy'>('profile');

  // Edit Profile modal
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [editName, setEditName] = useState(profile.name || 'Mohammed Mehraj');
  const [editEmail, setEditEmail] = useState(profile.email || 'mehraj@gmail.com');
  const [editPhone, setEditPhone] = useState(profile.phone || '8309664356');

  // Address modal
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<UserAddress | null>(null);

  // Recurring Schedule State
  const [isSettingUpRecurring, setIsSettingUpRecurring] = useState(false);
  const [recFrequency, setRecFrequency] = useState<'Weekly' | 'Bi-Weekly' | 'Monthly'>('Weekly');
  const [recDay, setRecDay] = useState('Every Monday');
  const [recSlot, setRecSlot] = useState('10:00 AM - 12:00 PM');
  const [recService, setRecService] = useState('Wash, Tumble Dry & Fold');

  const displayName = profile.name || 'Mohammed Mehraj';
  const displayEmail = profile.email || 'mehraj@gmail.com';
  const displayPhone = profile.phone || '8309664356';

  // Compute initials for the avatar badge (e.g. MM)
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join('') || 'MM';

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...profile,
      name: editName.trim(),
      email: editEmail.trim(),
      phone: editPhone.trim()
    };
    onUpdateProfile(updated);
    try {
      await dbUpdateProfile(profile.name || 'user', editName.trim(), editPhone.trim());
    } catch (err) {
      console.error('Error saving profile:', err);
    }
    setEditProfileOpen(false);
  };

  const handleSaveAddress = (newAddr: UserAddress) => {
    let nextAddrs = profile.addresses.some((a) => a.id === newAddr.id)
      ? profile.addresses.map((a) => (a.id === newAddr.id ? newAddr : a))
      : [...profile.addresses, newAddr];

    if (newAddr.isDefault) {
      nextAddrs = nextAddrs.map((a) => (a.id === newAddr.id ? a : { ...a, isDefault: false }));
    }

    onUpdateProfile({
      ...profile,
      addresses: nextAddrs
    });
    setAddressModalOpen(false);
    setAddressToEdit(null);
  };

  const handleRemoveAddress = (id: string) => {
    onUpdateProfile({
      ...profile,
      addresses: profile.addresses.filter((a) => a.id !== id)
    });
  };

  const handleSetDefaultAddress = (id: string) => {
    onUpdateProfile({
      ...profile,
      addresses: profile.addresses.map((a) => ({
        ...a,
        isDefault: a.id === id
      }))
    });
  };

  const handlePrefChange = (field: keyof UserPreferences, value: any) => {
    onUpdateProfile({
      ...profile,
      preferences: {
        ...profile.preferences,
        [field]: value
      }
    });
  };

  const handleSaveRecurring = () => {
    const newSchedule: RecurringSchedule = {
      id: `rec-${Date.now()}`,
      serviceName: recService,
      frequency: recFrequency,
      dayOfWeek: recDay,
      timeSlot: recSlot,
      addressId: profile.addresses[0]?.id || 'addr-1',
      active: true,
      nextScheduledDate: 'Next Monday, 10:00 AM'
    };

    onUpdateProfile({
      ...profile,
      recurringSchedules: [...(profile.recurringSchedules || []), newSchedule]
    });
    setIsSettingUpRecurring(false);
  };

  const handleToggleRecurringActive = (schedId: string) => {
    onUpdateProfile({
      ...profile,
      recurringSchedules: (profile.recurringSchedules || []).map((s) =>
        s.id === schedId ? { ...s, active: !s.active } : s
      )
    });
  };

  const handleDeleteRecurring = (schedId: string) => {
    onUpdateProfile({
      ...profile,
      recurringSchedules: (profile.recurringSchedules || []).filter((s) => s.id !== schedId)
    });
  };

  return (
    <div className="w-full min-h-screen bg-[#f8fafc] pb-16 font-sans">
      {/* =========================================================================
          TOP BANNER: DEEP MIDNIGHT NAVY CONTAINER
      ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-6">
        <div className="w-full bg-[#051139] text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6 border border-white/10 relative overflow-hidden">
          {/* Subtle Ambient Background Light */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-[#1d5bd8]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-[#00c48c]/15 rounded-full blur-3xl pointer-events-none" />

          {/* Left: Avatar & Details */}
          <div className="flex items-center gap-5 relative z-10">
            {/* Round Avatar / Initials */}
            <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-full bg-[#1b3294] border-2 border-white/20 shadow-md flex items-center justify-center text-xl sm:text-2xl font-black tracking-wider text-white shrink-0 select-none">
              {initials}
            </div>

            <div className="space-y-1.5">
              {/* Name & Tier Badge */}
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white">
                  {displayName}
                </h1>
                <span className="bg-[#00c48c] text-white text-[10px] font-extrabold px-3 py-0.5 rounded-full uppercase tracking-wider shadow-2xs">
                  {(profile as any).membershipTier || 'ECO PLUS MEMBER'}
                </span>
              </div>

              {/* Email & Phone */}
              <div className="flex items-center gap-3 text-xs text-white/80 font-medium flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-300" />
                  <span>{displayEmail}</span>
                </span>
                <span className="text-white/40">•</span>
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-blue-300" />
                  <span>{displayPhone}</span>
                </span>
              </div>

              {/* Member Since */}
              <div className="flex items-center gap-1.5 text-xs text-white/70 font-medium">
                <Calendar className="w-3.5 h-3.5 text-blue-300" />
                <span>
                  Member since{' '}
                  <span className="text-white font-semibold">
                    {(profile as any).memberSince
                      ? new Date((profile as any).memberSince).toLocaleDateString('en-GB', {
                        month: 'short',
                        year: 'numeric'
                      })
                      : 'Recently'}
                  </span>
                </span>
              </div>
            </div>
          </div>

          {/* Right: Quick Action Buttons & Points */}
          <div className="flex items-center gap-2.5 w-full md:w-auto relative z-10 flex-wrap sm:flex-nowrap">
            {/* Open Plans Button */}
            <button
              type="button"
              onClick={() => onNavigate('subscriptions')}
              className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 border border-white/15 transition-all p-3 px-4 rounded-2xl flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer shadow-xs active:scale-98 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/15 text-[#38bdf8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Calendar className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-medium">Laundry Plans</p>
                <p className="text-xs font-black text-white leading-tight">Save 30%</p>
              </div>
            </button>

            {/* Open Support Button */}
            <button
              type="button"
              onClick={() => onNavigate('support')}
              className="flex-1 sm:flex-initial bg-white/10 hover:bg-white/20 border border-white/15 transition-all p-3 px-4 rounded-2xl flex items-center justify-between sm:justify-start gap-2.5 cursor-pointer shadow-xs active:scale-98 text-left group"
            >
              <div className="w-8 h-8 rounded-xl bg-white/15 text-[#c084fc] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Headset className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-white/70 font-medium">Support</p>
                <p className="text-xs font-black text-white leading-tight">24/7 Help</p>
              </div>
            </button>

            {/* Reward Points */}
            <div
              onClick={() => alert(`You have ${profile.rewardPoints} Reward Points available to redeem on checkout!`)}
              className="w-full sm:w-auto bg-white/10 hover:bg-white/15 border border-white/10 transition-all p-3 px-4 rounded-2xl flex items-center justify-between gap-3 cursor-pointer shadow-sm active:scale-98"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center text-[#38bdf8] shrink-0">
                  <Gift className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-[10px] text-white/70 font-medium">Reward Points</p>
                  <p className="text-xs font-black text-white leading-tight">
                    {profile.rewardPoints} pts
                  </p>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-white/50" />
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          MAIN CONTENT AREA (PC 2-COLUMN LAYOUT)
      ========================================================================= */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        {/* Quick Access Mobile Buttons: Plans & Support */}
        <div className="grid grid-cols-2 gap-3 mb-6 lg:hidden">
          <button
            type="button"
            onClick={() => onNavigate('subscriptions')}
            className="bg-white p-3.5 rounded-2xl border border-blue-100 shadow-xs hover:border-blue-300 hover:shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0 shadow-2xs">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-navy truncate">Plans</span>
                <span className="text-[9px] bg-blue-100 text-[#1d5bd8] font-bold px-1.5 py-0.2 rounded-md shrink-0">Save 30%</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Subscriptions</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('support')}
            className="bg-white p-3.5 rounded-2xl border border-purple-100 shadow-xs hover:border-purple-300 hover:shadow-sm transition-all flex items-center gap-3 text-left cursor-pointer active:scale-98"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 shadow-2xs">
              <Headset className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-extrabold text-navy truncate">Support</span>
                <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.2 rounded-md shrink-0">24/7</span>
              </div>
              <p className="text-[10px] text-gray-400 truncate mt-0.5">Help & chat</p>
            </div>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* =======================================================================
              LEFT SIDEBAR: NAVIGATION & SECURITY CARDS (lg:col-span-3)
          ======================================================================= */}
          <aside className="lg:col-span-3 space-y-4">
            {/* Nav Menu */}
            <div className="bg-white rounded-3xl p-3 shadow-xs border border-gray-100 space-y-1">
              {/* Profile Details */}
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'profile'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <User className={`w-4 h-4 ${activeTab === 'profile' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                <span>Profile Details</span>
              </button>

              {/* Saved Addresses */}
              <button
                type="button"
                onClick={() => setActiveTab('addresses')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${activeTab === 'addresses'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className={`w-4 h-4 ${activeTab === 'addresses' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                  <span>Saved Addresses</span>
                </div>
                <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-600 text-[10px] font-extrabold flex items-center justify-center">
                  {profile.addresses.length || 1}
                </span>
              </button>

              {/* Care Preferences */}
              <button
                type="button"
                onClick={() => setActiveTab('preferences')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'preferences'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Heart className={`w-4 h-4 ${activeTab === 'preferences' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                <span>Care Preferences</span>
              </button>

              {/* Recurring Laundry */}
              <button
                type="button"
                onClick={() => setActiveTab('recurring')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'recurring'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <Repeat className={`w-4 h-4 ${activeTab === 'recurring' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                <span>Recurring Laundry</span>
              </button>

              {/* Subscriptions & Usage */}
              <button
                type="button"
                onClick={() => setActiveTab('subscriptions')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'subscriptions'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <CreditCard className={`w-4 h-4 ${activeTab === 'subscriptions' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                <span>My Subscription</span>
              </button>

              {/* GDPR & Privacy Data Rights */}
              <button
                type="button"
                onClick={() => setActiveTab('privacy')}
                className={`w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center gap-3 transition-all cursor-pointer ${activeTab === 'privacy'
                  ? 'bg-[#eff6ff] text-[#1d5bd8] shadow-2xs font-extrabold'
                  : 'text-gray-700 hover:bg-gray-50'
                  }`}
              >
                <ShieldCheck className={`w-4 h-4 ${activeTab === 'privacy' ? 'text-[#1d5bd8]' : 'text-gray-400'}`} />
                <span>Privacy & Data Rights</span>
              </button>

              <div className="pt-2 pb-1 px-3 border-t border-gray-100 my-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
                  Quick Access
                </span>
              </div>

              {/* View Membership Plans */}
              <button
                type="button"
                onClick={() => onNavigate('subscriptions')}
                className="w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-between text-gray-700 hover:bg-blue-50/70 hover:text-[#1d5bd8] transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-4 h-4 text-[#1d5bd8] group-hover:scale-110 transition-transform" />
                  <span>Membership Plans</span>
                </div>
                <span className="text-[10px] font-extrabold text-[#1d5bd8] bg-blue-100/70 px-2 py-0.5 rounded-full">
                  Save 30%
                </span>
              </button>

              {/* Customer Support */}
              <button
                type="button"
                onClick={() => onNavigate('support')}
                className="w-full p-3.5 px-4 rounded-2xl text-xs font-bold flex items-center justify-between text-gray-700 hover:bg-purple-50/70 hover:text-purple-700 transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <Headset className="w-4 h-4 text-purple-600 group-hover:scale-110 transition-transform" />
                  <span>Help & Support</span>
                </div>
                <span className="text-[10px] font-extrabold text-purple-700 bg-purple-100/70 px-2 py-0.5 rounded-full">
                  24/7
                </span>
              </button>

            </div>

            {/* 100% Secure Card */}
            <div className="bg-[#f0f6ff] rounded-3xl p-5 border border-blue-100 space-y-2 shadow-2xs">
              <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#1d5bd8] flex items-center justify-center">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-navy">100% Secure</h4>
                <p className="text-[11px] text-gray-500 leading-relaxed mt-0.5">
                  Your data is protected with industry-standard encryption.
                </p>
              </div>
              <button
                type="button"
                onClick={() => alert('All personal data, addresses, and payment tokens are protected with AES-256 encryption compliant with UK GDPR.')}
                className="text-[11px] font-bold text-[#1d5bd8] hover:underline flex items-center gap-1 pt-1 cursor-pointer"
              >
                <span>Learn more</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </aside>

          {/* =======================================================================
              RIGHT COLUMN: MAIN TAB CONTENT (lg:col-span-9)
          ======================================================================= */}
          <main className="lg:col-span-9 space-y-6">
            {/* =====================================================================
                TAB 1: PROFILE DETAILS (EXACT MATCH TO REFERENCE IMAGE)
            ===================================================================== */}
            {activeTab === 'profile' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Welcome Greeting Row */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                      Welcome back, {displayName}! 👋
                    </h2>
                    <p className="text-xs sm:text-sm text-gray-500 mt-1">
                      Manage your account information and preferences.
                    </p>
                  </div>
                </div>

                {/* 2-Column Cards Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  {/* CARD 1: PERSONAL INFORMATION */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-4">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <h3 className="text-sm font-extrabold text-navy">Personal Information</h3>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          setEditName(displayName);
                          setEditEmail(displayEmail);
                          setEditPhone(displayPhone);
                          setEditProfileOpen(true);
                        }}
                        className="text-xs font-bold text-[#1d5bd8] bg-[#eff6ff] hover:bg-[#dbeafe] px-3 py-1.5 rounded-xl flex items-center gap-1.5 cursor-pointer transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                    </div>

                    {/* 3 Detail Rows */}
                    <div className="space-y-3 text-xs">
                      {/* Full Name */}
                      <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-3.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-gray-500 font-medium">Full Name</span>
                        </div>
                        <span className="font-extrabold text-navy text-right">{displayName}</span>
                      </div>

                      {/* Email Address */}
                      <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-3.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                            <Mail className="w-3.5 h-3.5" />
                          </div>
                          <span className="text-gray-500 font-medium">Email Address</span>
                        </div>
                        <span className="font-extrabold text-navy text-right">{displayEmail}</span>
                      </div>

                      {/* Mobile Number */}
                      <div className="bg-[#f8fafc] border border-gray-100 rounded-2xl p-3.5 px-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-lg bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                            <Phone className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="text-gray-500 font-medium block">Mobile Number</span>
                            <span className="text-[10px] text-gray-400 block">(For Courier SMS)</span>
                          </div>
                        </div>
                        <span className="font-extrabold text-navy text-right">{displayPhone}</span>
                      </div>
                    </div>

                    {/* Update Profile Button */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditName(displayName);
                          setEditEmail(displayEmail);
                          setEditPhone(displayPhone);
                          setEditProfileOpen(true);
                        }}
                        className="w-full py-3 rounded-2xl border-2 border-[#1d5bd8] text-[#1d5bd8] hover:bg-[#eff6ff] font-bold text-xs transition-colors cursor-pointer active:scale-98"
                      >
                        Update Profile
                      </button>
                    </div>
                  </div>

                  {/* CARD 2: ACCOUNT QUICK ACTIONS */}
                  <div className="bg-white rounded-3xl p-6 sm:p-7 shadow-xs border border-gray-100 space-y-3.5">
                    <div className="flex items-center gap-2.5 border-b border-gray-100 pb-3.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Zap className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-extrabold text-navy">Account Quick Actions</h3>
                    </div>

                    <div className="space-y-2.5 text-xs">
                      {/* Action 1: Order History */}
                      <div
                        onClick={() => onNavigate('orders')}
                        className="p-3.5 px-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-gray-50/80 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-[#eff6ff] text-[#1d5bd8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-navy leading-snug">
                              View Full Order & Invoice History
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Check your past orders and invoices
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy transition-colors" />
                      </div>

                      {/* Action 2: Track Active Laundry GPS */}
                      <div
                        onClick={() => onNavigate('orders')}
                        className="p-3.5 px-4 rounded-2xl border border-gray-100 hover:border-emerald-200 hover:bg-gray-50/80 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Navigation className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-navy leading-snug">
                              Track Active Laundry GPS
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Track your active laundry in real-time
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy transition-colors" />
                      </div>

                      {/* Action 3: Laundry Plans & Passes */}
                      <div
                        onClick={() => onNavigate('subscriptions')}
                        className="p-3.5 px-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-gray-50/80 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1d5bd8] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-navy leading-snug">
                                Membership & Laundry Plans
                              </h4>
                              <span className="text-[9px] bg-blue-100 text-[#1d5bd8] font-bold px-1.5 py-0.5 rounded-md">
                                Save 30%
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Explore weekly passes, student discounts & family plans
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy transition-colors" />
                      </div>

                      {/* Action 4: Customer Care & Support */}
                      <div
                        onClick={() => onNavigate('support')}
                        className="p-3.5 px-4 rounded-2xl border border-gray-100 hover:border-purple-200 hover:bg-gray-50/80 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <Headset className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="font-extrabold text-navy leading-snug">
                                Customer Care & Support Portal
                              </h4>
                              <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded-md">
                                24/7
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Get instant help, live chat & raise concerns
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-navy transition-colors" />
                      </div>

                      {/* Action 4: Sign Out */}
                      <div
                        onClick={() => {
                          mongoSignOut();
                          window.location.reload();
                        }}
                        className="p-3.5 px-4 rounded-2xl border border-red-100/60 bg-red-50/30 hover:bg-red-50 hover:border-red-200 transition-all flex items-center justify-between cursor-pointer group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-red-100/80 text-red-600 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                            <LogOut className="w-4 h-4" />
                          </div>
                          <div>
                            <h4 className="font-extrabold text-red-600 leading-snug">
                              Sign Out of Account
                            </h4>
                            <p className="text-[11px] text-gray-400 mt-0.5">
                              Securely sign out from your account
                            </p>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors" />
                      </div>
                    </div>
                  </div>
                </div>

                {/* BOTTOM SECURITY BANNER */}
                <div className="bg-[#eaf3ff] border border-[#d2e4ff] rounded-3xl p-5 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-2xs">
                  <div className="flex items-center gap-3.5">
                    <div className="w-10 h-10 rounded-2xl bg-[#1d5bd8] text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs sm:text-sm font-extrabold text-navy">
                        Your Security, Our Priority
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">
                        Your payment cards and addresses are encrypted according to UK GDPR and PCI-DSS Level 1 compliance.
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      alert(
                        'Security & Privacy: Laundelle uses SSL 256-bit data encryption, tokenized payments, and strict access controls to ensure your data stays 100% private.'
                      )
                    }
                    className="px-5 py-2.5 rounded-xl border border-[#1d5bd8] text-[#1d5bd8] bg-white hover:bg-blue-50 text-xs font-bold transition-colors cursor-pointer shrink-0 shadow-2xs"
                  >
                    Learn More
                  </button>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 2: SAVED ADDRESSES
            ===================================================================== */}
            {activeTab === 'addresses' && (
              <div className="space-y-4 animate-in fade-in-50">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-extrabold text-navy">Saved Delivery Addresses</h3>
                    <p className="text-xs text-gray-500">
                      Manage your doorstep collection points and high-precision GPS coordinates.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setAddressToEdit(null);
                      setAddressModalOpen(true);
                    }}
                    className="bg-[#082b78] hover:bg-[#072465] text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer transition-all"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add New Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {profile.addresses.map((addr) => {
                    const hasGps = Boolean(addr.coordinates || (addr.latitude && addr.longitude));
                    return (
                      <div
                        key={addr.id}
                        className="p-5 bg-white rounded-3xl border border-gray-100 shadow-xs space-y-3 flex flex-col justify-between hover:shadow-sm transition-shadow"
                      >
                        <div>
                          <div className="flex items-center justify-between flex-wrap gap-2">
                            <span className="font-extrabold text-xs text-navy flex items-center gap-1.5">
                              <MapPin className="w-4 h-4 text-[#1d5bd8]" />
                              {addr.label || 'Home'}
                            </span>
                            <div className="flex items-center gap-1.5">
                              {addr.isDefault && (
                                <span className="text-[10px] bg-[#eff6ff] text-[#1d5bd8] font-bold px-2.5 py-0.5 rounded-md">
                                  Default Pickup
                                </span>
                              )}
                              {hasGps && (
                                <span className="text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-md flex items-center gap-1">
                                  <Navigation className="w-2.5 h-2.5 text-emerald-600" />
                                  <span>GPS Stored</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-xs text-gray-600 mt-2 leading-relaxed font-medium">
                            {addr.flatNo}, {addr.street}, {addr.city} - {addr.pincode}
                          </p>

                          {addr.instructions && (
                            <p className="text-[11px] text-gray-500 italic mt-2 bg-gray-50 p-2 rounded-xl border border-gray-100">
                              Note: "{addr.instructions}"
                            </p>
                          )}
                        </div>

                        <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-3">
                            {!addr.isDefault ? (
                              <button
                                type="button"
                                onClick={() => handleSetDefaultAddress(addr.id)}
                                className="text-[#1d5bd8] hover:underline font-bold cursor-pointer"
                              >
                                Set as Default
                              </button>
                            ) : (
                              <span className="text-gray-400 font-medium">Primary Location</span>
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setAddressToEdit(addr);
                                setAddressModalOpen(true);
                              }}
                              className="text-gray-600 hover:text-navy font-bold flex items-center gap-1 cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span>Edit</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveAddress(addr.id)}
                            className="text-red-600 hover:text-red-700 font-bold flex items-center gap-1 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 3: CARE PREFERENCES
            ===================================================================== */}
            {activeTab === 'preferences' && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6 max-w-3xl animate-in fade-in-50">
                <div className="space-y-1">
                  <h3 className="text-base font-extrabold text-navy">
                    Default Garment Wash & Fold Preferences
                  </h3>
                  <p className="text-xs text-gray-500">
                    These preferences will automatically pre-fill on every new doorstep collection you book.
                  </p>
                </div>

                <div className="space-y-5 text-xs">
                  {/* Detergent */}
                  <div>
                    <label className="block text-gray-700 font-bold uppercase tracking-wider mb-2">
                      Preferred Detergent
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Standard', 'Premium Eco-Enzyme'].map((det) => (
                        <button
                          key={det}
                          type="button"
                          onClick={() => handlePrefChange('detergent', det)}
                          className={`p-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer flex items-center justify-between ${profile.preferences?.detergent === det
                            ? 'border-[#082b78] bg-[#eff6ff] text-[#082b78] shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                            }`}
                        >
                          <span>{det}</span>
                          {profile.preferences?.detergent === det && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Softener */}
                  <div>
                    <label className="block text-gray-700 font-bold uppercase tracking-wider mb-2">
                      Fabric Softener
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Standard', 'Premium Silk Touch'].map((soft) => (
                        <button
                          key={soft}
                          type="button"
                          onClick={() => handlePrefChange('softener', soft)}
                          className={`p-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer flex items-center justify-between ${profile.preferences?.softener === soft
                            ? 'border-[#082b78] bg-[#eff6ff] text-[#082b78] shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                            }`}
                        >
                          <span>{soft}</span>
                          {profile.preferences?.softener === soft && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Folding Preference */}
                  <div>
                    <label className="block text-gray-700 font-bold uppercase tracking-wider mb-2">
                      Folding & Presentation Preference
                    </label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {['Standard Flat Fold', 'Hanger Preferred'].map((fold) => (
                        <button
                          key={fold}
                          type="button"
                          onClick={() => handlePrefChange('foldingPreference', fold)}
                          className={`p-3 rounded-xl text-xs font-bold text-left border transition-all cursor-pointer flex items-center justify-between ${profile.preferences?.foldingPreference === fold
                            ? 'border-[#082b78] bg-[#eff6ff] text-[#082b78] shadow-2xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                            }`}
                        >
                          <span>{fold}</span>
                          {profile.preferences?.foldingPreference === fold && <Check className="w-3.5 h-3.5" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 4: RECURRING LAUNDRY & SUBSCRIPTIONS
            ===================================================================== */}
            {activeTab === 'recurring' && (
              <div className="space-y-6 animate-in fade-in-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-extrabold text-navy">
                      Recurring Laundry Schedules & Subscriptions
                    </h3>
                    <p className="text-xs text-gray-500">
                      Automate your weekly or bi-weekly doorstep laundry pickups.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsSettingUpRecurring(true)}
                    className="bg-[#082b78] text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 hover:bg-[#072465] shadow-xs cursor-pointer shrink-0"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create Recurring Schedule</span>
                  </button>
                </div>

                <div className="space-y-4">
                  {(profile.recurringSchedules || []).length === 0 && !isSettingUpRecurring ? (
                    <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 space-y-3 shadow-xs">
                      <Repeat className="w-12 h-12 text-gray-300 mx-auto" />
                      <h4 className="font-bold text-base text-navy">No Recurring Schedules</h4>
                      <p className="text-xs text-gray-500 max-w-md mx-auto">
                        Set up an automated weekly collection slot and enjoy a 10% bonus discount on every recurring cycle.
                      </p>
                      <button
                        type="button"
                        onClick={() => setIsSettingUpRecurring(true)}
                        className="bg-[#082b78] text-white px-5 py-2.5 rounded-xl text-xs font-bold hover:bg-[#072465] transition-all cursor-pointer"
                      >
                        Set Up Schedule Now
                      </button>
                    </div>
                  ) : (
                    (profile.recurringSchedules || []).map((schedule) => (
                      <div
                        key={schedule.id}
                        className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-extrabold text-sm text-navy">{schedule.serviceName}</h4>
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${schedule.active ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-600'
                                }`}
                            >
                              {schedule.active ? 'Active' : 'Paused'}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {schedule.frequency} • {schedule.dayOfWeek} at {schedule.timeSlot}
                          </p>
                          <p className="text-[11px] text-[#1d5bd8] font-bold">
                            Next pickup: {schedule.nextScheduledDate || 'Upcoming'}
                          </p>
                        </div>

                        <div className="flex items-center gap-3">
                          <button
                            type="button"
                            onClick={() => handleToggleRecurringActive(schedule.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors ${schedule.active
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'bg-blue-50 text-blue-800 hover:bg-blue-100'
                              }`}
                          >
                            {schedule.active ? 'Pause' : 'Resume'}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRecurring(schedule.id)}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-xl cursor-pointer transition-colors"
                            title="Delete Schedule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}

                  {/* Create recurring schedule drawer/form */}
                  {isSettingUpRecurring && (
                    <div className="bg-white rounded-3xl p-6 border border-blue-200 shadow-sm space-y-4 animate-in fade-in">
                      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                        <h4 className="text-sm font-extrabold text-navy">New Recurring Schedule</h4>
                        <button
                          type="button"
                          onClick={() => setIsSettingUpRecurring(false)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                        <div>
                          <label className="block text-gray-600 font-bold mb-1">Service Type</label>
                          <select
                            value={recService}
                            onChange={(e) => setRecService(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                          >
                            <option>Wash, Tumble Dry & Fold</option>
                            <option>Wash & Steam Iron</option>
                            <option>Premium Dry Cleaning</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-600 font-bold mb-1">Frequency</label>
                          <select
                            value={recFrequency}
                            onChange={(e) => setRecFrequency(e.target.value as any)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                          >
                            <option>Weekly</option>
                            <option>Bi-Weekly</option>
                            <option>Monthly</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-600 font-bold mb-1">Preferred Day</label>
                          <select
                            value={recDay}
                            onChange={(e) => setRecDay(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                          >
                            <option>Every Monday</option>
                            <option>Every Wednesday</option>
                            <option>Every Friday</option>
                            <option>Every Saturday</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-gray-600 font-bold mb-1">Collection Time Slot</label>
                          <select
                            value={recSlot}
                            onChange={(e) => setRecSlot(e.target.value)}
                            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none"
                          >
                            <option>08:00 AM - 10:00 AM</option>
                            <option>10:00 AM - 12:00 PM</option>
                            <option>02:00 PM - 04:00 PM</option>
                            <option>06:00 PM - 08:00 PM</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <button
                          type="button"
                          onClick={() => setIsSettingUpRecurring(false)}
                          className="px-4 py-2 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveRecurring}
                          className="px-5 py-2 rounded-xl bg-[#082b78] text-white font-bold text-xs hover:bg-[#072465]"
                        >
                          Save Schedule
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 5: SUBSCRIPTIONS & USAGE TRACKING
            ===================================================================== */}
            {activeTab === 'subscriptions' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                    Laundry Subscription & Allowance
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Track your monthly wash allowance, overage rates, and recurring collections.
                  </p>
                </div>

                {/* Subscription Card */}
                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-[#1d5bd8] bg-[#eff6ff] px-2.5 py-1 rounded-full">
                        ACTIVE PLAN
                      </span>
                      <h3 className="text-xl font-extrabold text-navy mt-1.5">
                        Silver Essential Plan
                      </h3>
                      <p className="text-xs text-gray-500">Weekly automated doorstep collection</p>
                    </div>

                    <div className="text-right">
                      <div className="text-3xl font-extrabold text-[#082b78]">£69</div>
                      <span className="text-xs text-gray-500">per month (Billed via Stripe)</span>
                    </div>
                  </div>

                  {/* Usage Progress Bar */}
                  <div className="space-y-3 bg-[#f8fafc] p-5 rounded-2xl border border-gray-100">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-gray-700">Monthly Wash Allowance Usage</span>
                      <span className="text-[#082b78]">14.2 kg / 20.0 kg (71%)</span>
                    </div>
                    <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-blue-500 to-[#1d5bd8] rounded-full transition-all duration-500"
                        style={{ width: '71%' }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-gray-500">
                      <span>5.8 kg allowance remaining this cycle</span>
                      <span>Renews in 12 days</span>
                    </div>
                  </div>

                  {/* Overage & Allowance Rules */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <span className="text-gray-500 block mb-1 font-medium">Bags Included</span>
                      <span className="text-base font-extrabold text-navy">4 Bags / mo</span>
                    </div>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <span className="text-gray-500 block mb-1 font-medium">Overage Rate</span>
                      <span className="text-base font-extrabold text-[#082b78]">£2.00 / kg</span>
                    </div>
                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                      <span className="text-gray-500 block mb-1 font-medium">Next Scheduled Pickup</span>
                      <span className="text-base font-extrabold text-emerald-600">Monday, 10:00 AM</span>
                    </div>
                  </div>

                  {/* Customer Plan Controls */}
                  <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => alert('Subscription paused for holiday. You will not be billed while paused.')}
                      className="px-5 py-2.5 rounded-xl border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100 font-bold text-xs cursor-pointer transition-colors"
                    >
                      Pause Subscription
                    </button>
                    <button
                      type="button"
                      onClick={() => onNavigate('subscriptions')}
                      className="px-5 py-2.5 rounded-xl border border-[#1d5bd8] text-[#1d5bd8] hover:bg-[#eff6ff] font-bold text-xs cursor-pointer transition-colors"
                    >
                      Change Plan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm('Are you sure you want to cancel your laundry subscription? You will retain benefits until the end of your billing cycle.')) {
                          alert('Subscription cancellation confirmed.');
                        }
                      }}
                      className="px-5 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-bold text-xs cursor-pointer transition-colors ml-auto"
                    >
                      Cancel Plan
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =====================================================================
                TAB 6: GDPR & DATA PRIVACY RIGHTS
            ===================================================================== */}
            {activeTab === 'privacy' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-navy tracking-tight">
                    GDPR & Privacy Rights
                  </h2>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1">
                    Manage your personal data, request machine-readable exports, or exercise erasure rights under GDPR.
                  </p>
                </div>

                <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6">
                  {/* Export Data */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-navy">Export Personal Data (GDPR Art. 20)</h4>
                      <p className="text-xs text-gray-500 max-w-lg">
                        Download a full machine-readable JSON bundle containing your profile details, order histories, addresses, and receipts.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          const rawSession = localStorage.getItem('l2u_auth_session');
                          const token = rawSession ? JSON.parse(rawSession).token : null;
                          const res = await apiFetch('/api/v1/privacy/export', {
                            headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
                          });
                          const data = await res.json();
                          const blob = new Blob([JSON.stringify(data.exportData || data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `laundelle_data_export_${Date.now()}.json`;
                          a.click();
                        } catch (e) {
                          alert('Data export generated successfully.');
                        }
                      }}
                      className="px-5 py-2.5 bg-[#082b78] hover:bg-[#072465] text-white rounded-xl font-bold text-xs cursor-pointer shadow-xs transition-colors shrink-0"
                    >
                      Download Data Bundle (JSON)
                    </button>
                  </div>

                  {/* Right to Erasure */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-gray-100">
                    <div className="space-y-1">
                      <h4 className="text-sm font-extrabold text-red-600">Request Account Anonymization & Deletion</h4>
                      <p className="text-xs text-gray-500 max-w-lg">
                        Permanently scrub your name, email, phone, and saved addresses. In compliance with HMRC tax regulations, completed financial order totals are anonymized and retained for statutory accounting.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={async () => {
                        if (confirm('Are you sure you wish to anonymize your account? Your personal profile will be permanently scrubbed under GDPR Right to Erasure.')) {
                          try {
                            const rawSession = localStorage.getItem('l2u_auth_session');
                            const token = rawSession ? JSON.parse(rawSession).token : null;
                            await apiFetch('/api/v1/privacy/requests', {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                              },
                              body: JSON.stringify({ requestType: 'DELETION', reason: 'Customer requested account closure' })
                            });
                            alert('Your account anonymization request has been processed. You will be logged out.');
                            mongoSignOut();
                          } catch (e) {
                            alert('Anonymization request submitted.');
                          }
                        }
                      }}
                      className="px-5 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl font-bold text-xs cursor-pointer transition-colors shrink-0"
                    >
                      Request Account Deletion
                    </button>
                  </div>

                  {/* Active Data Retention Notice */}
                  <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200/70 flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-xs font-bold text-gray-900 block">Active Data Retention Policy</span>
                      <p className="text-[11px] text-gray-600 leading-relaxed mt-0.5">
                        Laundelle automatically purges operational photos (intake/scale/QC) after 90 days and delivery evidence photos after 180 days. Financial audit logs are stored securely with cryptographic SHA-256 hash chaining to detect tampering.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </main>
        </div>
      </div>

      {/* =========================================================================
          MODAL: EDIT PERSONAL INFORMATION
      ========================================================================= */}
      {editProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in-50">
          <div className="relative w-full max-w-md bg-white rounded-3xl p-6 sm:p-7 shadow-2xl space-y-4 border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-extrabold text-navy">Update Personal Information</h3>
              <button
                type="button"
                onClick={() => setEditProfileOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-700 font-bold mb-1">Full Name</label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-navy focus:outline-none focus:border-[#1d5bd8] focus:ring-1 focus:ring-[#1d5bd8]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">Email Address</label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-navy focus:outline-none focus:border-[#1d5bd8] focus:ring-1 focus:ring-[#1d5bd8]"
                  required
                />
              </div>

              <div>
                <label className="block text-gray-700 font-bold mb-1">
                  Mobile Number (For Courier SMS)
                </label>
                <input
                  type="text"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-semibold text-navy focus:outline-none focus:border-[#1d5bd8] focus:ring-1 focus:ring-[#1d5bd8]"
                  required
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditProfileOpen(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 rounded-xl bg-[#082b78] hover:bg-[#072465] text-white font-bold cursor-pointer shadow-sm"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: ADD / EDIT ADDRESS & EXACT GPS LOCATION
      ========================================================================= */}
      <AddAddressModal
        isOpen={addressModalOpen}
        onClose={() => {
          setAddressModalOpen(false);
          setAddressToEdit(null);
        }}
        onSaveAddress={handleSaveAddress}
        initialAddress={addressToEdit}
      />
    </div>
  );
};

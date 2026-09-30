'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession, clearSession, AuthSession } from '@laundelle/auth';
import { ProcessorLayout } from '@/components/processor/ProcessorLayout';
import { ProcessorLoginPage } from '@/components/processor/ProcessorLoginPage';

export default function ProcessorPage() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setSession(getStoredSession());
    setMounted(true);

    const handleAuthChange = () => {
      setSession(getStoredSession());
    };
    window.addEventListener('l2u_auth_change', handleAuthChange);
    return () => window.removeEventListener('l2u_auth_change', handleAuthChange);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03045E]"></div>
      </div>
    );
  }

  // If unauthenticated or role is not processor, render ProcessorLoginPage
  if (!session?.isAuthenticated || session?.user?.role !== 'processor') {
    return (
      <ProcessorLoginPage
        onProcessorLoginSuccess={() => {
          setSession(getStoredSession());
        }}
        onNavigateToCustomer={() => {
          router.push('/');
        }}
      />
    );
  }

  return (
    <ProcessorLayout
      userName={session.user.name}
      onSignOut={() => {
        clearSession();
        setSession(null);
      }}
      onSwitchRole={() => {
        router.push('/');
      }}
    />
  );
}

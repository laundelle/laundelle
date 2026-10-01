'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession, clearSession, AuthSession } from '@laundelle/auth';
import { AdminPortal } from '@/components/AdminPortal';
import { AdminLoginPage } from '@/components/AdminLoginPage';

export default function AdminPage() {
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

  // If unauthenticated or role is not admin / super_admin, render AdminLoginPage
  if (!session?.isAuthenticated || (session?.user?.role !== 'admin' && session?.user?.role !== 'super_admin')) {
    return (
      <AdminLoginPage
        onAdminLoginSuccess={() => {
          setSession(getStoredSession());
        }}
        onNavigateToCustomer={() => {
          window.location.href = process.env.NEXT_PUBLIC_CUSTOMER_URL || 'http://localhost:3000';
        }}
        onNavigateToManagerLogin={() => {
          const opsBase = process.env.NEXT_PUBLIC_OPERATIONS_URL || 'http://localhost:3001';
          window.location.href = `${opsBase}/manager`;
        }}
      />
    );
  }

  return (
    <AdminPortal
      orders={[]}
      userRole={session.user.role || 'admin'}
      userName={session.user.name}
      onExitAdmin={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}

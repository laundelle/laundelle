'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { AdminLoginPage } from '@/components/AdminLoginPage';

export default function AdminLoginRoute() {
  const router = useRouter();

  return (
    <AdminLoginPage
      onAdminLoginSuccess={() => {
        router.push('/');
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

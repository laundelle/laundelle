'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ManagerLoginPage } from '@/components/manager/ManagerLoginPage';

export default function ManagerLoginRoute() {
  const router = useRouter();

  return (
    <ManagerLoginPage
      onManagerLoginSuccess={() => {
        router.push('/manager');
      }}
      onNavigateToCustomer={() => {
        router.push('/');
      }}
    />
  );
}

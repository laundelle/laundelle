'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { DriverLoginPage } from '@/components/driver/DriverLoginPage';

export default function DriverLoginRoute() {
  const router = useRouter();

  return (
    <DriverLoginPage
      onDriverLoginSuccess={() => {
        router.push('/driver');
      }}
      onNavigateToCustomer={() => {
        router.push('/');
      }}
    />
  );
}

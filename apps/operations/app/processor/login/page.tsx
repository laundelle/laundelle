'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ProcessorLoginPage } from '@/components/processor/ProcessorLoginPage';

export default function ProcessorLoginRoute() {
  const router = useRouter();

  return (
    <ProcessorLoginPage
      onProcessorLoginSuccess={() => {
        router.push('/processor');
      }}
      onNavigateToCustomer={() => {
        router.push('/');
      }}
    />
  );
}

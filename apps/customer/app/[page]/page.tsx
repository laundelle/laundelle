'use client';

import React, { use } from 'react';
import dynamic from 'next/dynamic';

const AppClient = dynamic<{ initialTab?: string }>(() => import('../AppClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#03045E]"></div>
    </div>
  ),
});

interface PageProps {
  params: Promise<{ page: string }>;
}

export default function DynamicPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const rawPage = resolvedParams.page;

  let tabName = 'home';
  if (rawPage === 'services') tabName = 'services';
  else if (rawPage === 'orders') tabName = 'orders';
  else if (rawPage === 'ai') tabName = 'assistant';
  else if (rawPage === 'account') tabName = 'account';
  else if (rawPage === 'subscriptions') tabName = 'subscriptions';
  else if (rawPage === 'support') tabName = 'support';
  else if (rawPage === 'notifications') tabName = 'notifications';

  return <AppClient initialTab={tabName} />;
}

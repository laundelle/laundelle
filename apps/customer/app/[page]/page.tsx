import React from 'react';
import AppClient from '../AppClient';

interface PageProps {
  params: Promise<{ page: string }>;
}

export default async function DynamicPage({ params }: PageProps) {
  const resolvedParams = await params;
  const rawPage = resolvedParams.page;

  let tabName = 'home';
  if (rawPage === 'services') tabName = 'services';
  else if (rawPage === 'orders') tabName = 'orders';
  else if (rawPage === 'ai') tabName = 'assistant';
  else if (rawPage === 'account') tabName = 'account';
  else if (rawPage === 'support') tabName = 'support';
  else if (rawPage === 'notifications') tabName = 'notifications';

  return <AppClient initialTab={tabName} />;
}

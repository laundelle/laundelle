'use client';

import dynamic from 'next/dynamic';

const AppClient = dynamic<{ initialTab?: string }>(() => import('./AppClient'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-[#FAFCFF] flex items-center justify-center">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03045E]"></div>
    </div>
  ),
});

export default function Page() {
  return <AppClient initialTab="home" />;
}

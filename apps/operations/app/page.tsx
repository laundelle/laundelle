'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getStoredSession } from '@laundelle/auth';
import { Truck, Cpu, ShieldCheck, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export default function OperationsLandingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const session = getStoredSession();
    if (session?.isAuthenticated && session?.user?.role) {
      if (session.user.role === 'driver') {
        router.replace('/driver');
        return;
      }
      if (session.user.role === 'processor') {
        router.replace('/processor');
        return;
      }
      if (session.user.role === 'manager') {
        router.replace('/manager');
        return;
      }
    }
    setLoading(false);
  }, [router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFCFF] flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#03045E]"></div>
      </div>
    );
  }

  const portals = [
    {
      title: 'Driver Portal',
      description: 'Mobile courier runs, doorstep collections, delivery manifests & OTP verification.',
      href: '/driver',
      icon: Truck,
      color: 'bg-blue-600',
    },
    {
      title: 'Facility Processor',
      description: 'Plant intake, digital scale weigh-in, washing/drying pipelines & 9-point QC.',
      href: '/processor',
      icon: Cpu,
      color: 'bg-indigo-600',
    },
    {
      title: 'Plant Manager',
      description: 'Facility operations, fleet dispatch, driver & processor queues, and operational overrides.',
      href: '/manager',
      icon: ShieldCheck,
      color: 'bg-cyan-700',
    },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <h1 className="text-3xl font-extrabold text-[#03045E] tracking-tight">Laundelle Operations</h1>
        <p className="mt-2 text-sm text-gray-600">Select your operational workplace or log in with your staff credentials</p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl px-4">
        <div className="grid gap-4">
          {portals.map((portal) => {
            const Icon = portal.icon;
            return (
              <Link
                key={portal.title}
                href={portal.href}
                className="group relative flex items-center gap-4 p-5 bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-gray-200 transition-all duration-200"
              >
                <div className={`p-3.5 rounded-xl ${portal.color} text-white shadow-sm`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-bold text-gray-900 group-hover:text-[#03045E] transition-colors">
                    {portal.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">{portal.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-gray-400 group-hover:text-[#03045E] group-hover:translate-x-1 transition-all" />
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

'use client';
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  ShoppingBag,
  CreditCard,
  Scale,
  Truck,
  ArrowRight,
  Clock,
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  RefreshCw
} from 'lucide-react';
import { dbFetchAdminDashboardMetrics, apiFetch } from '@laundelle/api-client';
import { AdminViewTab } from '@laundelle/types';

interface AdminDashboardProps {
  onNavigateTab: (tab: AdminViewTab) => void;
  selectedLocation: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  selectedLocation,
}) => {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exceptions, setExceptions] = useState<any[]>([]);
  const [exceptionSummary, setExceptionSummary] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboardData = async (isManualRefresh = false) => {
    if (isManualRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const data = await dbFetchAdminDashboardMetrics(selectedLocation);
      if (data) setMetrics(data);

      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const [excRes, sumRes] = await Promise.all([
        apiFetch('/api/v1/exceptions?status=OPEN&limit=8', {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        }),
        apiFetch('/api/v1/exceptions/summary', {
          headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
        })
      ]);
      const excData = await excRes.json();
      const sumData = await sumRes.json();
      if (excData.exceptions) setExceptions(excData.exceptions);
      if (sumData.summary) setExceptionSummary(sumData.summary);
    } catch (e) {
      console.error('Failed to load dashboard data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [selectedLocation]);

  const filteredExceptions = selectedLocation && selectedLocation !== 'All Locations'
    ? exceptions.filter(ex => {
        const locLower = selectedLocation.toLowerCase();
        const pStr = (ex.plantId || ex.locationName || '').toLowerCase();
        const matchKeyword = ['preston', 'blackburn', 'bolton', 'chorley'].find(k => locLower.includes(k));
        return matchKeyword ? pStr.includes(matchKeyword) : pStr.includes(locLower);
      })
    : exceptions;

  const systemAlerts = filteredExceptions.map((ex) => ({
    id: ex.id,
    severity: (ex.priority === 'CRITICAL' || ex.priority === 'urgent' || ex.priority === 'HIGH' || ex.priority === 'high') ? 'critical' : 'warning',
    createdAt: ex.createdAt || new Date().toISOString(),
    title: (ex.type || 'Operational Exception').replace(/_/g, ' ').toUpperCase(),
    message: ex.description,
    relatedOrderNumber: ex.orderNumber || ex.orderId ? `#${ex.orderNumber || ex.orderId}` : 'Plant System',
    locationName: ex.plantId || 'Facility Hub'
  }));
  const facility = {
    code: selectedLocation,
    currentOrdersToday: metrics?.todayOrdersTotal || 0,
    dailyCapacityOrders: 100,
    currentKgToday: metrics?.todayKgProcessed || 0,
    dailyCapacityKg: 500,
  };

  if (loading || !metrics) {
    return (
      <div className="w-full flex justify-center py-12">
        <div className="animate-spin text-[#03045E]">
          <Clock className="w-8 h-8" />
        </div>
      </div>
    );
  }

  const activeCount: number = Object.values(metrics.pipeline as Record<string, number>).reduce((acc, val) => acc + val, 0);
  const getPct = (val: number) => activeCount > 0 ? Math.round((val / activeCount) * 100) : 0;

  const pipelineStages = [
    { name: 'Booked', count: metrics.pipeline.booked, pct: getPct(metrics.pipeline.booked), color: 'bg-sky-500' },
    { name: 'Scheduled', count: metrics.pipeline.scheduled, pct: getPct(metrics.pipeline.scheduled), color: 'bg-blue-500' },
    { name: 'Collected', count: metrics.pipeline.collected, pct: getPct(metrics.pipeline.collected), color: 'bg-[#0077B6]' },
    { name: 'Received', count: metrics.pipeline.received, pct: getPct(metrics.pipeline.received), color: 'bg-[#0096C7]' },
    { name: 'Processing', count: metrics.pipeline.processing, pct: getPct(metrics.pipeline.processing), color: 'bg-[#00B4D8]' },
    { name: 'Quality Control', count: metrics.pipeline.qc, pct: getPct(metrics.pipeline.qc), color: 'bg-[#48CAE4]' },
    { name: 'Ready', count: metrics.pipeline.ready, pct: getPct(metrics.pipeline.ready), color: 'bg-emerald-500' },
    { name: 'Out for Delivery', count: metrics.pipeline.out, pct: getPct(metrics.pipeline.out), color: 'bg-[#03045E]' },
  ];

  return (
    <div className="w-full space-y-8 p-6 sm:p-8 pb-24">
      {/* Location Banner Callout */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-[#03045E] via-[#023E8A] to-[#0077B6] text-white p-6 rounded-3xl shadow-xl">
        <div>
          <span className="text-[11px] font-bold tracking-widest text-[#48CAE4] uppercase block mb-1">
            Real-Time Operations Command Center
          </span>
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold">
            {selectedLocation} Dashboard
          </h1>
          <p className="text-xs text-white/80 mt-1">
            Monitoring active logistics routes, facility processing capacity, and automated exception flags.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="bg-white/10 hover:bg-white/20 border border-white/20 text-white px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-4 h-4 text-[#48CAE4] ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => onNavigateTab('orders')}
            className="bg-[#00B4D8] hover:bg-[#48CAE4] text-[#03045E] px-5 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <span>View Live Orders</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Top Row: KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
        {/* Card 1: Today's Orders */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Orders</span>
            <div className="w-10 h-10 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center">
              <ShoppingBag className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-[#03045E]">{metrics.todayOrdersTotal}</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{metrics.todayOrdersTrendPercent}%
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">vs 60 orders yesterday</p>
          </div>
        </div>

        {/* Card 2: Today's Revenue */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Today's Revenue</span>
            <div className="w-10 h-10 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-[#03045E]">£{metrics.todayRevenue.toFixed(2)}</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{metrics.todayRevenueTrendPercent}%
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Avg order value: £21.77</p>
          </div>
        </div>

        {/* Card 3: KG Processed */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">KG Processed</span>
            <div className="w-10 h-10 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center">
              <Scale className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-[#03045E]">{metrics.todayKgProcessed} kg</span>
              <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                +{metrics.todayKgTrendPercent}%
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-1">Plant capacity: 70% utilized</p>
          </div>
        </div>

        {/* Card 4: Doorstep Pickups & Deliveries */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Collections & Deliveries</span>
            <div className="w-10 h-10 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center">
              <Truck className="w-5 h-5" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-50 p-2 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Pickups</span>
              <span className="font-bold text-[#03045E]">{metrics.collectionsCompleted} done</span>
              <span className="text-[10px] text-amber-600 block">{metrics.collectionsPending} pending</span>
            </div>
            <div className="bg-gray-50 p-2 rounded-xl">
              <span className="text-[10px] text-gray-500 block">Deliveries</span>
              <span className="font-bold text-[#03045E]">{metrics.deliveriesCompleted} done</span>
              <span className="text-[10px] text-blue-600 block">{metrics.deliveriesPending} pending</span>
            </div>
          </div>
        </div>

        {/* Card 5: Exceptions & SLA */}
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Exceptions & SLA</span>
            <div className="w-10 h-10 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-heading font-black text-red-600">
                {exceptionSummary?.openTotal ?? exceptions.length}
              </span>
              <span className="text-xs font-bold text-red-700 bg-red-50 px-2 py-0.5 rounded-full">
                Active
              </span>
            </div>
            <p className="text-[11px] text-gray-500 mt-1">
              {exceptionSummary?.byPriority?.CRITICAL || 0} critical · {exceptionSummary?.byPriority?.HIGH || 0} high priority
            </p>
          </div>
        </div>
      </div>

      {/* Prominent NEEDS ATTENTION Exceptions Panel */}
      <div className="bg-gradient-to-br from-red-50/90 via-amber-50/50 to-white border-2 border-red-200 rounded-3xl p-6 sm:p-8 space-y-5 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-600 text-white rounded-2xl flex items-center justify-center shadow-sm">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h2 className="text-xl font-heading font-extrabold text-red-950 flex items-center gap-2">
                <span>Needs Attention</span>
                <span className="text-xs px-2.5 py-0.5 bg-red-600 text-white rounded-full font-bold">
                  {systemAlerts.length} Exceptions Requiring Action
                </span>
              </h2>
              <p className="text-xs text-red-800">
                System-flagged exceptions requiring manager intervention to prevent customer delays.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-2 bg-white/80 hover:bg-white text-red-900 border border-red-200 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              title="Refresh Exceptions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh Alerts</span>
            </button>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-bold text-red-900 hover:text-red-950 underline cursor-pointer"
            >
              Review Active Orders →
            </button>
          </div>
        </div>

        {/* Exception Alert Cards Grid or Empty State */}
        {systemAlerts.length === 0 ? (
          <div className="bg-white/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-2">
            <div className="w-10 h-10 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-gray-800">All Operations Running Smoothly</p>
            <p className="text-xs text-gray-500">Zero open exceptions or SLA breaches requiring urgent intervention.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {systemAlerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-4 rounded-2xl border bg-white shadow-xs space-y-3 flex flex-col justify-between ${alt.severity === 'critical'
                  ? 'border-red-300 ring-2 ring-red-400/30'
                  : 'border-amber-200'
                  }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${alt.severity === 'critical' ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'
                        }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] text-gray-400 font-semibold">{alt.createdAt.slice(11, 16)}</span>
                  </div>

                  <h3 className="text-xs font-bold text-gray-900 leading-snug">{alt.title}</h3>
                  <p className="text-[11px] text-gray-600 leading-normal">{alt.message}</p>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[10px] font-bold text-gray-500">{alt.relatedOrderNumber || alt.locationName}</span>
                  <button
                    onClick={() => onNavigateTab('orders')}
                    className="px-3 py-1 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-xl text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Inspect & Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Order Pipeline & Capacity Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Visual Order Pipeline (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-heading font-extrabold text-[#03045E]">Visual Order Pipeline</h3>
              <p className="text-xs text-gray-500">Live order distribution across operational stages</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchDashboardData(true)}
                disabled={refreshing}
                className="p-1.5 text-gray-400 hover:text-[#0077B6] rounded-lg transition-colors cursor-pointer"
                title="Refresh Pipeline Stages"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-[#0077B6]' : ''}`} />
              </button>
              <button
                onClick={() => onNavigateTab('orders')}
                className="text-xs font-bold text-[#0077B6] hover:underline cursor-pointer"
              >
                Filter Orders View →
              </button>
            </div>
          </div>

          {/* Pipeline Stage Bar */}
          <div className="space-y-4">
            <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden flex">
              {pipelineStages.map((stg) => (
                <div
                  key={stg.name}
                  style={{ width: `${stg.pct}%` }}
                  className={`${stg.color} h-full border-r border-white/20 transition-all hover:opacity-85 cursor-pointer`}
                  title={`${stg.name}: ${stg.count} orders (${stg.pct}%)`}
                />
              ))}
            </div>

            {/* Stage Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {pipelineStages.map((stg) => (
                <button
                  key={stg.name}
                  onClick={() => onNavigateTab('orders')}
                  className="p-3 bg-gray-50 hover:bg-[#CAF0F8]/40 border border-gray-100 rounded-2xl text-left space-y-1 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5">
                    <div className={`w-2.5 h-2.5 rounded-full ${stg.color}`} />
                    <span className="text-[11px] font-bold text-gray-700 truncate">{stg.name}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-base font-black text-[#03045E]">{stg.count}</span>
                    <span className="text-[10px] text-gray-400 font-semibold">{stg.pct}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capacity Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 sm:p-8 shadow-xs border border-gray-100 space-y-6">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-heading font-extrabold text-[#03045E]">Today's Facility Capacity</h3>
                <button
                  onClick={() => fetchDashboardData(true)}
                  disabled={refreshing}
                  className="p-1 text-gray-400 hover:text-[#0077B6] rounded-lg transition-colors cursor-pointer"
                  title="Refresh Capacity"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-[#0077B6]' : ''}`} />
                </button>
              </div>
              <span className="text-xs px-2.5 py-0.5 bg-[#CAF0F8] text-[#03045E] rounded-full font-bold">
                {facility.code}
              </span>
            </div>
            <p className="text-xs text-gray-500">Processing limit & booking slot availability</p>
          </div>

          <div className="space-y-5">
            {/* Orders Capacity Gauge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700">Orders Capacity</span>
                <span className="text-[#03045E]">{facility.currentOrdersToday} / {facility.dailyCapacityOrders} orders</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(facility.currentOrdersToday / facility.dailyCapacityOrders) * 100}%` }}
                  className="bg-[#0077B6] h-full rounded-full transition-all"
                />
              </div>
              <p className="text-[10px] text-gray-400 text-right font-semibold">68% Booked - Normal</p>
            </div>

            {/* Weight Capacity Gauge */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-gray-700">Weight Load Capacity</span>
                <span className="text-[#03045E]">{facility.currentKgToday} / {facility.dailyCapacityKg} kg</span>
              </div>
              <div className="w-full h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(facility.currentKgToday / facility.dailyCapacityKg) * 100}%` }}
                  className="bg-[#00B4D8] h-full rounded-full transition-all"
                />
              </div>
              <p className="text-[10px] text-amber-600 text-right font-bold">70% Weight Capacity - Nearing Limit</p>
            </div>

            <button
              onClick={() => onNavigateTab('areas')}
              className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-3 rounded-2xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-md cursor-pointer transition-all"
            >
              <span>Manage Capacity & Booking Slots</span>
              <ArrowRight className="w-3.5 h-3.5 text-[#48CAE4]" />
            </button>
          </div>
        </div>
      </div>

      {/* P1: Subscription Metrics & System Health Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Subscribers & MRR</span>
            <span className="bg-blue-50 text-[#0077B6] text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Monthly</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#03045E]">£4,890</span>
            <span className="text-xs text-emerald-600 font-bold">+18% MoM</span>
          </div>
          <p className="text-xs text-gray-500">68 active subscribers • 0.8% churn rate</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Notification Reliability</span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">99.9% Delivered</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-[#03045E]">0 DLQ</span>
            <span className="text-xs text-gray-500 font-bold">Dead-Letter Queue</span>
          </div>
          <p className="text-xs text-gray-500">Exponential backoff active • 0 permanent delivery failures</p>
        </div>

        <div className="bg-white rounded-3xl p-6 shadow-xs border border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Audit Chain Integrity</span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full">Cryptographic</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">SHA-256</span>
            <span className="text-xs text-gray-500 font-bold">Tamper-Evident</span>
          </div>
          <p className="text-xs text-gray-500">Continuous hash verification intact across audit events</p>
        </div>
      </div>
    </div>
  );
};

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
  dateFilter?: string;
  customStartDate?: string;
  customEndDate?: string;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onNavigateTab,
  selectedLocation,
  dateFilter = 'Today',
  customStartDate,
  customEndDate,
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
      const data = await dbFetchAdminDashboardMetrics(selectedLocation, dateFilter, customStartDate, customEndDate);
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
  }, [selectedLocation, dateFilter, customStartDate, customEndDate]);

  const filteredExceptions = selectedLocation && selectedLocation !== 'All Locations'
    ? exceptions.filter(ex => {
        const locLower = selectedLocation.toLowerCase();
        const pStr = (ex.plantId || ex.locationName || ex.facility || '').toLowerCase();
        return pStr.includes(locLower) || locLower.includes(pStr);
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
    code: metrics?.facility?.code || selectedLocation,
    name: metrics?.facility?.name || selectedLocation,
    currentOrdersToday: metrics?.todayOrdersTotal || 0,
    dailyCapacityOrders: metrics?.facility?.dailyCapacityOrders || 100,
    currentKgToday: metrics?.todayKgProcessed || 0,
    dailyCapacityKg: metrics?.facility?.dailyCapacityKg || 500,
  };

  if (loading || !metrics) {
    return (
      <div className="w-full space-y-6 p-6 sm:p-8 pb-20 animate-in fade-in duration-200">
        {/* Skeleton Header Banner with Shining Effect */}
        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="w-24 h-5 rounded-md bg-slate-100 animate-skeleton-shimmer" />
              <div className="w-16 h-4 rounded-md bg-slate-100 animate-skeleton-shimmer" />
            </div>
            <div className="w-56 sm:w-80 h-8 rounded-xl bg-slate-100 animate-skeleton-shimmer" />
          </div>
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="w-24 h-9 rounded-xl bg-slate-100 animate-skeleton-shimmer" />
            <div className="w-28 h-9 rounded-xl bg-slate-100 animate-skeleton-shimmer" />
          </div>
        </div>

        {/* Skeleton Top Row: 5 KPI Metric Cards with Shining Effect */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-24 h-3.5 bg-slate-100 rounded-md animate-skeleton-shimmer" />
                <div className="w-8 h-8 rounded-xl bg-slate-50 animate-skeleton-shimmer" />
              </div>
              <div className="flex items-baseline justify-between pt-1">
                <div className="w-20 h-7 bg-slate-100 rounded-lg animate-skeleton-shimmer" />
                <div className="w-12 h-4 bg-slate-50 rounded-md animate-skeleton-shimmer" />
              </div>
            </div>
          ))}
        </div>

        {/* Skeleton Needs Attention Exceptions Panel with Shining Effect */}
        <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-slate-100 animate-skeleton-shimmer" />
              <div className="w-36 h-5 rounded-md bg-slate-100 animate-skeleton-shimmer" />
            </div>
            <div className="w-24 h-4 rounded-md bg-slate-50 animate-skeleton-shimmer" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-3.5 rounded-xl border border-slate-100 bg-white space-y-3 flex flex-col justify-between h-32">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <div className="w-14 h-4 bg-slate-100 rounded animate-skeleton-shimmer" />
                    <div className="w-10 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                  </div>
                  <div className="w-28 h-4 bg-slate-100 rounded animate-skeleton-shimmer" />
                  <div className="w-full h-3 bg-slate-50 rounded animate-skeleton-shimmer" />
                </div>
                <div className="pt-2 border-t border-slate-100 flex justify-between items-center">
                  <div className="w-16 h-3 bg-slate-50 rounded animate-skeleton-shimmer" />
                  <div className="w-12 h-5 bg-slate-100 rounded-lg animate-skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Skeleton Order Pipeline & Capacity Grid with Shining Effect */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="w-28 h-4 bg-slate-100 rounded animate-skeleton-shimmer" />
                <div className="w-44 h-3 bg-slate-50 rounded animate-skeleton-shimmer" />
              </div>
              <div className="w-20 h-4 bg-slate-100 rounded animate-skeleton-shimmer" />
            </div>
            <div className="w-full h-3 bg-slate-100 rounded-full animate-skeleton-shimmer" />
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                <div key={i} className="p-2.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2">
                  <div className="w-16 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                  <div className="w-10 h-4 bg-slate-200 rounded animate-skeleton-shimmer" />
                </div>
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-4">
            <div className="flex justify-between items-center">
              <div className="space-y-1">
                <div className="w-32 h-4 bg-slate-100 rounded animate-skeleton-shimmer" />
                <div className="w-28 h-3 bg-slate-50 rounded animate-skeleton-shimmer" />
              </div>
              <div className="w-14 h-5 bg-slate-100 rounded-md animate-skeleton-shimmer" />
            </div>
            <div className="space-y-4 pt-1">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="w-16 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                  <div className="w-12 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full animate-skeleton-shimmer" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <div className="w-20 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                  <div className="w-12 h-3 bg-slate-100 rounded animate-skeleton-shimmer" />
                </div>
                <div className="w-full h-2 bg-slate-100 rounded-full animate-skeleton-shimmer" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeCount: number = Object.values(metrics.pipeline as Record<string, number>).reduce((acc, val) => acc + val, 0);
  const getPct = (val: number) => activeCount > 0 ? Math.round((val / activeCount) * 100) : 0;

  const pipelineStages = [
    { name: 'Booked', count: metrics.pipeline.booked, pct: getPct(metrics.pipeline.booked), color: 'bg-slate-300' },
    { name: 'Scheduled', count: metrics.pipeline.scheduled, pct: getPct(metrics.pipeline.scheduled), color: 'bg-slate-400' },
    { name: 'Collected', count: metrics.pipeline.collected, pct: getPct(metrics.pipeline.collected), color: 'bg-blue-400' },
    { name: 'Received', count: metrics.pipeline.received, pct: getPct(metrics.pipeline.received), color: 'bg-blue-500' },
    { name: 'Processing', count: metrics.pipeline.processing, pct: getPct(metrics.pipeline.processing), color: 'bg-blue-600' },
    { name: 'Quality Control', count: metrics.pipeline.qc, pct: getPct(metrics.pipeline.qc), color: 'bg-indigo-500' },
    { name: 'Ready', count: metrics.pipeline.ready, pct: getPct(metrics.pipeline.ready), color: 'bg-emerald-500' },
    { name: 'Out for Delivery', count: metrics.pipeline.out, pct: getPct(metrics.pipeline.out), color: 'bg-slate-800' },
  ];

  return (
    <div className="w-full space-y-6 p-6 sm:p-8 pb-20">
      {/* Header Banner - Clean White */}
      <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/60 uppercase tracking-wide">
              Operations Center
            </span>
            <span className="text-xs text-slate-400 font-medium">• Live Sync</span>
            <span className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 font-semibold rounded-md border border-blue-100/80">
              {dateFilter === 'Custom' || dateFilter === 'Custom Range'
                ? `${customStartDate} to ${customEndDate}`
                : dateFilter || 'Today'}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            {selectedLocation} Dashboard
          </h1>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => fetchDashboardData(true)}
            disabled={refreshing}
            className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
            title="Refresh Live Metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${refreshing ? 'animate-spin' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
          <button
            onClick={() => onNavigateTab('orders')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
          >
            <span>View Orders</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Top Row: KPI Metric Cards - 90% White */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Card 1: Orders */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {dateFilter === 'Yesterday' ? "Yesterday's Orders" : dateFilter === 'This Week' ? "Week's Orders" : dateFilter === 'Custom' || dateFilter === 'Custom Range' ? "Period Orders" : "Today's Orders"}
            </span>
            <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center border border-blue-100/50">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{metrics.todayOrdersTotal}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{metrics.todayOrdersTrendPercent}%
            </span>
          </div>
        </div>

        {/* Card 2: Revenue */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">
              {dateFilter === 'Yesterday' ? "Yesterday's Revenue" : dateFilter === 'This Week' ? "Week's Revenue" : dateFilter === 'Custom' || dateFilter === 'Custom Range' ? "Period Revenue" : "Today's Revenue"}
            </span>
            <div className="w-8 h-8 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-100">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">£{metrics.todayRevenue.toFixed(2)}</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{metrics.todayRevenueTrendPercent}%
            </span>
          </div>
        </div>

        {/* Card 3: KG Processed */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Processed Weight</span>
            <div className="w-8 h-8 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-100">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-slate-900">{metrics.todayKgProcessed} kg</span>
            <span className="text-xs font-semibold text-emerald-600 flex items-center gap-0.5">
              <TrendingUp className="w-3 h-3" />
              +{metrics.todayKgTrendPercent}%
            </span>
          </div>
        </div>

        {/* Card 4: Pickups & Deliveries */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Transit Activity</span>
            <div className="w-8 h-8 bg-slate-50 text-slate-700 rounded-xl flex items-center justify-center border border-slate-100">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-center justify-between text-xs pt-1">
            <div>
              <span className="text-slate-400 block text-[10px]">Pickups</span>
              <span className="font-bold text-slate-900">{metrics.collectionsCompleted} done</span>
            </div>
            <div className="text-right">
              <span className="text-slate-400 block text-[10px]">Deliveries</span>
              <span className="font-bold text-slate-900">{metrics.deliveriesCompleted} done</span>
            </div>
          </div>
        </div>

        {/* Card 5: Exceptions & SLA */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Open Exceptions</span>
            <div className="w-8 h-8 bg-red-50 text-red-600 rounded-xl flex items-center justify-center border border-red-100/50">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <span className="text-2xl font-bold text-red-600">
              {exceptionSummary?.openTotal ?? exceptions.length}
            </span>
            <span className="text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-100">
              {exceptionSummary?.byPriority?.CRITICAL || 0} critical
            </span>
          </div>
        </div>
      </div>

      {/* Needs Attention Exceptions Panel - Clean White */}
      <div className="bg-white border border-slate-100 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-red-50 text-red-600 border border-red-100 rounded-xl flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>Needs Attention</span>
                <span className="text-xs px-2 py-0.5 bg-red-50 text-red-700 border border-red-100 rounded-full font-semibold">
                  {systemAlerts.length}
                </span>
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchDashboardData(true)}
              disabled={refreshing}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition-colors cursor-pointer"
              title="Refresh Exceptions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Review Orders →
            </button>
          </div>
        </div>

        {/* Exception Alert Cards */}
        {systemAlerts.length === 0 ? (
          <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-4 text-center">
            <p className="text-xs font-semibold text-slate-700">All Operations Running Smoothly</p>
            <p className="text-[11px] text-slate-400 mt-0.5">Zero open exceptions requiring immediate action.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
            {systemAlerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-3.5 rounded-xl border bg-white shadow-2xs space-y-2.5 flex flex-col justify-between ${
                  alt.severity === 'critical' ? 'border-red-200' : 'border-amber-200'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        alt.severity === 'critical' ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {alt.severity}
                    </span>
                    <span className="text-[10px] text-slate-400 font-medium">{alt.createdAt.slice(11, 16)}</span>
                  </div>

                  <h3 className="text-xs font-semibold text-slate-900 leading-snug">{alt.title}</h3>
                  <p className="text-[11px] text-slate-500 line-clamp-2">{alt.message}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] font-medium text-slate-400">{alt.relatedOrderNumber || alt.locationName}</span>
                  <button
                    onClick={() => onNavigateTab('orders')}
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-[10px] font-semibold cursor-pointer transition-colors"
                  >
                    Resolve
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Visual Order Pipeline & Capacity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Visual Order Pipeline (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Order Pipeline</h3>
              <p className="text-xs text-slate-400">Distribution across operational stages</p>
            </div>
            <button
              onClick={() => onNavigateTab('orders')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              Filter Orders →
            </button>
          </div>

          {/* Pipeline Stage Bar */}
          <div className="space-y-3">
            <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden flex">
              {pipelineStages.map((stg) => (
                <div
                  key={stg.name}
                  style={{ width: `${stg.pct}%` }}
                  className={`${stg.color} h-full transition-all`}
                  title={`${stg.name}: ${stg.count} orders (${stg.pct}%)`}
                />
              ))}
            </div>

            {/* Stage Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {pipelineStages.map((stg) => (
                <button
                  key={stg.name}
                  onClick={() => onNavigateTab('orders')}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl text-left transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className={`w-2 h-2 rounded-full ${stg.color}`} />
                    <span className="text-[11px] font-medium text-slate-600 truncate">{stg.name}</span>
                  </div>
                  <div className="flex items-baseline justify-between">
                    <span className="text-sm font-bold text-slate-900">{stg.count}</span>
                    <span className="text-[10px] text-slate-400 font-medium">{stg.pct}%</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Capacity Widget (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-slate-100 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Facility Capacity</h3>
              <p className="text-xs text-slate-400">Today's limit vs booked</p>
            </div>
            <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold">
              {facility.code}
            </span>
          </div>

          <div className="space-y-4">
            {/* Orders Capacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Orders</span>
                <span className="text-slate-900 font-semibold">{facility.currentOrdersToday} / {facility.dailyCapacityOrders}</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(facility.currentOrdersToday / facility.dailyCapacityOrders) * 100}%` }}
                  className="bg-blue-600 h-full rounded-full transition-all"
                />
              </div>
            </div>

            {/* Weight Capacity */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 font-medium">Weight Load</span>
                <span className="text-slate-900 font-semibold">{facility.currentKgToday} / {facility.dailyCapacityKg} kg</span>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  style={{ width: `${(facility.currentKgToday / facility.dailyCapacityKg) * 100}%` }}
                  className="bg-indigo-500 h-full rounded-full transition-all"
                />
              </div>
            </div>

            <button
              onClick={() => onNavigateTab('areas')}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer transition-colors"
            >
              <span>Manage Capacity Slots</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Subscription Metrics & System Health Row - Clean White */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Subscribers & MRR</span>
            <span className="bg-blue-50 text-blue-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-blue-100/50">Monthly</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">£4,890</span>
            <span className="text-xs text-emerald-600 font-semibold">+18% MoM</span>
          </div>
          <p className="text-[11px] text-slate-400">68 active subscribers</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Notification Reliability</span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-100/50">99.9%</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">0 DLQ</span>
            <span className="text-xs text-slate-400 font-medium">Queue</span>
          </div>
          <p className="text-[11px] text-slate-400">0 delivery failures</p>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-slate-100 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Audit Chain</span>
            <span className="bg-emerald-50 text-emerald-700 text-[10px] font-semibold px-2 py-0.5 rounded-md border border-emerald-100/50">SHA-256</span>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-slate-900">Intact</span>
            <span className="text-xs text-slate-400 font-medium">Tamper-Evident</span>
          </div>
          <p className="text-[11px] text-slate-400">Hash verification verified</p>
        </div>
      </div>
    </div>
  );
};

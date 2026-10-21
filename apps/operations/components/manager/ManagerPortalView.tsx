'use client';

import React, { useState, useEffect } from 'react';
import {
    Truck, Users, RefreshCw, ShoppingBag, Package, Clock, Shield,
    AlertTriangle, CheckCircle2, ArrowRight, X, Check, Activity,
    Sparkles, ArrowUpRight, ChevronRight, Layers, HelpCircle,
    BarChart3, TrendingUp
} from 'lucide-react';
import { dbFetchManagerDashboard, apiFetch } from '@laundelle/api-client';
import { FleetManagementView } from './FleetManagementView';
import { InventoryManagementView } from './InventoryManagementView';

interface ManagerPortalViewProps {
    onNavigateTab: (tab: any) => void;
    dateFilter?: string;
    customStartDate?: string;
    customEndDate?: string;
}

export const ManagerPortalView: React.FC<ManagerPortalViewProps> = ({
    onNavigateTab,
    dateFilter = 'Today',
    customStartDate,
    customEndDate,
}) => {
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeViewTab, setActiveViewTab] = useState<'overview' | 'exceptions' | 'capacity' | 'fleet' | 'inventory'>('overview');
    const [capacityReport, setCapacityReport] = useState<any | null>(null);
    const [capacityLoading, setCapacityLoading] = useState(false);
    const [hoveredProcIdx, setHoveredProcIdx] = useState<number | null>(null);
    const [hoveredTrendsIdx, setHoveredTrendsIdx] = useState<number | null>(null);

    // Exceptions state
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [exceptionsLoading, setExceptionsLoading] = useState(false);
    const [exceptionFilter, setExceptionFilter] = useState<string>('ALL');
    const [resolvingException, setResolvingException] = useState<any | null>(null);
    const [resolveAction, setResolveAction] = useState<string>('reassign_driver');
    const [resolveNotes, setResolveNotes] = useState<string>('');
    const [resolvingLoading, setResolvingLoading] = useState(false);

    const loadDashboardData = async (df = dateFilter, sd = customStartDate, ed = customEndDate) => {
        setLoading(true);
        const result = await dbFetchManagerDashboard(df, sd, ed);
        setData(result);
        setLoading(false);
    };

    const loadExceptions = async () => {
        setExceptionsLoading(true);
        try {
            const rawSession = localStorage.getItem('l2u_auth_session');
            const token = rawSession ? JSON.parse(rawSession).token : null;
            const plantParam = data?.plantId || data?.plantCode || data?.plant_id || data?.id || '';
            const res = await apiFetch(`/api/v1/exceptions?plantId=${encodeURIComponent(plantParam)}&status=OPEN`, {
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });
            const resData = await res.json();
            if (resData.exceptions) {
                setExceptions(resData.exceptions);
            }
        } catch (e) {
            console.error('Failed to load exceptions', e);
        } finally {
            setExceptionsLoading(false);
        }
    };

    const loadCapacity = async () => {
        setCapacityLoading(true);
        try {
            const rawSession = localStorage.getItem('l2u_auth_session');
            const token = rawSession ? JSON.parse(rawSession).token : null;
            const plantParam = data?.plantId || data?.plantCode || data?.plant_id || data?.id || '';
            const res = await apiFetch(`/api/v1/plants/${encodeURIComponent(plantParam)}/capacity`, {
                headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
            });
            const resData = await res.json();
            if (resData.report) {
                setCapacityReport(resData.report);
            }
        } catch (e) {
            console.error('Failed to load capacity report', e);
        } finally {
            setCapacityLoading(false);
        }
    };

    useEffect(() => {
        loadDashboardData(dateFilter, customStartDate, customEndDate);
    }, [dateFilter, customStartDate, customEndDate]);

    useEffect(() => {
        if (data) {
            loadExceptions();
            loadCapacity();
        }
    }, [data?.plantId, data?.plantCode]);

    const handleResolve = async () => {
        if (!resolvingException || !resolveAction || !resolveNotes.trim()) {
            alert('Please provide resolution action and explanation notes.');
            return;
        }
        setResolvingLoading(true);
        try {
            const rawSession = localStorage.getItem('l2u_auth_session');
            const token = rawSession ? JSON.parse(rawSession).token : null;
            const res = await apiFetch(`/api/v1/exceptions/${resolvingException.id}/resolve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify({
                    action: resolveAction,
                    notes: resolveNotes
                })
            });
            const resData = await res.json();
            if (!res.ok) throw new Error(resData.error || 'Failed to resolve exception');
            alert(`Exception #${resolvingException.id} resolved successfully!`);
            setResolvingException(null);
            setResolveNotes('');
            loadExceptions();
            loadDashboardData();
        } catch (err: any) {
            alert(err.message || 'Error resolving exception');
        } finally {
            setResolvingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-3">
                <RefreshCw className="w-6 h-6 text-blue-600 animate-spin" />
                <p className="text-xs font-medium text-slate-400">Loading plant operations...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="w-full p-8 max-w-md mx-auto text-center space-y-4 my-12 bg-white rounded-2xl border border-slate-100 shadow-sm">
                <div className="w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center mx-auto text-rose-600">
                    <Shield className="w-6 h-6" />
                </div>
                <div>
                    <h2 className="text-base font-bold text-slate-900">No Plant Assignment Found</h2>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                        Your manager account is not assigned to a physical laundry facility yet.
                    </p>
                </div>
                <button
                    onClick={() => loadDashboardData()}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-medium rounded-xl text-xs cursor-pointer flex items-center gap-1.5 mx-auto transition-colors"
                >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                </button>
            </div>
        );
    }

    const { plantName, plantCode, managerName, stats, staff, analytics } = data || {};

    const filteredExceptions = exceptions.filter(ex => {
        if (exceptionFilter === 'ALL') return true;
        if (exceptionFilter === 'CRITICAL') return ex.priority === 'CRITICAL' || ex.priority === 'HIGH' || ex.priority === 'critical' || ex.priority === 'high';
        return ex.type?.toLowerCase().includes(exceptionFilter.toLowerCase());
    });

    const openExceptionsCount = exceptions.length;
    const formattedDate = new Date().toLocaleDateString('en-GB', {
        weekday: 'long',
        month: 'short',
        day: 'numeric'
    });

    return (
        <div className="w-full max-w-7xl mx-auto p-4 sm:p-8 space-y-8 pb-20">
            {/* Header Section (like reference image: 'Welcome back, Rajesh' + date on right) */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                        Welcome back, {managerName || 'Manager'}
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">
                        Here&apos;s what&apos;s happening with your plant operations today.
                    </p>
                </div>

                <div className="flex items-center gap-3 self-start sm:self-auto">
                    <span className="text-xs sm:text-sm font-medium text-slate-400">
                        {formattedDate}
                    </span>
                    <button
                        onClick={() => { loadDashboardData(); loadExceptions(); loadCapacity(); }}
                        disabled={loading || exceptionsLoading || capacityLoading}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                        title="Refresh live data"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${loading || exceptionsLoading || capacityLoading ? 'animate-spin text-blue-600' : ''}`} />
                    </button>
                </div>
            </div>

            {/* ROW 1 — DAILY OPERATIONS OVERVIEW */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        ROW 1 — DAILY OPERATIONS OVERVIEW
                    </span>
                    <button
                        onClick={() => onNavigateTab('orders')}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 cursor-pointer group"
                    >
                        <span>View all orders</span>
                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                    </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Today's Orders */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <ShoppingBag className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Today&apos;s Orders</span>
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.todayOrders ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Received or assigned to plant today
                        </p>
                    </div>

                    {/* Card 2: Active Orders */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Layers className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Active Orders</span>
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.activeOrders ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            In active, nonterminal workflow stages
                        </p>
                    </div>

                    {/* Card 3: Completed Today */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Completed Today</span>
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.completedToday ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Reached plant-completion milestone today
                        </p>
                    </div>

                    {/* Card 4: Delayed Orders */}
                    <div className={`bg-white rounded-2xl border p-5 shadow-xs space-y-2 transition-all ${
                        (stats?.delayedOrders ?? 0) > 0 ? 'border-rose-100 bg-rose-50/10' : 'border-slate-100'
                    }`}>
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <AlertTriangle className={`w-3.5 h-3.5 ${(stats?.delayedOrders ?? 0) > 0 ? 'text-rose-500' : 'text-slate-400'}`} />
                                <span className="text-xs font-medium">Delayed Orders</span>
                            </div>
                            {(stats?.delayedOrders ?? 0) > 0 && (
                                <span className="bg-rose-50 text-rose-600 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-rose-100">
                                    Action Required
                                </span>
                            )}
                        </div>
                        <p className={`text-2xl sm:text-3xl font-bold ${(stats?.delayedOrders ?? 0) > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
                            {stats?.delayedOrders ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Active orders exceeding SLA deadline
                        </p>
                    </div>
                </div>
            </div>

            {/* ROW 2 — PLANT PERFORMANCE AND RESOURCES */}
            <div className="space-y-4">
                <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                    ROW 2 — PLANT PERFORMANCE AND RESOURCES
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 5: On-Time Completion Rate */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">On-Time Completion Rate</span>
                            </div>
                            {stats?.onTimeCompletionRate !== null && stats?.onTimeCompletionRate !== undefined && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    stats.onTimeCompletionRate >= 95 ? 'bg-emerald-50 text-emerald-700' : stats.onTimeCompletionRate >= 85 ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                    Target 95%
                                </span>
                            )}
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.onTimeCompletionRate !== null && stats?.onTimeCompletionRate !== undefined ? `${stats.onTimeCompletionRate}%` : '—'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {stats?.onTimeCompletionRate !== null && stats?.onTimeCompletionRate !== undefined
                                ? 'Completed on or before deadline'
                                : 'No eligible orders due in period'}
                        </p>
                    </div>

                    {/* Card 6: Ready for Dispatch */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Truck className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Ready for Dispatch</span>
                            </div>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.readyForDispatch ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            Quality-approved, awaiting pickup
                        </p>
                    </div>

                    {/* Card 7: Staff on Duty */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Staff on Duty</span>
                            </div>
                            <span className="bg-slate-50 border border-slate-100 text-slate-600 text-[10px] font-semibold px-2 py-0.5 rounded-md">
                                Shift Live
                            </span>
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.staffOnDuty?.onDuty ?? 0} / {stats?.staffOnDuty?.scheduled ?? stats?.staffOnDuty?.total ?? staff?.list?.length ?? 0}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {stats?.staffOnDuty?.label || 'Confirmed on duty vs assigned staff'}
                        </p>
                    </div>

                    {/* Card 8: Quality Pass Rate */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-xs space-y-2 hover:border-slate-200 transition-all">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5 text-slate-400">
                                <Shield className="w-3.5 h-3.5 text-slate-400" />
                                <span className="text-xs font-medium">Quality Pass Rate</span>
                            </div>
                            {stats?.qualityPassRate !== null && stats?.qualityPassRate !== undefined && (
                                <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                    stats.qualityPassRate >= 98 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                                }`}>
                                    Standard 98%
                                </span>
                            )}
                        </div>
                        <p className="text-2xl sm:text-3xl font-bold text-slate-900">
                            {stats?.qualityPassRate !== null && stats?.qualityPassRate !== undefined ? `${stats.qualityPassRate}%` : '—'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                            {stats?.qualityPassRate !== null && stats?.qualityPassRate !== undefined
                                ? 'Orders passing first inspection'
                                : 'No first inspections completed'}
                        </p>
                    </div>
                </div>
            </div>

            {/* ROW 3 — ANALYTICS CHARTS */}
            <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
                        ROW 3 — ANALYTICS CHARTS
                    </span>
                    <span className="text-xs font-medium text-slate-500">
                        Reporting Period: <strong className="text-slate-800">{analytics?.reportingPeriod || dateFilter}</strong>
                    </span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* CHART 1: Order Processing Overview */}
                    {(() => {
                        const procData = analytics?.orderProcessingOverview || [];
                        const totalRec = procData.reduce((acc: number, d: any) => acc + (d.received || 0), 0);
                        const totalProc = procData.reduce((acc: number, d: any) => acc + (d.processed || 0), 0);
                        const totalComp = procData.reduce((acc: number, d: any) => acc + (d.completed || 0), 0);
                        const maxVolume = Math.max(1, ...procData.flatMap((d: any) => [d.received || 0, d.processed || 0, d.completed || 0]));

                        const pLeft = 32;
                        const pRight = 14;
                        const pTop = 15;
                        const pBottom = 25;
                        const svgW = 500;
                        const svgH = 190;
                        const pWidth = svgW - pLeft - pRight;
                        const pHeight = svgH - pTop - pBottom;

                        return (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 flex flex-col justify-between">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                                            <BarChart3 className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Order Processing Overview
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Daily orders received, in processing, and completed
                                            </p>
                                        </div>
                                    </div>

                                    {/* Series Legend */}
                                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                                            <span>Received</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
                                            <span>Processed</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                                            <span>Completed</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Multi-series Chart Visual */}
                                <div className="relative pt-2">
                                    {procData.length === 0 ? (
                                        <div className="h-44 flex flex-col items-center justify-center text-slate-400 space-y-1">
                                            <Package className="w-5 h-5 text-slate-300" />
                                            <span className="text-xs font-medium">No order activity recorded in this period</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44 overflow-visible">
                                                {/* Grid lines */}
                                                {[0, 0.5, 1].map((ratio, gIdx) => {
                                                    const gy = pTop + pHeight * (1 - ratio);
                                                    const valLabel = Math.round(maxVolume * ratio);
                                                    return (
                                                        <g key={gIdx}>
                                                            <line
                                                                x1={pLeft}
                                                                y1={gy}
                                                                x2={pLeft + pWidth}
                                                                y2={gy}
                                                                stroke="#f1f5f9"
                                                                strokeDasharray={ratio === 0 ? undefined : '3 3'}
                                                                strokeWidth="1"
                                                            />
                                                            <text
                                                                x={pLeft - 6}
                                                                y={gy + 3}
                                                                textAnchor="end"
                                                                fontSize="10"
                                                                fill="#94a3b8"
                                                                fontFamily="monospace"
                                                            >
                                                                {valLabel}
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Grouped Bars per Day */}
                                                {procData.map((day: any, idx: number) => {
                                                    const slotW = pWidth / procData.length;
                                                    const barW = Math.max(3, Math.min(8, slotW / 4));
                                                    const gap = 2;
                                                    const groupW = barW * 3 + gap * 2;
                                                    const startX = pLeft + idx * slotW + (slotW - groupW) / 2;

                                                    const hRec = maxVolume > 0 ? (day.received / maxVolume) * pHeight : 0;
                                                    const hProc = maxVolume > 0 ? (day.processed / maxVolume) * pHeight : 0;
                                                    const hComp = maxVolume > 0 ? (day.completed / maxVolume) * pHeight : 0;

                                                    const isHovered = hoveredProcIdx === idx;

                                                    return (
                                                        <g key={idx}>
                                                            {/* Slot hover highlight */}
                                                            {isHovered && (
                                                                <rect
                                                                    x={pLeft + idx * slotW}
                                                                    y={pTop}
                                                                    width={slotW}
                                                                    height={pHeight}
                                                                    fill="#f8fafc"
                                                                    rx="4"
                                                                />
                                                            )}

                                                            {/* Bar 1: Received */}
                                                            <rect
                                                                x={startX}
                                                                y={pTop + pHeight - hRec}
                                                                width={barW}
                                                                height={Math.max(day.received > 0 ? 3 : 0, hRec)}
                                                                fill="#2563EB"
                                                                rx="1.5"
                                                                className="transition-all duration-200"
                                                            />

                                                            {/* Bar 2: Processed */}
                                                            <rect
                                                                x={startX + barW + gap}
                                                                y={pTop + pHeight - hProc}
                                                                width={barW}
                                                                height={Math.max(day.processed > 0 ? 3 : 0, hProc)}
                                                                fill="#F59E0B"
                                                                rx="1.5"
                                                                className="transition-all duration-200"
                                                            />

                                                            {/* Bar 3: Completed */}
                                                            <rect
                                                                x={startX + (barW + gap) * 2}
                                                                y={pTop + pHeight - hComp}
                                                                width={barW}
                                                                height={Math.max(day.completed > 0 ? 3 : 0, hComp)}
                                                                fill="#10B981"
                                                                rx="1.5"
                                                                className="transition-all duration-200"
                                                            />

                                                            {/* X Axis Label */}
                                                            <text
                                                                x={pLeft + idx * slotW + slotW / 2}
                                                                y={svgH - 4}
                                                                textAnchor="middle"
                                                                fontSize="10"
                                                                fill={isHovered ? '#0f172a' : '#94a3b8'}
                                                                fontWeight={isHovered ? '600' : 'normal'}
                                                            >
                                                                {day.label}
                                                            </text>

                                                            {/* Mouse Capture Zone */}
                                                            <rect
                                                                x={pLeft + idx * slotW}
                                                                y={0}
                                                                width={slotW}
                                                                height={svgH}
                                                                fill="transparent"
                                                                className="cursor-pointer"
                                                                onMouseEnter={() => setHoveredProcIdx(idx)}
                                                                onMouseLeave={() => setHoveredProcIdx(null)}
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>

                                            {/* Hover Tooltip Card */}
                                            {hoveredProcIdx !== null && procData[hoveredProcIdx] && (
                                                <div
                                                    className="absolute z-20 bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all space-y-1 min-w-[130px]"
                                                    style={{
                                                        left: `${((pLeft + (hoveredProcIdx + 0.5) * (pWidth / procData.length)) / svgW) * 100}%`,
                                                        top: '15px'
                                                    }}
                                                >
                                                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 text-[11px]">
                                                        {procData[hoveredProcIdx].label}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] gap-2">
                                                        <span className="text-blue-400">Received:</span>
                                                        <span className="font-bold text-white">{procData[hoveredProcIdx].received}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] gap-2">
                                                        <span className="text-amber-400">Processed:</span>
                                                        <span className="font-bold text-white">{procData[hoveredProcIdx].processed}</span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] gap-2">
                                                        <span className="text-emerald-400">Completed:</span>
                                                        <span className="font-bold text-white">{procData[hoveredProcIdx].completed}</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Summary Footer */}
                                <div className="grid grid-cols-3 gap-2.5 pt-3 border-t border-slate-100 text-center">
                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Received</span>
                                        <span className="text-sm font-bold text-blue-600 block">{totalRec}</span>
                                    </div>
                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Processed</span>
                                        <span className="text-sm font-bold text-amber-600 block">{totalProc}</span>
                                    </div>
                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Total Completed</span>
                                        <span className="text-sm font-bold text-emerald-600 block">{totalComp}</span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}

                    {/* CHART 2: Plant Performance Trends */}
                    {(() => {
                        const trendsData = analytics?.plantPerformanceTrends || [];

                        const pLeft = 40;
                        const pRight = 20;
                        const pTop = 15;
                        const pBottom = 25;
                        const svgW = 500;
                        const svgH = 190;
                        const pWidth = svgW - pLeft - pRight;
                        const pHeight = svgH - pTop - pBottom;

                        const getX = (idx: number) => {
                            if (trendsData.length <= 1) return pLeft + pWidth / 2;
                            return pLeft + (idx / (trendsData.length - 1)) * pWidth;
                        };
                        const getY = (val: number) => {
                            return pTop + ((100 - Math.max(0, Math.min(100, val))) / 100) * pHeight;
                        };

                        const onTimeCoords = trendsData
                            .map((d: any, idx: number) => d.onTimeRate !== null ? { x: getX(idx), y: getY(d.onTimeRate), rate: d.onTimeRate, idx } : null)
                            .filter(Boolean) as { x: number; y: number; rate: number; idx: number }[];

                        const qualityCoords = trendsData
                            .map((d: any, idx: number) => d.qualityPassRate !== null ? { x: getX(idx), y: getY(d.qualityPassRate), rate: d.qualityPassRate, idx } : null)
                            .filter(Boolean) as { x: number; y: number; rate: number; idx: number }[];

                        const onTimePathD = onTimeCoords.length > 0
                            ? onTimeCoords.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '')
                            : '';

                        const qualityPathD = qualityCoords.length > 0
                            ? qualityCoords.reduce((acc, pt, i) => i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`, '')
                            : '';

                        return (
                            <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4 flex flex-col justify-between">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                                            <TrendingUp className="w-4 h-4" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-slate-900">
                                                Plant Performance Trends
                                            </h3>
                                            <p className="text-xs text-slate-400">
                                                Daily on-time completion rate & quality pass rate
                                            </p>
                                        </div>
                                    </div>

                                    {/* Series Legend */}
                                    <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600 flex-wrap">
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 inline-block" />
                                            <span>On-Time Rate</span>
                                        </div>
                                        <div className="flex items-center gap-1.5">
                                            <span className="w-2.5 h-2.5 rounded-full bg-violet-600 inline-block" />
                                            <span>Quality Pass Rate</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Line Trend Visual (0% - 100% scale) */}
                                <div className="relative pt-2">
                                    {trendsData.length === 0 ? (
                                        <div className="h-44 flex flex-col items-center justify-center text-slate-400 space-y-1">
                                            <Activity className="w-5 h-5 text-slate-300" />
                                            <span className="text-xs font-medium">No performance records in this period</span>
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full h-44 overflow-visible">
                                                {/* Percentage Gridlines 0%, 25%, 50%, 75%, 100% */}
                                                {[0, 25, 50, 75, 100].map((pct, gIdx) => {
                                                    const gy = getY(pct);
                                                    return (
                                                        <g key={gIdx}>
                                                            <line
                                                                x1={pLeft}
                                                                y1={gy}
                                                                x2={pLeft + pWidth}
                                                                y2={gy}
                                                                stroke="#f1f5f9"
                                                                strokeDasharray={pct === 0 ? undefined : '3 3'}
                                                                strokeWidth="1"
                                                            />
                                                            <text
                                                                x={pLeft - 6}
                                                                y={gy + 3}
                                                                textAnchor="end"
                                                                fontSize="10"
                                                                fill="#94a3b8"
                                                                fontFamily="monospace"
                                                            >
                                                                {pct}%
                                                            </text>
                                                        </g>
                                                    );
                                                })}

                                                {/* Vertical Indicator on Hover */}
                                                {hoveredTrendsIdx !== null && (
                                                    <line
                                                        x1={getX(hoveredTrendsIdx)}
                                                        y1={pTop}
                                                        x2={getX(hoveredTrendsIdx)}
                                                        y2={pTop + pHeight}
                                                        stroke="#cbd5e1"
                                                        strokeDasharray="3 3"
                                                        strokeWidth="1.5"
                                                    />
                                                )}

                                                {/* Line 1: On-Time Rate */}
                                                {onTimePathD && (
                                                    <path
                                                        d={onTimePathD}
                                                        fill="none"
                                                        stroke="#2563EB"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                )}

                                                {/* Line 2: Quality Pass Rate */}
                                                {qualityPathD && (
                                                    <path
                                                        d={qualityPathD}
                                                        fill="none"
                                                        stroke="#7C3AED"
                                                        strokeWidth="2.5"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    />
                                                )}

                                                {/* Data Points */}
                                                {onTimeCoords.map((pt, pIdx) => (
                                                    <circle
                                                        key={`ot-${pIdx}`}
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={hoveredTrendsIdx === pt.idx ? 5 : 3.5}
                                                        fill="#ffffff"
                                                        stroke="#2563EB"
                                                        strokeWidth={hoveredTrendsIdx === pt.idx ? 3 : 2}
                                                        className="transition-all duration-150"
                                                    />
                                                ))}

                                                {qualityCoords.map((pt, pIdx) => (
                                                    <circle
                                                        key={`qc-${pIdx}`}
                                                        cx={pt.x}
                                                        cy={pt.y}
                                                        r={hoveredTrendsIdx === pt.idx ? 5 : 3.5}
                                                        fill="#ffffff"
                                                        stroke="#7C3AED"
                                                        strokeWidth={hoveredTrendsIdx === pt.idx ? 3 : 2}
                                                        className="transition-all duration-150"
                                                    />
                                                ))}

                                                {/* X Axis Labels & Mouse Interaction Zones */}
                                                {trendsData.map((day: any, idx: number) => {
                                                    const x = getX(idx);
                                                    const isHovered = hoveredTrendsIdx === idx;
                                                    const slotW = pWidth / Math.max(1, trendsData.length);
                                                    return (
                                                        <g key={idx}>
                                                            <text
                                                                x={x}
                                                                y={svgH - 4}
                                                                textAnchor="middle"
                                                                fontSize="10"
                                                                fill={isHovered ? '#0f172a' : '#94a3b8'}
                                                                fontWeight={isHovered ? '600' : 'normal'}
                                                            >
                                                                {day.label}
                                                            </text>

                                                            <rect
                                                                x={x - slotW / 2}
                                                                y={0}
                                                                width={slotW}
                                                                height={svgH}
                                                                fill="transparent"
                                                                className="cursor-pointer"
                                                                onMouseEnter={() => setHoveredTrendsIdx(idx)}
                                                                onMouseLeave={() => setHoveredTrendsIdx(null)}
                                                            />
                                                        </g>
                                                    );
                                                })}
                                            </svg>

                                            {/* Hover Tooltip Card */}
                                            {hoveredTrendsIdx !== null && trendsData[hoveredTrendsIdx] && (
                                                <div
                                                    className="absolute z-20 bg-slate-900 text-white p-2.5 rounded-xl text-xs shadow-xl pointer-events-none transform -translate-x-1/2 -translate-y-full transition-all space-y-1 min-w-[150px]"
                                                    style={{
                                                        left: `${(getX(hoveredTrendsIdx) / svgW) * 100}%`,
                                                        top: '15px'
                                                    }}
                                                >
                                                    <div className="font-semibold text-slate-200 border-b border-slate-800 pb-1 text-[11px]">
                                                        {trendsData[hoveredTrendsIdx].label}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] gap-2">
                                                        <span className="text-blue-400">On-Time Rate:</span>
                                                        <span className="font-bold text-white">
                                                            {trendsData[hoveredTrendsIdx].onTimeRate !== null
                                                                ? `${trendsData[hoveredTrendsIdx].onTimeRate}%`
                                                                : 'N/A (0 due)'}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] gap-2">
                                                        <span className="text-violet-400">Quality Pass:</span>
                                                        <span className="font-bold text-white">
                                                            {trendsData[hoveredTrendsIdx].qualityPassRate !== null
                                                                ? `${trendsData[hoveredTrendsIdx].qualityPassRate}%`
                                                                : 'N/A (0 inspected)'}
                                                        </span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* Quick Summary Footer */}
                                <div className="grid grid-cols-2 gap-2.5 pt-3 border-t border-slate-100 text-center">
                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Period On-Time Rate</span>
                                        <span className="text-sm font-bold text-blue-600 block">
                                            {stats?.onTimeCompletionRate !== null && stats?.onTimeCompletionRate !== undefined ? `${stats.onTimeCompletionRate}%` : '—'}
                                        </span>
                                    </div>
                                    <div className="bg-slate-50/70 p-2 rounded-xl border border-slate-100/80">
                                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">Period Quality Pass Rate</span>
                                        <span className="text-sm font-bold text-violet-600 block">
                                            {stats?.qualityPassRate !== null && stats?.qualityPassRate !== undefined ? `${stats.qualityPassRate}%` : '—'}
                                        </span>
                                    </div>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            {/* Sub-view Navigation Pill Tabs */}
            <div className="pt-2">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto">
                    {[
                        { id: 'overview', label: 'Facility Overview' },
                        { id: 'exceptions', label: 'Exception Queue', badge: openExceptionsCount },
                        { id: 'capacity', label: 'Plant Capacity', badge: capacityReport?.overallUtilizationPercent ? `${capacityReport.overallUtilizationPercent}%` : undefined },
                        { id: 'fleet', label: 'Vehicles Fleet' },
                        { id: 'inventory', label: 'Consumables & Inventory' },
                    ].map((tab) => {
                        const isActive = activeViewTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                onClick={() => setActiveViewTab(tab.id as any)}
                                className={`px-4 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
                                    isActive
                                        ? 'bg-blue-50/80 text-blue-600 font-semibold border border-blue-100/60 shadow-2xs'
                                        : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-transparent'
                                }`}
                            >
                                <span>{tab.label}</span>
                                {tab.badge !== undefined && (
                                    <span
                                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-semibold ${
                                            isActive
                                                ? 'bg-blue-100 text-blue-700'
                                                : 'bg-slate-100 text-slate-600'
                                        }`}
                                    >
                                        {tab.badge}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* TAB 1: FACILITY OVERVIEW */}
            {activeViewTab === 'overview' && (
                <div className="space-y-6">
                    {/* Staff & Operational Allocation Grids */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Driver Operations Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                                        <Truck className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            Driver Fleet Status
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Assigned to plant delivery sectors
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                    Total: {staff.drivers.total}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-1">
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">Available</span>
                                    <span className="text-lg font-bold text-slate-900">{staff.drivers.available}</span>
                                </div>
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">On Route</span>
                                    <span className="text-lg font-bold text-slate-900">{staff.drivers.busy}</span>
                                </div>
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">Offline</span>
                                    <span className="text-lg font-bold text-slate-400">{staff.drivers.offline}</span>
                                </div>
                            </div>
                        </div>

                        {/* Station Processors Operations Card */}
                        <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 flex items-center justify-center">
                                        <Users className="w-4 h-4" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-slate-900">
                                            Station Processors
                                        </h3>
                                        <p className="text-xs text-slate-400">
                                            Washing and packing operators on shift
                                        </p>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                    Total: {staff.processors.total}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3 pt-1">
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">Available</span>
                                    <span className="text-lg font-bold text-slate-900">{staff.processors.available}</span>
                                </div>
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">Operating</span>
                                    <span className="text-lg font-bold text-slate-900">{staff.processors.processing}</span>
                                </div>
                                <div className="p-3 bg-slate-50/70 border border-slate-100/80 rounded-xl text-center space-y-0.5">
                                    <span className="text-[10px] font-medium text-slate-400 uppercase block">Offline</span>
                                    <span className="text-lg font-bold text-slate-900">{staff.processors.offline}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Access Footer Card */}
                    <div className="bg-white border border-slate-100 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
                        <div className="text-center sm:text-left">
                            <h4 className="text-sm font-semibold text-slate-900">
                                Need to reallocate staff or dispatch drivers?
                            </h4>
                            <p className="text-xs text-slate-400 mt-0.5">
                                Manage operational schedules and real-time plant orders directly.
                            </p>
                        </div>

                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => onNavigateTab('orders')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 text-xs font-medium rounded-xl transition-colors cursor-pointer"
                            >
                                Manage Orders
                            </button>
                            <button
                                onClick={() => onNavigateTab('staff')}
                                className="flex-1 sm:flex-none px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer"
                            >
                                Manage Staff
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: OPERATIONAL EXCEPTION QUEUE */}
            {activeViewTab === 'exceptions' && (
                <div className="space-y-4">
                    {/* Filter bar */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                            {[
                                { id: 'ALL', label: `All Open (${exceptions.length})` },
                                { id: 'CRITICAL', label: 'Critical / High' },
                                { id: 'pickup', label: 'Pickup Failed' },
                                { id: 'delivery', label: 'Delivery Failed' },
                                { id: 'rewash', label: 'Rewash' },
                                { id: 'charge', label: 'Charge Rejected' },
                                { id: 'cod', label: 'COD Discrepancy' }
                            ].map(flt => (
                                <button
                                    key={flt.id}
                                    onClick={() => setExceptionFilter(flt.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer whitespace-nowrap ${
                                        exceptionFilter === flt.id
                                            ? 'bg-slate-900 text-white'
                                            : 'bg-white text-slate-600 hover:bg-slate-50 border border-slate-200'
                                    }`}
                                >
                                    {flt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={loadExceptions}
                            className="px-3 py-1.5 bg-white border border-slate-200 text-xs font-medium text-slate-600 rounded-xl hover:bg-slate-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${exceptionsLoading ? 'animate-spin text-blue-600' : ''}`} />
                            <span>Refresh</span>
                        </button>
                    </div>

                    {/* Exceptions list */}
                    {exceptionsLoading ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-xs space-y-2">
                            <RefreshCw className="w-6 h-6 text-blue-600 animate-spin mx-auto" />
                            <p className="text-xs text-slate-400">Loading exceptions queue...</p>
                        </div>
                    ) : filteredExceptions.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-2xl border border-slate-100 shadow-xs space-y-2">
                            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                            <h3 className="font-semibold text-sm text-slate-900">Zero Open Operational Exceptions</h3>
                            <p className="text-xs text-slate-400">All pickups, processing runs, and delivery batches are running normally.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredExceptions.map(ex => {
                                const isHigh = ex.priority === 'CRITICAL' || ex.priority === 'HIGH' || ex.priority === 'critical' || ex.priority === 'high';
                                return (
                                    <div
                                        key={ex.id}
                                        className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3.5 flex flex-col justify-between"
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${
                                                        isHigh ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                        {ex.priority || 'NORMAL'}
                                                    </span>
                                                    <span className="font-mono text-xs font-semibold text-slate-900">
                                                        #{ex.orderId || ex.orderNumber}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    {ex.createdAt ? new Date(ex.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="font-semibold text-sm text-slate-900 capitalize">
                                                    {(ex.type || 'Operational Exception').replace(/_/g, ' ')}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                                                    {ex.description}
                                                </p>
                                            </div>

                                            {ex.evidence && (
                                                <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                                                    {ex.evidence.reason && <p><strong className="text-slate-800">Reason:</strong> {ex.evidence.reason}</p>}
                                                    {ex.evidence.variance !== undefined && <p><strong className="text-slate-800">Variance:</strong> £{ex.evidence.variance.toFixed(2)}</p>}
                                                    {ex.evidence.notes && <p><strong className="text-slate-800">Notes:</strong> {ex.evidence.notes}</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                                            <span className="text-[11px] text-slate-400 font-mono">ID: {ex.publicId || ex.id}</span>
                                            <button
                                                onClick={() => {
                                                    setResolvingException(ex);
                                                    setResolveAction('reassign_driver');
                                                    setResolveNotes('');
                                                }}
                                                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <span>Resolve</span>
                                                <ArrowRight className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* QUICK RESOLUTION MODAL */}
            {resolvingException && (
                <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-md rounded-2xl p-6 shadow-xl border border-slate-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-xl bg-slate-50 flex items-center justify-center text-slate-700">
                                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-900 text-sm">Resolve Exception</h3>
                                    <p className="text-[11px] text-slate-400">Order #{resolvingException.orderId || resolvingException.orderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setResolvingException(null)}
                                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                            <span className="font-semibold text-[10px] uppercase text-slate-400 tracking-wider">Issue Description</span>
                            <p className="font-medium text-slate-800">{resolvingException.description}</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium text-slate-700 block mb-1">Resolution Action</label>
                                <select
                                    value={resolveAction}
                                    onChange={(e) => setResolveAction(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-800 focus:outline-hidden focus:border-blue-500"
                                >
                                    <option value="reassign_driver">Reassign to New Driver</option>
                                    <option value="reschedule_pickup">Reschedule Pickup Time Window</option>
                                    <option value="reschedule_delivery">Reschedule Delivery Time Window</option>
                                    <option value="waive_discrepancy">Waive Discrepancy / Accept Variance</option>
                                    <option value="manual_override">Manual Operational Override</option>
                                    <option value="cancel_order">Cancel Order & Issue Full Refund</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-medium text-slate-700 block mb-1">Resolution Notes</label>
                                <textarea
                                    rows={3}
                                    placeholder="Enter details on the action taken..."
                                    value={resolveNotes}
                                    onChange={(e) => setResolveNotes(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-hidden focus:border-blue-500"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setResolvingException(null)}
                                className="flex-1 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-medium rounded-xl text-xs transition-colors cursor-pointer border border-slate-200"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResolve}
                                disabled={resolvingLoading}
                                className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                            >
                                {resolvingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirm</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: PLANT CAPACITY & BOTTLENECKS */}
            {activeViewTab === 'capacity' && (
                <div className="space-y-6">
                    {/* Capacity Summary Header */}
                    <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-xs space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="text-[11px] font-semibold text-blue-600 bg-blue-50/80 px-2 py-0.5 rounded-md border border-blue-100/60">
                                    Capacity Load Report
                                </span>
                                <h2 className="text-xl font-bold text-slate-900 mt-2">
                                    {capacityReport?.plantName || plantName} Operational Load
                                </h2>
                                <p className="text-xs text-slate-500 max-w-xl mt-1">
                                    {capacityReport?.bottleneckDescription || 'Analyzing multi-stage pipeline capacity and active machine limits.'}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={loadCapacity}
                                        disabled={capacityLoading}
                                        className="px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${capacityLoading ? 'animate-spin text-blue-600' : ''}`} />
                                        <span>Recalculate Load</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 shrink-0">
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Utilization</span>
                                    <span className="text-2xl font-bold text-slate-900">
                                        {capacityReport?.overallUtilizationPercent !== undefined ? `${capacityReport.overallUtilizationPercent}%` : '0%'}
                                    </span>
                                </div>
                                <div className="h-8 w-px bg-slate-200" />
                                <div className="text-center">
                                    <span className="text-[10px] text-slate-400 block font-medium uppercase">Express Slots</span>
                                    <span className="text-2xl font-bold text-blue-600">
                                        {capacityReport?.expressOrdersToday ?? 0}/{capacityReport?.expressCapacityLimit ?? 20}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Capacity Alerts */}
                        {capacityReport?.alerts && capacityReport.alerts.length > 0 && (
                            <div className="space-y-2 pt-2">
                                {capacityReport.alerts.map((alert: any, idx: number) => (
                                    <div
                                        key={idx}
                                        className="p-3 rounded-xl flex items-center gap-2.5 text-xs font-medium bg-amber-50 text-amber-900 border border-amber-200"
                                    >
                                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                                        <span>{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Stage Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {capacityReport?.stages && Object.values(capacityReport.stages).map((st: any) => (
                            <div
                                key={st.stage}
                                className="bg-white rounded-2xl p-5 border border-slate-100 shadow-xs space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-semibold text-slate-800">{st.stageLabel}</span>
                                    {st.bottleneck && (
                                        <span className="bg-amber-50 text-amber-700 text-[9px] font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                                            Constraint
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between text-xs">
                                        <span className="text-slate-400 font-medium">Load:</span>
                                        <span className="font-semibold text-slate-900">{st.currentLoadKg} / {st.maxCapacityKg} kg</span>
                                    </div>

                                    {/* Progress Bar with subtle blue accent */}
                                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500 bg-blue-600"
                                            style={{ width: `${Math.min(100, st.utilizationPercent)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-slate-400 pt-0.5">
                                        <span>{st.activeItemsCount} batches</span>
                                        <span className="font-semibold text-slate-700">{st.utilizationPercent}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* TAB 4: FLEET MANAGEMENT */}
            {activeViewTab === 'fleet' && (
                <FleetManagementView
                    plantId={data?.plantId || data?.plantCode || data?.plant_id || data?.id || ''}
                    plantName={data?.plantName || 'Facility'}
                    staffDrivers={data?.staff?.drivers || []}
                />
            )}

            {/* TAB 5: INVENTORY MANAGEMENT */}
            {activeViewTab === 'inventory' && (
                <InventoryManagementView
                    plantId={data?.plantId || data?.plantCode || data?.plant_id || data?.id || ''}
                    plantName={data?.plantName || 'Facility'}
                />
            )}
        </div>
    );
};

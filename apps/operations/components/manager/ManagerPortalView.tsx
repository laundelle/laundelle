'use client';

import React, { useState, useEffect } from 'react';
import {
    Truck, Users, RefreshCw, ShoppingBag, Package, Clock, Shield,
    AlertTriangle, CheckCircle2, XCircle, Filter, ArrowRight, X,
    ShieldAlert, Check, AlertCircle, Calendar, MapPin, Activity, Zap
} from 'lucide-react';
import { dbFetchManagerDashboard, apiFetch } from '@laundelle/api-client';
import { FleetManagementView } from './FleetManagementView';
import { InventoryManagementView } from './InventoryManagementView';

interface ManagerPortalViewProps {
    onNavigateTab: (tab: any) => void;
}

export const ManagerPortalView: React.FC<ManagerPortalViewProps> = ({ onNavigateTab }) => {
    const [data, setData] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeViewTab, setActiveViewTab] = useState<'overview' | 'exceptions' | 'capacity' | 'fleet' | 'inventory'>('overview');
    const [capacityReport, setCapacityReport] = useState<any | null>(null);
    const [capacityLoading, setCapacityLoading] = useState(false);

    // Exceptions state
    const [exceptions, setExceptions] = useState<any[]>([]);
    const [exceptionsLoading, setExceptionsLoading] = useState(false);
    const [exceptionFilter, setExceptionFilter] = useState<string>('ALL');
    const [resolvingException, setResolvingException] = useState<any | null>(null);
    const [resolveAction, setResolveAction] = useState<string>('reassign_driver');
    const [resolveNotes, setResolveNotes] = useState<string>('');
    const [resolvingLoading, setResolvingLoading] = useState(false);

    const loadDashboardData = async () => {
        setLoading(true);
        const result = await dbFetchManagerDashboard();
        setData(result);
        setLoading(false);
    };

    const loadExceptions = async () => {
        setExceptionsLoading(true);
        try {
            const rawSession = localStorage.getItem('l2u_auth_session');
            const token = rawSession ? JSON.parse(rawSession).token : null;
            const plantParam = data?.plantCode || data?.plant_id || data?.id || '';
            const res = await apiFetch(`/api/v1/exceptions?plantId=${plantParam}&status=OPEN`, {
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
            const plantParam = data?.plantCode || data?.plant_id || data?.id || 'plant_main';
            const res = await apiFetch(`/api/v1/plants/${plantParam}/capacity`, {
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
        loadDashboardData();
    }, []);

    useEffect(() => {
        if (data) {
            loadExceptions();
            loadCapacity();
        }
    }, [data?.plantCode]);

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
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center space-y-4">
                <RefreshCw className="w-10 h-10 text-[#03045E] animate-spin" />
                <p className="text-sm font-bold text-gray-500">Syncing with laundry plant operations center...</p>
            </div>
        );
    }

    if (!data) {
        return (
            <div className="w-full p-8 max-w-xl mx-auto text-center space-y-4">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                    <Shield className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-heading font-extrabold text-[#03045E]">No Plant Assignment Found</h2>
                <p className="text-xs text-gray-500 leading-relaxed">
                    Your manager account is currently not assigned to any physical laundry facility. Please contact the platform Admin to assign resources or postcode coverage to your profile.
                </p>
                <button
                    onClick={loadDashboardData}
                    className="px-5 py-2.5 bg-gray-100 font-bold rounded-2xl hover:bg-gray-200 text-xs text-[#03045E] cursor-pointer flex items-center gap-1.5 mx-auto transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    <span>Refresh Authorization</span>
                </button>
            </div>
        );
    }

    const { plantName, plantCode, managerName, stats, staff } = data;

    const filteredExceptions = exceptions.filter(ex => {
        if (exceptionFilter === 'ALL') return true;
        if (exceptionFilter === 'CRITICAL') return ex.priority === 'CRITICAL' || ex.priority === 'HIGH' || ex.priority === 'critical' || ex.priority === 'high';
        return ex.type?.toLowerCase().includes(exceptionFilter.toLowerCase());
    });

    const openExceptionsCount = exceptions.length;

    return (
        <div className="w-full space-y-6 md:space-y-8 p-4 md:p-8 pb-24 md:pb-8">
            {/* Top Banner / Heading */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className="bg-[#E63946] text-white px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shrink-0">
                            Facility Focus
                        </span>
                        <span className="text-xs font-mono font-bold text-[#0077B6] truncate">{plantCode}</span>
                    </div>
                    <h1 className="text-xl md:text-2xl font-heading font-extrabold text-[#03045E] mt-1 leading-tight">{plantName}</h1>
                    <p className="text-xs text-gray-500">Plant Manager: <span className="font-extrabold text-[#03045E]">{managerName}</span></p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => { loadDashboardData(); loadExceptions(); loadCapacity(); }}
                        disabled={loading || exceptionsLoading || capacityLoading}
                        className="p-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-[#03045E] cursor-pointer flex items-center gap-1.5 shadow-2xs transition-all shrink-0 text-xs font-bold"
                        title="Sync Plant Operational Center"
                    >
                        <RefreshCw className={`w-4 h-4 text-[#0077B6] ${loading || exceptionsLoading || capacityLoading ? 'animate-spin' : ''}`} />
                        <span className="hidden sm:inline">Sync Center</span>
                    </button>
                </div>
            </div>

            {/* View Switcher Tabs */}
            <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveViewTab('overview')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer ${
                        activeViewTab === 'overview'
                            ? 'bg-[#03045E] text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    Facility Overview & Pipeline
                </button>
                <button
                    onClick={() => setActiveViewTab('exceptions')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        activeViewTab === 'exceptions'
                            ? 'bg-rose-600 text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <AlertTriangle className="w-4 h-4" />
                    <span>Operational Exception Queue</span>
                    {openExceptionsCount > 0 && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            activeViewTab === 'exceptions' ? 'bg-white text-rose-700' : 'bg-rose-100 text-rose-700'
                        }`}>
                            {openExceptionsCount}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveViewTab('capacity')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        activeViewTab === 'capacity'
                            ? 'bg-[#0077B6] text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <Activity className="w-4 h-4" />
                    <span>Plant Capacity & Bottlenecks</span>
                    {capacityReport && (
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            capacityReport.overallUtilizationPercent >= 90 ? 'bg-rose-500 text-white' : 'bg-blue-100 text-blue-900'
                        }`}>
                            {capacityReport.overallUtilizationPercent}%
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveViewTab('fleet')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        activeViewTab === 'fleet'
                            ? 'bg-[#0077B6] text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <Truck className="w-4 h-4" />
                    <span>Vehicles Fleet</span>
                </button>
                <button
                    onClick={() => setActiveViewTab('inventory')}
                    className={`px-5 py-2.5 rounded-2xl text-xs font-extrabold transition-all cursor-pointer flex items-center gap-2 ${
                        activeViewTab === 'inventory'
                            ? 'bg-[#0077B6] text-white shadow-md'
                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                >
                    <Package className="w-4 h-4" />
                    <span>Consumables & Inventory</span>
                </button>
            </div>

            {/* TAB 1: OVERVIEW */}
            {activeViewTab === 'overview' && (
                <div className="space-y-6 md:space-y-8">
                    {/* Overview Cards - 2 col on mobile, 4 on desktop */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5">
                        {[
                          { label: "Today's Orders", value: stats.todayOrders, sub: 'Received today', color: 'text-[#03045E]', bg: 'bg-[#EBF7FF]', icon: ShoppingBag, iconColor: 'text-[#0077B6]' },
                          { label: 'Washing & Ironing', value: stats.processing, sub: 'Active cycles', color: 'text-[#03045E]', bg: 'bg-[#EFEAEE]', icon: Clock, iconColor: 'text-[#7209B7]' },
                          { label: 'Pending Collections', value: stats.pendingPickup, sub: 'Awaiting pickup', color: 'text-[#0077B6]', bg: 'bg-sky-50', icon: Truck, iconColor: 'text-[#00B4D8]' },
                          { label: 'Intake Completed', value: stats.atPlant, sub: 'Facility sorting', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: Package, iconColor: 'text-emerald-600' },
                        ].map((card, i) => (
                          <div key={i} className="bg-white rounded-2xl md:rounded-3xl p-3 md:p-6 border border-gray-100 hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-2">
                              <div className="space-y-1 min-w-0">
                                <span className="text-[9px] md:text-[10px] font-bold text-gray-400 uppercase tracking-wider block leading-tight">{card.label}</span>
                                <h3 className={`text-xl md:text-3xl font-heading font-extrabold ${card.color}`}>{card.value}</h3>
                                <span className={`text-[9px] md:text-[10px] font-extrabold ${card.color} block`}>{card.sub}</span>
                              </div>
                              <div className={`p-2 md:p-3 ${card.bg} rounded-xl md:rounded-2xl shrink-0`}>
                                <card.icon className={`w-4 h-4 md:w-5 md:h-5 ${card.iconColor}`} />
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {/* Plant Order Pipeline Progress */}
                    <div className="bg-white rounded-[32px] p-4 sm:p-8 border border-gray-100 space-y-6 shadow-sm">
                        <div>
                            <h3 className="font-heading font-extrabold text-[#03045E] text-base">Facility Order Pipeline</h3>
                            <p className="text-xs text-gray-500">Real-time breakdown of all parcels categorized under {plantCode}.</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-4 pt-2">
                            {[
                                { label: 'Pending Pickup', count: stats.pendingPickup, color: 'text-amber-600 bg-amber-50 border-amber-100' },
                                { label: 'At Plant / Intake', count: stats.atPlant, color: 'text-violet-600 bg-violet-50 border-violet-100' },
                                { label: 'Processing Cycles', count: stats.processing, color: 'text-indigo-600 bg-indigo-50 border-indigo-100' },
                                { label: 'Ready & Outbound', count: stats.readyForDelivery + stats.outForDelivery, color: 'text-sky-600 bg-sky-50 border-sky-100' },
                                { label: 'Completed Today', count: stats.completed, color: 'text-emerald-600 bg-emerald-50 border-emerald-100' },
                            ].map((step, idx) => (
                                <div key={idx} className={`p-3 md:p-4 rounded-2xl border text-center space-y-1 ${step.color}`}>
                                    <span className="text-[9px] md:text-[10px] font-bold uppercase tracking-wider text-gray-400 block">{step.label}</span>
                                    <h4 className="text-xl md:text-2xl font-bold font-mono">{step.count}</h4>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Staff Activity Grids */}
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
                        {/* Driver Operations */}
                        <div className="bg-white rounded-[32px] p-4 sm:p-8 border border-gray-100 space-y-5 shadow-xs">
                            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                                <div>
                                    <h3 className="font-heading font-extrabold text-[#03045E] text-sm flex items-center gap-1.5">
                                        <Truck className="w-5 h-5 text-[#0077B6]" />
                                        <span>Driver Fleet Utilization</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-400">Drivers registered to postcodes sectors mapped to this hub.</p>
                                </div>
                                <span className="px-2.5 py-0.5 bg-[#CAF0F8] text-[#03045E] rounded-full text-[10px] font-black font-mono">
                                    Total: {staff.drivers.total}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Available</span>
                                    <span className="text-xl font-bold text-emerald-600 font-mono">{staff.drivers.available}</span>
                                </div>
                                <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-widest block">Busy</span>
                                    <span className="text-xl font-bold text-amber-600 font-mono">{staff.drivers.busy}</span>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">Offline</span>
                                    <span className="text-xl font-bold text-gray-500 font-mono">{staff.drivers.offline}</span>
                                </div>
                            </div>
                        </div>

                        {/* Processor Operations */}
                        <div className="bg-white rounded-[32px] p-4 sm:p-8 border border-gray-100 space-y-5 shadow-xs">
                            <div className="flex items-center justify-between border-b pb-3 border-gray-100">
                                <div>
                                    <h3 className="font-heading font-extrabold text-[#03045E] text-sm flex items-center gap-1.5">
                                        <Users className="w-5 h-5 text-[#0077B6]" />
                                        <span>Station Processors Status</span>
                                    </h3>
                                    <p className="text-[11px] text-gray-400">Machine operators and quality control staff on duty.</p>
                                </div>
                                <span className="px-2.5 py-0.5 bg-[#CAF0F8] text-[#03045E] rounded-full text-[10px] font-black font-mono">
                                    Total: {staff.processors.total}
                                </span>
                            </div>

                            <div className="grid grid-cols-3 gap-3">
                                <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest block">Available</span>
                                    <span className="text-xl font-bold text-emerald-600 font-mono">{staff.processors.available}</span>
                                </div>
                                <div className="p-3 bg-violet-50/70 border border-violet-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-violet-800 uppercase tracking-widest block">Processing</span>
                                    <span className="text-xl font-bold text-violet-600 font-mono">{staff.processors.processing}</span>
                                </div>
                                <div className="p-3 bg-gray-50 border border-gray-100 rounded-2xl text-center">
                                    <span className="text-[10px] font-bold text-gray-600 uppercase tracking-widest block">Offline</span>
                                    <span className="text-xl font-bold text-gray-500 font-mono">{staff.processors.offline}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 2: OPERATIONAL EXCEPTION QUEUE */}
            {activeViewTab === 'exceptions' && (
                <div className="space-y-5">
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
                                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                                        exceptionFilter === flt.id
                                            ? 'bg-rose-600 text-white shadow-xs'
                                            : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'
                                    }`}
                                >
                                    {flt.label}
                                </button>
                            ))}
                        </div>

                        <button
                            onClick={loadExceptions}
                            className="px-3 py-1.5 bg-white border border-gray-200 text-xs font-bold text-gray-700 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 cursor-pointer"
                        >
                            <RefreshCw className={`w-3.5 h-3.5 ${exceptionsLoading ? 'animate-spin' : ''}`} />
                            <span>Refresh Queue</span>
                        </button>
                    </div>

                    {/* Exceptions list */}
                    {exceptionsLoading ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                            <RefreshCw className="w-8 h-8 text-rose-600 animate-spin mx-auto" />
                            <p className="text-xs font-bold text-gray-500">Checking plant exception ledger...</p>
                        </div>
                    ) : filteredExceptions.length === 0 ? (
                        <div className="p-12 text-center bg-white rounded-3xl border border-gray-100 shadow-xs space-y-2">
                            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
                            <h3 className="font-extrabold text-sm text-gray-900">Zero Open Operational Exceptions</h3>
                            <p className="text-xs text-gray-400">All collection attempts, delivery verifications, and machine batches are healthy.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {filteredExceptions.map(ex => {
                                const isHigh = ex.priority === 'CRITICAL' || ex.priority === 'HIGH' || ex.priority === 'critical' || ex.priority === 'high';
                                return (
                                    <div
                                        key={ex.id}
                                        className={`bg-white rounded-3xl p-5 border shadow-xs space-y-3.5 flex flex-col justify-between transition-all ${
                                            isHigh ? 'border-rose-300 ring-2 ring-rose-400/20' : 'border-gray-200'
                                        }`}
                                    >
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                                                        isHigh ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                                                    }`}>
                                                        {ex.priority || 'NORMAL'}
                                                    </span>
                                                    <span className="font-mono text-xs font-extrabold text-[#03045E]">
                                                        #{ex.orderId || ex.orderNumber}
                                                    </span>
                                                </div>
                                                <span className="text-[10px] text-gray-400 font-medium">
                                                    {ex.createdAt ? new Date(ex.createdAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) : ''}
                                                </span>
                                            </div>

                                            <div>
                                                <h4 className="font-black text-sm text-gray-900 leading-snug capitalize">
                                                    {(ex.type || 'Operational Exception').replace(/_/g, ' ')}
                                                </h4>
                                                <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                                    {ex.description}
                                                </p>
                                            </div>

                                            {ex.evidence && (
                                                <div className="bg-gray-50 rounded-xl p-2.5 border border-gray-100 text-[11px] text-gray-600 space-y-0.5">
                                                    {ex.evidence.reason && <p><strong className="text-gray-800">Reason:</strong> {ex.evidence.reason}</p>}
                                                    {ex.evidence.variance !== undefined && <p><strong className="text-gray-800">Variance:</strong> £{ex.evidence.variance.toFixed(2)}</p>}
                                                    {ex.evidence.notes && <p><strong className="text-gray-800">Notes:</strong> {ex.evidence.notes}</p>}
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                                            <span className="text-[11px] text-gray-400 font-mono">ID: {ex.publicId || ex.id}</span>
                                            <button
                                                onClick={() => {
                                                    setResolvingException(ex);
                                                    setResolveAction('reassign_driver');
                                                    setResolveNotes('');
                                                }}
                                                className="px-4 py-2 bg-[#03045E] hover:bg-[#023E8A] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs"
                                            >
                                                <span>Resolve Exception</span>
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
                <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
                    <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-rose-50 flex items-center justify-center text-rose-600">
                                    <AlertTriangle className="w-4 h-4" />
                                </div>
                                <div>
                                    <h3 className="font-extrabold text-gray-900 text-sm">Resolve Operational Exception</h3>
                                    <p className="text-[11px] text-gray-500">Order #{resolvingException.orderId || resolvingException.orderNumber}</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setResolvingException(null)}
                                className="p-1 rounded-full text-gray-400 hover:text-gray-600 cursor-pointer"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="bg-rose-50/60 border border-rose-200 rounded-2xl p-3 text-xs text-rose-950 space-y-1">
                            <span className="font-black text-[10px] uppercase text-rose-800 tracking-wider">Issue Description</span>
                            <p className="font-semibold">{resolvingException.description}</p>
                        </div>

                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-bold text-gray-700 block mb-1">Resolution Action</label>
                                <select
                                    value={resolveAction}
                                    onChange={(e) => setResolveAction(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-medium text-gray-800 focus:ring-2 focus:ring-[#03045E]"
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
                                <label className="text-xs font-bold text-gray-700 block mb-1">Resolution Explanation Notes</label>
                                <textarea
                                    rows={3}
                                    placeholder="Explain resolution (e.g., driver re-dispatched for evening run, customer contacted)..."
                                    value={resolveNotes}
                                    onChange={(e) => setResolveNotes(e.target.value)}
                                    className="w-full bg-gray-50 border border-gray-200 rounded-xl p-2.5 text-xs text-gray-800 focus:ring-2 focus:ring-[#03045E]"
                                />
                            </div>
                        </div>

                        <div className="flex gap-2 pt-2">
                            <button
                                type="button"
                                onClick={() => setResolvingException(null)}
                                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleResolve}
                                disabled={resolvingLoading}
                                className="flex-1 py-2.5 bg-[#03045E] hover:bg-[#023E8A] disabled:opacity-50 text-white font-bold rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm cursor-pointer"
                            >
                                {resolvingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                                <span>Confirm Resolution</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 3: PLANT CAPACITY & BOTTLENECKS */}
            {activeViewTab === 'capacity' && (
                <div className="space-y-6 animate-in fade-in-50 duration-200">
                    {/* Bottleneck Summary Header */}
                    <div className="bg-gradient-to-r from-[#03045E] to-[#0077B6] rounded-3xl p-6 sm:p-8 text-white shadow-xl space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div>
                                <span className="bg-white/20 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full">
                                    REAL-TIME PLANT CAPACITY ENGINE
                                </span>
                                <h2 className="text-xl sm:text-2xl font-black mt-2">
                                    {capacityReport?.plantName || plantName} Operational Load
                                </h2>
                                <p className="text-xs text-blue-100 max-w-xl mt-1">
                                    {capacityReport?.bottleneckDescription || 'Analyzing multi-stage pipeline constraints...'}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                    <button
                                        onClick={loadCapacity}
                                        disabled={capacityLoading}
                                        className="px-3 py-1.5 bg-white/20 hover:bg-white/30 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                                        title="Refresh Capacity Calculation"
                                    >
                                        <RefreshCw className={`w-3.5 h-3.5 ${capacityLoading ? 'animate-spin' : ''}`} />
                                        <span>Refresh Capacity</span>
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 shrink-0">
                                <div className="text-center">
                                    <span className="text-[10px] text-blue-200 block font-bold uppercase">Overall Utilization</span>
                                    <span className="text-3xl font-black">{capacityReport?.overallUtilizationPercent || 72}%</span>
                                </div>
                                <div className="h-8 w-px bg-white/20" />
                                <div className="text-center">
                                    <span className="text-[10px] text-blue-200 block font-bold uppercase">Express Slots</span>
                                    <span className="text-xl font-black text-amber-300">
                                        {capacityReport?.expressOrdersToday || 4} / {capacityReport?.expressCapacityLimit || 20}
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
                                        className={`p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold ${
                                            alert.severity === 'critical' ? 'bg-rose-500/90 text-white' : 'bg-amber-400 text-gray-900'
                                        }`}
                                    >
                                        <AlertTriangle className="w-4 h-4 shrink-0" />
                                        <span>{alert.message}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 8-Stage Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {capacityReport?.stages && Object.values(capacityReport.stages).map((st: any) => (
                            <div
                                key={st.stage}
                                className={`bg-white rounded-2xl p-5 border shadow-2xs space-y-3 transition-all ${
                                    st.bottleneck ? 'border-amber-400 ring-2 ring-amber-400/20 shadow-md' : 'border-gray-100'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-gray-900">{st.stageLabel}</span>
                                    {st.bottleneck && (
                                        <span className="bg-amber-100 text-amber-800 text-[9px] font-black uppercase px-2 py-0.5 rounded-full">
                                            BOTTLENECK
                                        </span>
                                    )}
                                </div>

                                <div className="space-y-1.5">
                                    <div className="flex items-baseline justify-between text-xs">
                                        <span className="text-gray-500 font-medium">Current Load:</span>
                                        <span className="font-extrabold text-[#03045E]">{st.currentLoadKg} / {st.maxCapacityKg} kg</span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                st.utilizationPercent >= 90
                                                    ? 'bg-rose-500'
                                                    : st.utilizationPercent >= 75
                                                    ? 'bg-amber-500'
                                                    : 'bg-[#0077B6]'
                                            }`}
                                            style={{ width: `${Math.min(100, st.utilizationPercent)}%` }}
                                        />
                                    </div>

                                    <div className="flex justify-between items-center text-[10px] text-gray-400 pt-0.5">
                                        <span>{st.activeItemsCount} batches in stage</span>
                                        <span className="font-bold text-gray-700">{st.utilizationPercent}%</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Staff Fleet Utilization Card */}
                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-4">
                        <h3 className="text-sm font-extrabold text-[#03045E] uppercase tracking-wider">
                            Active Facility Staffing & Shift Availability
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-[#0077B6] flex items-center justify-center">
                                        <Truck className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">Courier Drivers</span>
                                        <span className="text-[11px] text-gray-500">
                                            {capacityReport?.staff?.drivers?.available || 2} Available • {capacityReport?.staff?.drivers?.busy || 1} En Route
                                        </span>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-[#03045E]">
                                    {capacityReport?.staff?.drivers?.total || 3} Active
                                </span>
                            </div>

                            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <span className="text-xs font-bold text-gray-900 block">Facility Processors</span>
                                        <span className="text-[11px] text-gray-500">
                                            {capacityReport?.staff?.processors?.available || 3} Available • {capacityReport?.staff?.processors?.busy || 2} Operating
                                        </span>
                                    </div>
                                </div>
                                <span className="text-lg font-black text-[#03045E]">
                                    {capacityReport?.staff?.processors?.total || 5} Active
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 4: FLEET MANAGEMENT */}
            {activeViewTab === 'fleet' && (
                <FleetManagementView
                    plantId={data?.plantCode || data?.plant_id || data?.id || 'plant_main'}
                    plantName={data?.plantName || 'Facility'}
                    staffDrivers={data?.staff?.drivers || []}
                />
            )}

            {/* TAB 5: INVENTORY MANAGEMENT */}
            {activeViewTab === 'inventory' && (
                <InventoryManagementView
                    plantId={data?.plantCode || data?.plant_id || data?.id || 'plant_main'}
                    plantName={data?.plantName || 'Facility'}
                />
            )}

            {/* Quick Location Shortcuts */}
            <div className="bg-slate-50 border border-gray-200/60 rounded-[32px] p-4 md:p-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-xs text-center md:text-left">
                    <p className="font-bold text-[#03045E]">Need to manage plant orders or staff fleet?</p>
                    <p className="text-gray-500">Review your facility orders or update details for staff assigned to you.</p>
                </div>

                <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                    <button
                        onClick={() => onNavigateTab('orders')}
                        className="w-full sm:w-auto px-4 py-3 md:py-2 bg-white hover:bg-gray-100 border text-[#03045E] rounded-xl text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                    >
                        Manage Plant Orders
                    </button>
                    <button
                        onClick={() => onNavigateTab('staff')}
                        className="w-full sm:w-auto px-4 py-3 md:py-2 bg-[#023E8A] hover:bg-[#03045E] text-white rounded-xl text-xs font-bold shadow-sm transition-colors cursor-pointer"
                    >
                        Manage Assigned Staff
                    </button>
                </div>
            </div>
        </div>
    );
};

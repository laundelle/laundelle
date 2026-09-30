'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  Keyboard,
  ArrowRight,
  CheckCircle2,
  X,
  Camera,
  CameraOff,
  Layers,
  Package,
  Loader2,
  Sparkles,
  ShoppingBag,
  Scale,
  Plus,
  Minus,
  Check,
  Building2,
  Info,
  Phone,
  MapPin,
  ShieldCheck
} from 'lucide-react';
import { ProcessorViewTab } from './ProcessorLayout';

interface ProcessorQRScanViewProps {
  onNavigateTab: (tab: ProcessorViewTab) => void;
  onOrderScanned?: (orderId: string) => void;
}

interface ScannedOrderDetails {
  orderId: string;
  customerName: string;
  customerPhone?: string;
  service: string;
  weight: string;
  address?: string;
  items?: any[];
}

export const ProcessorQRScanView: React.FC<ProcessorQRScanViewProps> = ({ onNavigateTab, onOrderScanned }) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [inputMode, setInputMode] = useState<'camera' | 'manual'>('camera');

  // Active Scanned Order State
  const [scannedOrder, setScannedOrder] = useState<ScannedOrderDetails | null>(null);
  const [selectedAction, setSelectedAction] = useState<'washing' | 'sorting' | 'received_at_facility'>('washing');
  const [actualWeight, setActualWeight] = useState('5.0');
  const [bagCondition, setBagCondition] = useState('Good');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);

  const demoFallbacks: Record<string, any> = {
    'LD4582': { customerName: 'Sarah Mitchell', service: 'Mixed Wash & Fold (10kg) × 2, Formal Shirts × 5', weight: '7.5', customerPhone: '+44 7700 900123', address: '12 Grove Road, Fulham, London, SW6 1AA' },
    'LD4583': { customerName: 'James Carter', service: 'Delicates & Silks Dry Clean × 3', weight: '4.0', customerPhone: '+44 7700 900456', address: '88 Clapham High Street, London, SW4 7UG' },
    'LD4584': { customerName: 'Emma Williams', service: 'Family Wash (15kg) × 3', weight: '12.0', customerPhone: '+44 7700 900789', address: '27 Richmond Avenue, London, TW9 2NA' },
    'LD4585': { customerName: 'Daniel Thompson', service: 'Business Suits (Steam Pressed) × 4', weight: '5.0', customerPhone: '+44 7700 900321', address: '14 Kingston Road, London, SW15 3DW' },
    'LD4586': { customerName: 'Sophia Davis', service: 'Evening Dresses Handwash × 2', weight: '3.5', customerPhone: '+44 7700 900654', address: '52 Wimbledon Hill Road, London, SW19 7PA' }
  };

  const extractOrderId = (raw: string): string => {
    if (!raw) return '';
    const trimmed = raw.trim();
    try {
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          return parsed.orderId || parsed.id || parsed.order_id || trimmed;
        }
      }
    } catch { }
    const match = trimmed.match(/(?:L2U|ORD|LD)[-_]?[A-Za-z0-9]+/i);
    if (match) return match[0];
    return trimmed.replace(/^["']|["']$/g, '');
  };

  const handleOpenAction = async (rawCode: string) => {
    const orderId = extractOrderId(rawCode);
    if (!orderId) return;

    setIsLoadingOrder(true);
    let parsed: any = {};
    try {
      if (rawCode.trim().startsWith('{')) {
        parsed = JSON.parse(rawCode.trim());
      }
    } catch { }

    const fallback = demoFallbacks[orderId] || {};
    let customerName = parsed?.customerName || parsed?.customer_name || fallback.customerName || 'Valued Customer';
    let service = parsed?.service || parsed?.serviceName || fallback.service || 'Standard Laundry Service';
    let declaredWeight = parsed?.weight || fallback.weight || '5.0';
    let customerPhone = parsed?.customerPhone || fallback.customerPhone || '';
    let address = parsed?.address || fallback.address || '';

    // Initial populate
    setScannedOrder({
      orderId,
      customerName,
      customerPhone,
      service,
      weight: String(declaredWeight),
      address
    });
    setActualWeight(String(declaredWeight));
    setSelectedAction('washing');
    setBagCondition('Good');
    setConfirmedSuccess(false);

    // Fetch real-time order details from backend
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/processor/jobs/${encodeURIComponent(orderId)}`, {
        headers: { ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.found && data.order) {
          const ord = data.order;
          setScannedOrder({
            orderId: ord.id || orderId,
            customerName: ord.customerName || 'Valued Customer',
            customerPhone: ord.customerPhone || '',
            service: ord.service || 'Standard Laundry Service',
            weight: String(ord.weightKg || '5.0'),
            address: ord.address || '',
            items: ord.items || []
          });
          setActualWeight(String(ord.weightKg || '5.0'));
        }
      }
    } catch (err) {
      console.warn('Realtime lookup notice:', err);
    } finally {
      setIsLoadingOrder(false);
    }
  };

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes.length > 0) {
      const raw = detectedCodes[0]?.rawValue || '';
      if (raw.trim()) {
        handleOpenAction(raw.trim());
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) return;
    handleOpenAction(trimmed);
  };

  const handleConfirmIntake = async () => {
    if (!scannedOrder) return;
    setIsSubmitting(true);

    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/processor/jobs/${encodeURIComponent(scannedOrder.orderId)}/intake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          actualWeightKg: parseFloat(actualWeight) || 0,
          bagCondition,
          restrictedItems: [],
          processingAction: selectedAction
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to assign order for processing.');

      setConfirmedSuccess(true);
      if (onOrderScanned) onOrderScanned(scannedOrder.orderId);

      // Notify other views
      window.dispatchEvent(new CustomEvent('l2u_processor_orders_changed', { detail: { orderId: scannedOrder.orderId } }));
      window.dispatchEvent(new Event('l2u_orders_change'));

      // Smoothly navigate to Orders tab
      setTimeout(() => {
        setScannedOrder(null);
        setManualCode('');
        setConfirmedSuccess(false);
        onNavigateTab('orders');
      }, 1000);
    } catch (e: any) {
      alert(e.message || 'Error processing scan');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustWeight = (delta: number) => {
    const current = parseFloat(actualWeight) || 0;
    const updated = Math.max(0.5, Math.round((current + delta) * 10) / 10);
    setActualWeight(updated.toFixed(1));
  };

  // Close modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && scannedOrder && !isSubmitting) {
        setScannedOrder(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannedOrder, isSubmitting]);

  return (
    <div className="w-full space-y-6 relative">
      {/* ─── Desktop 2-Column Split Console ──────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* ─── Left Column: Scanner & Barcode Gun (6 Cols) ─────────────────── */}
        <div className="lg:col-span-6 space-y-5">
          {/* Mode Switcher */}
          <div className="bg-white rounded-2xl p-1.5 flex gap-1.5 shadow-2xs border border-gray-200/80">
            <button
              onClick={() => setInputMode('camera')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inputMode === 'camera'
                  ? 'bg-[#03045E] text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              <Camera className="w-4 h-4" />
              <span>Camera Scanner</span>
            </button>
            <button
              onClick={() => setInputMode('manual')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${inputMode === 'manual'
                  ? 'bg-[#03045E] text-white shadow-xs'
                  : 'text-gray-500 hover:bg-gray-50'
                }`}
            >
              <Keyboard className="w-4 h-4" />
              <span>Barcode Gun / Manual</span>
            </button>
          </div>

          {/* Optical Scanner Viewport */}
          {inputMode === 'camera' && (
            <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-200/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-gray-600 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Optical Camera Feed
                </span>
                <button
                  onClick={() => setCameraEnabled(!cameraEnabled)}
                  className="text-xs text-gray-500 hover:text-gray-700 font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  {cameraEnabled ? <CameraOff className="w-3.5 h-3.5" /> : <Camera className="w-3.5 h-3.5" />}
                  <span>{cameraEnabled ? 'Pause Camera' : 'Resume'}</span>
                </button>
              </div>

              <div className="relative aspect-4/3 w-full rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center border-2 border-slate-700 shadow-inner">
                {cameraEnabled ? (
                  <>
                    <Scanner
                      onScan={handleScan}
                      formats={['qr_code']}
                      styles={{
                        container: { width: '100%', height: '100%' },
                        video: { objectFit: 'cover' }
                      }}
                    />
                    {/* Reticle Overlay */}
                    <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                      <div className="w-48 h-48 border-2 border-[#48CAE4] rounded-2xl relative animate-pulse shadow-[0_0_20px_rgba(72,202,228,0.4)]">
                        <div className="absolute top-0 left-0 w-4 h-4 border-t-4 border-l-4 border-[#00B4D8] -mt-1 -ml-1 rounded-tl-sm" />
                        <div className="absolute top-0 right-0 w-4 h-4 border-t-4 border-r-4 border-[#00B4D8] -mt-1 -mr-1 rounded-tr-sm" />
                        <div className="absolute bottom-0 left-0 w-4 h-4 border-b-4 border-l-4 border-[#00B4D8] -mb-1 -ml-1 rounded-bl-sm" />
                        <div className="absolute bottom-0 right-0 w-4 h-4 border-b-4 border-r-4 border-[#00B4D8] -mb-1 -mr-1 rounded-br-sm" />
                        {/* Center laser line */}
                        <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500/80 shadow-[0_0_8px_red]" />
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400 space-y-2">
                    <CameraOff className="w-10 h-10 mx-auto opacity-50" />
                    <p className="text-xs font-semibold">Camera is paused</p>
                    <button
                      onClick={() => setCameraEnabled(true)}
                      className="px-4 py-2 bg-[#0077B6] text-white rounded-xl text-xs font-bold cursor-pointer"
                    >
                      Turn On Camera
                    </button>
                  </div>
                )}
              </div>
              <p className="text-[11px] text-center text-gray-400">
                Position the QR barcode within the viewfinder. The inspection modal will open automatically.
              </p>
            </div>
          )}

          {/* Barcode Gun / Manual Input */}
          <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <Keyboard className="w-4 h-4 text-[#0077B6]" />
                Barcode Gun / Direct Entry
              </span>
              <span className="text-[10px] text-gray-400 font-mono">USB / Laser Wedge</span>
            </div>

            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Scan or type Order ID (e.g. L2U-93233, LD4582)..."
                className="flex-1 px-4 py-3 bg-slate-50 border border-gray-200 rounded-2xl text-xs font-mono font-bold text-gray-900 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-[#0077B6]"
              />
              <button
                type="submit"
                className="px-5 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white rounded-2xl text-xs font-black transition-all cursor-pointer active:scale-95 shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <span>Lookup</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>

          {/* Quick Simulation Barcode Tags */}
          <div className="bg-white rounded-3xl p-5 shadow-2xs border border-gray-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-800 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Quick Test Tags
              </span>
              <span className="text-[10px] text-gray-400">Click to open modal</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {Object.keys(demoFallbacks).map((code) => {
                const info = demoFallbacks[code];
                const isSelected = scannedOrder?.orderId === code;
                return (
                  <button
                    key={code}
                    onClick={() => handleOpenAction(code)}
                    className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${isSelected
                        ? 'bg-[#03045E] text-white border-[#03045E] shadow-sm'
                        : 'bg-slate-50 hover:bg-slate-100 border-gray-200/80 text-gray-800'
                      }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-black text-xs">{code}</span>
                      <span className={`text-[10px] font-bold ${isSelected ? 'text-[#48CAE4]' : 'text-gray-500'}`}>
                        {info.weight}kg
                      </span>
                    </div>
                    <p className={`text-[11px] truncate mt-1 ${isSelected ? 'text-white/80' : 'text-gray-500 font-medium'}`}>
                      {info.customerName}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── Right Column: Workstation Status & SOP Hub (6 Cols) ───────────── */}
        <div className="lg:col-span-6 space-y-5">
          {/* Station Status Card */}
          <div className="bg-white rounded-3xl p-6 shadow-2xs border border-gray-200/80 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-[#CAF0F8] text-[#0077B6] flex items-center justify-center font-black text-sm shadow-2xs">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#03045E] tracking-tight">Plant Reception Terminal</h3>
                  <p className="text-[11px] text-gray-400 font-semibold">Station ID: PLANT-A • BAY 04</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                Active & Calibrated
              </span>
            </div>

            {/* Hardware Status Indicators */}
            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Optical Sensor</span>
                <span className="text-xs font-extrabold text-emerald-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> 60 FPS Feed
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Barcode Gun</span>
                <span className="text-xs font-extrabold text-blue-600 flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" /> USB Ready
                </span>
              </div>
              <div className="bg-slate-50 p-3 rounded-2xl border border-gray-100 space-y-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">Digital Scale</span>
                <span className="text-xs font-extrabold text-indigo-600 flex items-center gap-1">
                  <Scale className="w-3.5 h-3.5" /> ±0.05kg Zero
                </span>
              </div>
            </div>
          </div>

          {/* Standard Operating Procedure (SOP) */}
          <div className="bg-white rounded-3xl p-6 shadow-2xs border border-gray-200/80 space-y-4">
            <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-[#0077B6]" />
              Reception & Intake Workflow SOP
            </h4>

            <div className="space-y-3">
              {[
                {
                  step: '1',
                  title: 'Scan Driver QR Tag or Order ID',
                  desc: 'Position driver bag label under the camera feed or scan using the handheld USB laser gun.'
                },
                {
                  step: '2',
                  title: 'Review Scanned Order Modal',
                  desc: 'The order manifest modal opens immediately showing customer details, declared weight and items.'
                },
                {
                  step: '3',
                  title: 'Verify Weight & Bag Condition',
                  desc: 'Place bag on the physical platform scale and compare with declared booking weight.'
                },
                {
                  step: '4',
                  title: 'Select Wash Line & Confirm',
                  desc: 'Route to Washing Cycle or Sorting Table. The order instantly enters the plant pipeline.'
                }
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 border border-gray-100">
                  <div className="w-6 h-6 rounded-full bg-[#03045E] text-white flex items-center justify-center font-mono font-black text-xs shrink-0 shadow-2xs">
                    {s.step}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold text-gray-900">{s.title}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Direct Navigation Quick Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigateTab('orders')}
              className="flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-[#03045E] border border-gray-200 rounded-2xl text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
            >
              <ShoppingBag className="w-4 h-4 text-[#0077B6]" />
              <span>Go to Active Orders Board</span>
            </button>
            <button
              onClick={() => onNavigateTab('qc')}
              className="flex-1 py-3 px-4 bg-white hover:bg-slate-50 text-gray-700 border border-gray-200 rounded-2xl text-xs font-black transition-all shadow-2xs cursor-pointer flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4 text-amber-500" />
              <span>Open Quality Check Queue</span>
            </button>
          </div>
        </div>
      </div>

      {/* ─── SCANNED ORDER INTAKE MODAL ──────────────────────────────────────── */}
      {scannedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setScannedOrder(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Stripe */}
            <div className="h-1.5 bg-gradient-to-r from-[#03045E] via-[#0077B6] to-emerald-500 shrink-0" />

            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-13 h-13 bg-[#CAF0F8] text-[#03045E] rounded-2xl flex items-center justify-center shrink-0 shadow-2xs">
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-lg text-[#03045E] tracking-tight">{scannedOrder.orderId}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      Scanned & Intake Ready
                    </span>
                    {isLoadingOrder && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-semibold">
                        <Loader2 className="w-3 h-3 animate-spin text-[#0077B6]" /> Syncing DB...
                      </span>
                    )}
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 mt-0.5 truncate">{scannedOrder.customerName}</h3>
                  {scannedOrder.customerPhone && (
                    <p className="text-xs text-gray-500 font-mono flex items-center gap-1 mt-0.5">
                      <Phone className="w-3 h-3 text-gray-400" /> {scannedOrder.customerPhone}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => !isSubmitting && setScannedOrder(null)}
                className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 cursor-pointer transition-colors shrink-0"
                title="Close modal (Esc)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-5 sm:p-6 space-y-5 overflow-y-auto flex-1 bg-white">
              {/* Service & Declared Manifest Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">Order Service Manifest</span>
                  <span className="text-[10px] font-mono font-bold text-gray-500 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                    Declared: {scannedOrder.weight} kg
                  </span>
                </div>
                <p className="text-sm font-bold text-gray-900">{scannedOrder.service}</p>
                {scannedOrder.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1 mt-1 truncate">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" /> {scannedOrder.address}
                  </p>
                )}
              </div>

              {/* Digital Scale Terminal */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-gray-800 flex items-center gap-2">
                    <Scale className="w-4 h-4 text-[#0077B6]" />
                    <span>Actual Scale Weight (kg)</span>
                  </label>
                  <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${
                    Math.abs(parseFloat(actualWeight) - parseFloat(scannedOrder.weight)) > 0.05
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    Variance: {(parseFloat(actualWeight) - parseFloat(scannedOrder.weight)).toFixed(1)} kg
                  </span>
                </div>

                {/* Main Scale Input Control */}
                <div className="flex items-center gap-3 bg-slate-50 p-2.5 rounded-2xl border border-gray-200">
                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(-0.5)}
                    className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Minus className="w-4 h-4" />
                  </button>

                  <div className="flex-1 flex items-center justify-center gap-1.5">
                    <input
                      type="number"
                      step="0.1"
                      value={actualWeight}
                      onChange={(e) => setActualWeight(e.target.value)}
                      className="w-28 text-center text-3xl font-mono font-black text-[#03045E] bg-transparent focus:outline-hidden"
                    />
                    <span className="text-sm font-bold text-gray-500">kg</span>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleAdjustWeight(0.5)}
                    className="w-11 h-11 rounded-xl bg-white border border-gray-200 text-gray-700 flex items-center justify-center hover:bg-gray-100 font-black cursor-pointer active:scale-95 shadow-2xs"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Preset Weight Buttons */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {['3.5', '5.0', '7.5', '10.0', '12.5', '15.0'].map(w => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => setActualWeight(w)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${actualWeight === w
                          ? 'bg-[#0077B6] text-white shadow-xs'
                          : 'bg-slate-100 text-gray-700 hover:bg-slate-200'
                        }`}
                    >
                      {w} kg
                    </button>
                  ))}
                </div>
              </div>

              {/* Bag Condition Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-800 flex items-center gap-2">
                  <Package className="w-4 h-4 text-[#0077B6]" />
                  <span>Bag Condition Assessment</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Good', desc: 'Clean & Sealed' },
                    { label: 'Heavy Soiled', desc: 'Special Wash' },
                    { label: 'Damaged', desc: 'Torn / Leaking' },
                  ].map(c => (
                    <button
                      key={c.label}
                      type="button"
                      onClick={() => setBagCondition(c.label)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${bagCondition === c.label
                          ? 'bg-[#03045E] text-white border-[#03045E] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-gray-200 text-gray-700'
                        }`}
                    >
                      <p className="text-xs font-bold">{c.label}</p>
                      <p className={`text-[10px] mt-0.5 ${bagCondition === c.label ? 'text-white/70' : 'text-gray-400'}`}>
                        {c.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Routing / Next Action Selector */}
              <div className="space-y-2">
                <label className="text-xs font-black text-gray-800 flex items-center gap-2">
                  <Layers className="w-4 h-4 text-[#0077B6]" />
                  <span>Immediate Route / Plant Stage</span>
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'washing' as const, label: 'Washing Cycle', desc: 'Move directly to Washers', emoji: '🔄' },
                    { id: 'sorting' as const, label: 'Sorting Table', desc: 'Color & Fabric Inspection', emoji: '🗂️' },
                    { id: 'received_at_facility' as const, label: 'Intake Queue', desc: 'Store in Plant Rack', emoji: '📦' },
                  ].map(action => (
                    <button
                      key={action.id}
                      type="button"
                      onClick={() => setSelectedAction(action.id)}
                      className={`p-3 rounded-2xl text-left border transition-all cursor-pointer ${selectedAction === action.id
                          ? 'bg-[#0077B6] text-white border-[#0077B6] shadow-sm'
                          : 'bg-slate-50 hover:bg-slate-100 border-gray-200 text-gray-700'
                        }`}
                    >
                      <span className="text-base">{action.emoji}</span>
                      <p className="text-xs font-bold mt-1">{action.label}</p>
                      <p className={`text-[10px] mt-0.5 ${selectedAction === action.id ? 'text-white/80' : 'text-gray-400'}`}>
                        {action.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-gray-100 flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setScannedOrder(null)}
                disabled={isSubmitting}
                className="px-5 py-3.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
              >
                Cancel (Esc)
              </button>
              <button
                type="button"
                onClick={handleConfirmIntake}
                disabled={isSubmitting || confirmedSuccess}
                className={`flex-1 py-3.5 px-6 rounded-2xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${confirmedSuccess
                    ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                    : 'bg-[#03045E] hover:bg-[#023E8A] text-white shadow-[#03045E]/30 active:scale-98'
                  }`}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Recording Intake in Database...</span>
                  </>
                ) : confirmedSuccess ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                    <span>Intake Confirmed! Opening Board...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-[#48CAE4]" />
                    <span>Confirm Intake & Move to {selectedAction === 'washing' ? 'Washing' : selectedAction === 'sorting' ? 'Sorting' : 'Plant Queue'}</span>
                    <ArrowRight className="w-4 h-4 ml-1 text-white/70" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

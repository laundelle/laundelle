'use client';
import { apiFetch } from '@laundelle/api-client';
import React, { useState, useEffect } from 'react';
import { Scanner } from '@yudiel/react-qr-scanner';
import {
  ArrowRight,
  Search,
  CameraOff,
  Zap,
  ZapOff,
  ShoppingBag,
  Check,
  CheckCircle2,
  X,
  Layers,
  Package,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Loader2,
  HelpCircle,
  Clock,
  Sparkles,
  Phone,
  MapPin,
  Building2,
  QrCode,
  Info,
  ChevronRight,
  AlertOctagon,
  Scale
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
  plantId?: string;
  plantName?: string;
  bagQr?: string;
  status?: string;
  statusLabel?: string;
  alreadyIntaked?: boolean;
  specialInstructions?: string;
  total?: number;
}

interface ScanErrorDetails {
  type: 'INVALID_QR' | 'NOT_COLLECTED' | 'ALREADY_INTAKED' | 'PLANT_MISMATCH' | 'NOT_FOUND' | 'ERROR';
  title: string;
  message: string;
  scannedCode?: string;
  orderPlant?: string;
  currentPlant?: string;
  currentStatus?: string;
}

interface RecentScanItem {
  id: string;
  orderId: string;
  customerName: string;
  itemCount: number;
  status: 'washing' | 'sorting' | 'qc' | 'received';
  statusLabel: string;
  statusColor: string;
  timeAgo: string;
  image: string;
  service: string;
}

const DEFAULT_RECENT_SCANS: RecentScanItem[] = [];

export const ProcessorQRScanView: React.FC<ProcessorQRScanViewProps> = ({ onNavigateTab, onOrderScanned }) => {
  const [manualCode, setManualCode] = useState('');
  const [cameraEnabled, setCameraEnabled] = useState(true);
  const [isTorchOn, setIsTorchOn] = useState(false);
  const [inputError, setInputError] = useState(false);
  const [showHowToScanModal, setShowHowToScanModal] = useState(false);

  // Active Scanned Order State
  const [scannedOrder, setScannedOrder] = useState<ScannedOrderDetails | null>(null);
  const [scanError, setScanError] = useState<ScanErrorDetails | null>(null);
  const [selectedAction, setSelectedAction] = useState<'washing' | 'sorting' | 'received_at_facility'>('washing');
  const [bagCondition, setBagCondition] = useState('Good');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [confirmedSuccess, setConfirmedSuccess] = useState(false);
  const [isLoadingOrder, setIsLoadingOrder] = useState(false);
  const [recentScans, setRecentScans] = useState<RecentScanItem[]>(DEFAULT_RECENT_SCANS);

  // Toast Notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Current Processor Plant Context
  const [currentProcessorPlant, setCurrentProcessorPlant] = useState<{ id: string; name: string }>({
    id: 'PLANT-LON-01',
    name: 'Preston Plant 1'
  });

  // Load current processor's plant from session or API
  useEffect(() => {
    try {
      const rawSession = localStorage.getItem('l2u_auth_session');
      if (rawSession) {
        const parsed = JSON.parse(rawSession);
        const user = parsed.user;
        if (user?.plantId || user?.plant_id) {
          setCurrentProcessorPlant({
            id: user.plantId || user.plant_id || 'PLANT-LON-01',
            name: user.plantName || (user.plantId ? `Plant Unit (${user.plantId})` : 'Preston Plant 1')
          });
        }
      }
      const token = rawSession ? JSON.parse(rawSession).token : null;
      if (token) {
        apiFetch('/api/v1/users/me', { headers: { Authorization: `Bearer ${token}` } })
          .then(res => res.json())
          .then(data => {
            if (data?.data?.plant_id || data?.data?.plantId) {
              setCurrentProcessorPlant({
                id: data.data.plant_id || data.data.plantId,
                name: data.data.plantName || `Plant Unit (${data.data.plant_id || data.data.plantId})`
              });
            }
          })
          .catch(() => { });
      }
    } catch { }
  }, []);

  const demoFallbacks: Record<string, any> = {
    'ORD-10245': {
      customerName: 'Ahmed Khan',
      service: 'White Shirts & Formal Wear × 8',
      weight: '7.5',
      customerPhone: '+44 7700 900123',
      address: '12 Grove Road, Fulham, London, SW6 1AA',
      plantId: 'PLANT-LON-01',
      plantName: 'Preston Plant 1',
      bagQr: 'BAG-ORD-10245',
      status: 'laundry_collected',
      statusLabel: 'Laundry Collected (OTP Verified)',
      isDriverCollected: true,
      alreadyIntaked: false
    },
    // TEST CASE: Driver has NOT collected the bag yet (Rule 1)
    'ORD-10244': {
      customerName: 'Sara Williams',
      service: 'Deluxe Towels & Linen Pack × 5',
      weight: '4.0',
      customerPhone: '+44 7700 900456',
      address: '88 Clapham High Street, London, SW4 7UG',
      plantId: 'PLANT-LON-01',
      plantName: 'Preston Plant 1',
      bagQr: 'BAG-ORD-10244',
      status: 'pickup_in_progress',
      statusLabel: 'Pickup In Progress (Driver on route)',
      isDriverCollected: false,
      alreadyIntaked: false
    },
    // TEST CASE: Order assigned to a DIFFERENT plant (Rule 2)
    'ORD-10243': {
      customerName: 'Daniel Brown',
      service: 'Autumn Jackets & Outerwear × 2',
      weight: '3.5',
      customerPhone: '+44 7700 900789',
      address: '27 Richmond Avenue, London, TW9 2NA',
      plantId: 'PLANT-LON-02',
      plantName: 'West End Plant 2',
      bagQr: 'BAG-ORD-10243',
      status: 'laundry_collected',
      statusLabel: 'Laundry Collected (OTP Verified)',
      isDriverCollected: true,
      alreadyIntaked: false
    },
    // TEST CASE: Order has ALREADY been intaked into facility (Rule 3)
    'ORD-7K9A2P8M4X': {
      customerName: 'Sarah Mitchell',
      service: 'Mixed Wash & Fold (10kg) × 2, Formal Shirts × 5',
      weight: '7.5',
      customerPhone: '+44 7700 900123',
      address: '12 Grove Road, Fulham, London, SW6 1AA',
      plantId: 'PLANT-LON-01',
      plantName: 'Preston Plant 1',
      bagQr: 'BAG-ORD-7K9A2P8M4X',
      status: 'washing',
      statusLabel: 'Washing Cycle (Already Intaked)',
      isDriverCollected: true,
      alreadyIntaked: true
    },
    'ORD-3M8X4Q9W2T': {
      customerName: 'James Carter',
      service: 'Delicates & Silks Dry Clean × 3',
      weight: '4.0',
      customerPhone: '+44 7700 900456',
      address: '88 Clapham High Street, London, SW4 7UG',
      plantId: 'PLANT-LON-01',
      plantName: 'Preston Plant 1',
      bagQr: 'BAG-ORD-3M8X4Q9W2T',
      status: 'laundry_collected',
      statusLabel: 'Laundry Collected (OTP Verified)',
      isDriverCollected: true,
      alreadyIntaked: false
    },
    'LD4582': {
      customerName: 'Sarah Mitchell',
      service: 'Mixed Wash & Fold (10kg) × 2, Formal Shirts × 5',
      weight: '7.5',
      customerPhone: '+44 7700 900123',
      address: '12 Grove Road, Fulham, London, SW6 1AA',
      plantId: 'PLANT-LON-01',
      plantName: 'Preston Plant 1',
      bagQr: 'BAG-LD4582',
      status: 'laundry_collected',
      statusLabel: 'Laundry Collected (OTP Verified)',
      isDriverCollected: true,
      alreadyIntaked: false
    }
  };

  /**
   * STEP 1 VALIDATION:
   * Verify if the scanned code is an authentic Laundelle Bag QR code or foreign code.
   */
  const validateLaundelleQr = (raw: string): { isLaundelle: boolean; orderId?: string } => {
    if (!raw || !raw.trim()) {
      return { isLaundelle: false };
    }
    const trimmed = raw.trim();

    // 1. JSON payload check (e.g. { "orderId": "...", "bagQr": "..." })
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === 'object') {
          const candidateId = parsed.orderId || parsed.id || parsed.order_id || parsed.bagQr || parsed.publicId;
          if (candidateId) {
            const cleanId = String(candidateId).replace(/^BAG-/, '').trim();
            return { isLaundelle: true, orderId: cleanId };
          }
          if (parsed.brand?.toLowerCase() === 'laundelle' || parsed.app?.toLowerCase() === 'laundelle') {
            return { isLaundelle: true, orderId: parsed.orderNumber || parsed.orderId || '' };
          }
        }
      } catch {
        // Not valid JSON, continue to string matchers
      }
    }

    // 2. Explicit Laundelle Bag Tag prefixes: BAG-, QR-BAG-, BAG_
    const bagMatch = trimmed.match(/^(?:QR[-_])?BAG[-_]([A-Za-z0-9_-]+)$/i);
    if (bagMatch) {
      return { isLaundelle: true, orderId: bagMatch[1] };
    }

    // 3. Canonical Laundelle Order ID formats: ORD-[...], LD[0-9]+, L2U-[...]
    const ordMatch = trimmed.match(/^(ORD[-_][A-Za-z0-9]{3,20}|LD[0-9]{3,10}|L2U[-_][A-Za-z0-9]{3,20})$/i);
    if (ordMatch) {
      return { isLaundelle: true, orderId: ordMatch[0] };
    }

    // 4. URL containing Laundelle order or bag path
    const urlMatch = trimmed.match(/(?:orders?|jobs?|track|bag)\/(ORD[-_][A-Za-z0-9]+|BAG[-_][A-Za-z0-9]+|LD[0-9]+)/i);
    if (urlMatch) {
      const clean = urlMatch[1].replace(/^BAG-/, '');
      return { isLaundelle: true, orderId: clean };
    }

    // 5. Explicit prefix matching
    const prefixMatch = trimmed.match(/(?:BAG|ORD|LD)[-_][A-Za-z0-9]+/i);
    if (prefixMatch && (trimmed.startsWith('BAG-') || trimmed.startsWith('ORD-') || trimmed.startsWith('LD-'))) {
      return { isLaundelle: true, orderId: prefixMatch[0].replace(/^BAG-/, '') };
    }

    // If it does not match Laundelle formats, it is a DIFFERENT / foreign QR!
    return { isLaundelle: false };
  };

  /**
   * Main scan & lookup orchestrator
   */
  const handleOpenAction = async (rawCode: string) => {
    // Reset any previous modal or error
    setScanError(null);
    setScannedOrder(null);

    // ─── STEP 1: Verify if it is a genuine Laundelle QR code ────────────────
    const validation = validateLaundelleQr(rawCode);
    if (!validation.isLaundelle || !validation.orderId) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1500);
      setScanError({
        type: 'INVALID_QR',
        title: 'Non-Laundelle QR Code Detected',
        message: 'The scanned code is not recognized as an official Laundelle laundry bag tag. Intake cannot proceed with foreign QR codes or barcodes.',
        scannedCode: rawCode.length > 50 ? `${rawCode.substring(0, 50)}...` : rawCode
      });
      return;
    }

    const orderId = validation.orderId;
    setIsLoadingOrder(true);

    try {
      let orderData: any = null;
      let backendPlantMismatch = false;
      let mismatchOrderPlant = '';
      let mismatchProcessorPlant = '';

      const rawSession = localStorage.getItem('l2u_auth_session');
      const token = rawSession ? JSON.parse(rawSession).token : null;
      const res = await apiFetch(`/api/v1/processor/jobs/${encodeURIComponent(orderId)}`, {
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
      });

      if (res.ok) {
        const data = await res.json();
        if (data.plantMismatch) {
          backendPlantMismatch = true;
          mismatchOrderPlant = data.orderPlantName || data.orderPlantId || 'Different Plant';
          mismatchProcessorPlant = data.processorPlantName || currentProcessorPlant.name;
        } else if (data.found && data.order) {
          orderData = data.order;
        }
      }

      // If backend flagged plant mismatch immediately
      if (backendPlantMismatch) {
        setScanError({
          type: 'PLANT_MISMATCH',
          title: 'Facility Mismatch: Assigned to Another Plant',
          message: `This order is assigned to ${mismatchOrderPlant}. It cannot be intaked or processed at ${mismatchProcessorPlant}.`,
          orderPlant: mismatchOrderPlant,
          currentPlant: mismatchProcessorPlant,
          scannedCode: rawCode
        });
        return;
      }

      // Local mock fallback if offline/demo
      if (!orderData) {
        const fallback = demoFallbacks[orderId];
        if (fallback) {
          orderData = {
            id: orderId,
            ...fallback
          };
        }
      }

      // If order does not exist
      if (!orderData) {
        setScanError({
          type: 'NOT_FOUND',
          title: 'Order Not Found',
          message: `No active order found matching #${orderId}. Please verify the tag and try again.`,
          scannedCode: rawCode
        });
        return;
      }

      // ─── STEP 2: Verify Driver Pickup & OTP Verification ──────────────────
      // Rule: If driver hasn't collected the bag, even if processor scans, do NOT proceed!
      const isDriverCollected = orderData.isDriverCollected ?? (
        orderData.status === 'laundry_collected' ||
        Boolean(orderData.pickedUpAt) ||
        Boolean(orderData.pickup_otp_verified_at) ||
        Boolean(orderData.pickup_pin_verified_at) ||
        Boolean(orderData.evidence?.pickupVerifiedAt) ||
        Boolean(orderData.qr_tracking?.collectedAt)
      );

      if (!isDriverCollected) {
        setScanError({
          type: 'NOT_COLLECTED',
          title: 'Driver Pickup Incomplete (OTP Required)',
          message: `Order #${orderData.id || orderId} has not been collected from the customer by a driver yet (Current Status: ${orderData.statusLabel || orderData.status || 'Pending Pickup'}). Bag intake can only proceed after the driver successfully picks up the bag and verifies the customer OTP.`,
          scannedCode: rawCode,
          currentStatus: orderData.statusLabel || orderData.status || 'Pending Pickup'
        });
        return;
      }

      // ─── STEP 3: Verify Order Has Not Already Been Intaked ────────────────
      // Rule: One order cannot be intaked multiple times!
      const postIntakeStatuses = [
        'received_at_facility',
        'washing',
        'sorting',
        'drying',
        'ironing',
        'quality_check',
        'ready_for_qc',
        'qc_ready',
        'ready_for_delivery',
        'out_for_delivery',
        'delivered',
        'completed'
      ];
      const isAlreadyIntaked = orderData.alreadyIntaked ?? (
        Boolean(orderData.receivedAtFacilityAt) ||
        Boolean(orderData.intake?.intakeAt) ||
        postIntakeStatuses.includes(orderData.status)
      );

      if (isAlreadyIntaked) {
        const orderPlantId = orderData.plant_id || orderData.plantId;
        const orderPlantName = orderData.plantName || orderData.plant_name || orderPlantId;
        const rawStatus = orderData.statusLabel || orderData.status || 'In Processing';
        const formattedStatus = rawStatus
          .replace(/_/g, ' ')
          .replace(/\b\w/g, (c: string) => c.toUpperCase());

        showToast(`Order #${orderData.id || orderId} is already in processing.`);

        setScannedOrder({
          orderId: orderData.id || orderId,
          customerName: orderData.customerName || 'Valued Customer',
          customerPhone: orderData.customerPhone || orderData.phone || '',
          service: orderData.service || orderData.serviceType || 'Standard Laundry Service',
          weight: String(orderData.actualWeightKg || orderData.weightKg || orderData.weight || '5.0'),
          address: orderData.address || orderData.deliveryAddress || '',
          items: orderData.items || orderData.orderItems || [],
          plantId: orderPlantId || currentProcessorPlant.id,
          plantName: orderPlantName || currentProcessorPlant.name,
          bagQr: orderData.bagQr || orderData.qr_code || orderData.package?.qr_code || `BAG-${orderData.id || orderId}`,
          status: orderData.status || 'washing',
          statusLabel: formattedStatus,
          alreadyIntaked: true,
          specialInstructions: orderData.specialInstructions || '',
          total: orderData.total || orderData.total_price || 0
        });
        return;
      }

      // ─── STEP 4: Verify Plant Assignment ─────────────────────────────────
      const orderPlantId = orderData.plant_id || orderData.plantId;
      const orderPlantName = orderData.plantName || orderData.plant_name || orderPlantId;
      const currentPlantId = currentProcessorPlant.id;
      const currentPlantName = currentProcessorPlant.name;

      // If order is assigned to a plant, and current station has a plant, ensure they match!
      if (orderPlantId && currentPlantId) {
        const norm = (s: string) => s.trim().toLowerCase().replace(/[-_]/g, '');
        if (norm(orderPlantId) !== norm(currentPlantId)) {
          // MISMATCH: Even if processor scans, DO NOT PROCEED!
          setScanError({
            type: 'PLANT_MISMATCH',
            title: 'Facility Mismatch: Assigned to Another Plant',
            message: `This order is assigned to ${orderPlantName || orderPlantId}, but this station is operating under ${currentPlantName} (${currentPlantId}). Intake cannot proceed at this plant.`,
            orderPlant: orderPlantName || orderPlantId,
            currentPlant: `${currentPlantName} (${currentPlantId})`,
            scannedCode: rawCode
          });
          return;
        }
      }

      // ─── STEP 5: All Checks Passed! Open Streamlined Confirmation Modal ──
      setScannedOrder({
        orderId: orderData.id || orderId,
        customerName: orderData.customerName || 'Valued Customer',
        customerPhone: orderData.customerPhone || '',
        service: orderData.service || 'Standard Laundry Service',
        weight: String(orderData.weightKg || orderData.weight || '5.0'),
        address: orderData.address || '',
        items: orderData.items || [],
        plantId: orderPlantId || currentPlantId,
        plantName: orderPlantName || currentPlantName,
        bagQr: orderData.bagQr || `BAG-${orderData.id || orderId}`,
        status: orderData.status || 'laundry_collected',
        statusLabel: orderData.statusLabel || 'Laundry Collected'
      });
      setSelectedAction('washing');
      setBagCondition('Good');
      setConfirmedSuccess(false);

    } catch (err) {
      console.error('Lookup notice:', err);
      setScanError({
        type: 'ERROR',
        title: 'Communication Error',
        message: 'Could not contact the facility server to verify the parcel. Please check connection and try again.',
        scannedCode: rawCode
      });
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

  const handleManualSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = manualCode.trim();
    if (!trimmed) {
      setInputError(true);
      setTimeout(() => setInputError(false), 1200);
      return;
    }
    handleOpenAction(trimmed);
  };

  const toggleFlashlight = async () => {
    const nextState = !isTorchOn;
    setIsTorchOn(nextState);
    try {
      const videoElem = document.querySelector('video');
      const stream = videoElem?.srcObject as MediaStream | null;
      const track = stream?.getVideoTracks()[0];
      if (track && 'applyConstraints' in track) {
        const capabilities = (track.getCapabilities?.() || {}) as any;
        if (capabilities.torch) {
          await (track as any).applyConstraints({
            advanced: [{ torch: nextState }]
          });
        }
      }
    } catch (err) {
      console.log('Torch capability note:', err);
    }
  };

  /**
   * INTAKE CONFIRMATION ACTION:
   * Reassigns order from driver to processor and moves to washing.
   * No scale weight modification controls.
   */
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
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          actualWeightKg: parseFloat(scannedOrder.weight) || 5.0,
          bagCondition,
          restrictedItems: [],
          processingAction: selectedAction
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to intake order for processing.');

      setConfirmedSuccess(true);
      if (onOrderScanned) onOrderScanned(scannedOrder.orderId);

      // Prepend to recent scans list
      const newScanItem: RecentScanItem = {
        id: `rec-${Date.now()}`,
        orderId: scannedOrder.orderId,
        customerName: scannedOrder.customerName,
        itemCount: scannedOrder.items?.length || 5,
        status: selectedAction === 'washing' ? 'washing' : selectedAction === 'sorting' ? 'sorting' : 'received',
        statusLabel: selectedAction === 'washing' ? 'Washing' : selectedAction === 'sorting' ? 'Sorting' : 'Intake Ready',
        statusColor: selectedAction === 'washing' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100',
        timeAgo: 'Just now',
        image: 'https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=300&q=80',
        service: scannedOrder.service
      };
      setRecentScans(prev => [newScanItem, ...prev.filter(i => i.orderId !== scannedOrder.orderId)]);

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

  // Close modals on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && scannedOrder && !isSubmitting) {
        setScannedOrder(null);
      }
      if (e.key === 'Escape' && scanError) {
        setScanError(null);
      }
      if (e.key === 'Escape' && showHowToScanModal) {
        setShowHowToScanModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [scannedOrder, scanError, isSubmitting, showHowToScanModal]);

  return (
    <div className="w-full min-h-screen pb-16">
      {/* ─── Injected Styles ──────────────────────────────────────────────── */}
      <style jsx global>{`
        .scanner-viewport-bg {
          background-image:
            linear-gradient(180deg, rgba(3, 14, 30, 0.25), rgba(3, 14, 30, 0.65)),
            url("https://images.unsplash.com/photo-1582735689369-4fe89db7114c?auto=format&fit=crop&w=1600&q=85");
          background-size: cover;
          background-position: center;
        }

        .scan-laser-line {
          animation: scanLaser 2.6s ease-in-out infinite;
        }

        @keyframes scanLaser {
          0% {
            transform: translateY(-120px);
            opacity: 0.3;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(120px);
            opacity: 0.3;
          }
        }

        .qr-bracket-corner {
          position: absolute;
          width: 55px;
          height: 55px;
          border-color: #2563eb;
          filter: drop-shadow(0 0 8px rgba(37, 99, 235, 0.75));
        }

        .qr-bracket-tl {
          top: 0;
          left: 0;
          border-top: 5px solid;
          border-left: 5px solid;
          border-radius: 16px 0 0 0;
        }

        .qr-bracket-tr {
          top: 0;
          right: 0;
          border-top: 5px solid;
          border-right: 5px solid;
          border-radius: 0 16px 0 0;
        }

        .qr-bracket-bl {
          bottom: 0;
          left: 0;
          border-bottom: 5px solid;
          border-left: 5px solid;
          border-radius: 0 0 0 16px;
        }

        .qr-bracket-br {
          bottom: 0;
          right: 0;
          border-bottom: 5px solid;
          border-right: 5px solid;
          border-radius: 0 0 16px 0;
        }

        .recent-card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }

        .recent-card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 30px rgba(15, 45, 100, 0.08);
        }

        .find-btn-hover {
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }

        .find-btn-hover:hover {
          transform: translateY(-1px);
          box-shadow: 0 12px 28px rgba(37, 99, 235, 0.28);
        }

        .find-btn-hover:active {
          transform: translateY(0);
        }
      `}</style>

      {/* ── Toast Notification ── */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 px-4 py-3 rounded-2xl shadow-xl bg-slate-900 text-white border border-slate-700 text-xs font-bold transition-all animate-in slide-in-from-top-4 duration-200 flex items-center gap-2.5">
          <span className="w-2 h-2 rounded-full bg-[#48CAE4] animate-pulse" />
          <span>{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 hover:opacity-75 cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ─── Page Title & Action Strip ─────────────────────────────────────── */}
      <section className="mb-7 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-[#10255f]">
              Scan Order QR
            </h2>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-200">
              <Building2 className="w-3.5 h-3.5" />
              <span>{currentProcessorPlant.name}</span>
            </span>
          </div>
          <p className="mt-1.5 text-sm sm:text-base font-medium text-slate-500">
            Scan the Laundelle Bag QR tag to verify plant assignment and intake the order for processing
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowHowToScanModal(true)}
          className="inline-flex w-fit items-center gap-2 rounded-full bg-blue-50 hover:bg-blue-100 border border-blue-200/80 px-4 sm:px-5 py-2 sm:py-2.5 text-xs sm:text-sm font-bold text-blue-600 transition-all cursor-pointer shadow-2xs active:scale-95 shrink-0"
        >
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 text-xs font-black text-white">
            ?
          </span>
          <span>How to scan?</span>
        </button>
      </section>

      {/* ─── Camera QR Scanner Window ───────────────────────────────────────── */}
      <div className="relative h-[380px] sm:h-[480px] overflow-hidden rounded-[24px] sm:rounded-[28px] border border-slate-200 shadow-[0_15px_45px_rgba(15,45,100,0.12)] bg-slate-950">
        {/* Optical live camera view or paused backdrop */}
        {cameraEnabled ? (
          <div className="absolute inset-0 w-full h-full flex items-center justify-center">
            <Scanner
              onScan={handleScan}
              formats={['qr_code']}
              styles={{
                container: { width: '100%', height: '100%' },
                video: { objectFit: 'cover' }
              }}
            />
          </div>
        ) : (
          <div className="scanner-viewport-bg absolute inset-0 w-full h-full flex flex-col items-center justify-center text-white p-6 text-center">
            <CameraOff className="w-12 h-12 text-slate-300 opacity-60 mb-2" />
            <h4 className="text-base font-extrabold">Camera Optical Feed Paused</h4>
            <p className="text-xs text-slate-300 max-w-xs mt-1">
              Resume live optical scanning or use the manual barcode entry below.
            </p>
            <button
              type="button"
              onClick={() => setCameraEnabled(true)}
              className="mt-4 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              Resume Camera Feed
            </button>
          </div>
        )}

        {/* Dark subtle vignette overlay */}
        <div className="absolute inset-0 bg-slate-950/20 pointer-events-none" />

        {/* Top Floating Controls (Flashlight / Torch & Camera Pause) */}
        <div className="absolute right-4 top-4 z-20 flex items-center gap-2">
          {cameraEnabled && (
            <button
              type="button"
              onClick={() => setCameraEnabled(false)}
              className="flex h-11 w-11 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-md transition hover:bg-white/20 cursor-pointer shadow-md"
              title="Pause Camera"
            >
              <CameraOff className="h-5 w-5" />
            </button>
          )}

          <button
            type="button"
            onClick={toggleFlashlight}
            aria-label="Toggle flashlight"
            className={`flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full border transition backdrop-blur-md cursor-pointer shadow-md ${isTorchOn
              ? 'bg-amber-400 border-amber-300 text-slate-900 shadow-amber-400/50'
              : 'border-white/40 bg-black/35 text-white hover:bg-white/20'
              }`}
            title="Toggle Flashlight / Torch"
          >
            {isTorchOn ? <Zap className="h-5 w-5 sm:h-6 sm:w-6 fill-current" /> : <ZapOff className="h-5 w-5 sm:h-6 sm:w-6" />}
          </button>
        </div>

        {/* Reticle Scanner Frame */}
        <div className="pointer-events-none absolute left-1/2 top-1/2 h-[230px] w-[230px] sm:h-[280px] sm:w-[280px] -translate-x-1/2 -translate-y-1/2">
          {/* Glowing Corners */}
          <div className="qr-bracket-corner qr-bracket-tl" />
          <div className="qr-bracket-corner qr-bracket-tr" />
          <div className="qr-bracket-corner qr-bracket-bl" />
          <div className="qr-bracket-corner qr-bracket-br" />

          {/* Animated Scanning Laser Line */}
          <div className="scan-laser-line absolute left-0 right-0 top-1/2 h-1 -translate-y-1/2 bg-blue-400 shadow-[0_0_16px_#60a5fa]" />
        </div>

        {/* Scanner Bottom Instruction Banner */}
        <div className="absolute bottom-5 sm:bottom-6 left-1/2 w-[calc(100%-32px)] max-w-[480px] -translate-x-1/2 rounded-full border border-white/30 bg-slate-950/60 px-5 sm:px-6 py-3 sm:py-3.5 text-center text-white backdrop-blur-md shadow-lg pointer-events-none">
          <p className="text-sm sm:text-base font-bold">
            Position Laundelle Bag QR within frame
          </p>
          <p className="mt-0.5 text-xs text-slate-200">
            Authenticates Laundelle tag & verifies plant assignment automatically
          </p>
        </div>
      </div>

      {/* ─── OR Divider ────────────────────────────────────────────────────── */}
      <div className="my-7 sm:my-8 flex items-center gap-4">
        <div className="h-px flex-1 bg-slate-200" />
        <div className="flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-slate-50 border border-slate-200 text-xs sm:text-sm font-bold text-slate-500 shadow-xs">
          OR
        </div>
        <div className="h-px flex-1 bg-slate-200" />
      </div>

      {/* ─── Manual Order ID Search ────────────────────────────────────────── */}
      <div className="rounded-[24px] sm:rounded-[28px] bg-gradient-to-br from-blue-50/90 via-blue-50/60 to-indigo-50/40 border border-blue-100/90 p-5 sm:p-7 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start gap-5 sm:gap-6">
          {/* Icon */}
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-blue-100/80 text-blue-600 shadow-2xs">
            <QrCode className="h-7 w-7 sm:h-8 sm:w-8 stroke-[1.8]" />
          </div>

          {/* Form Content */}
          <div className="flex-1 min-w-0">
            <h3 className="text-xl sm:text-2xl font-extrabold tracking-tight text-[#10255f]">
              Enter Order / Bag ID Manually
            </h3>
            <p className="mt-1 text-sm sm:text-base font-medium text-slate-500">
              If the bag tag is damaged or unreadable, enter the canonical order ID or bag QR code.
            </p>

            {/* Input with # Prefix */}
            <form onSubmit={handleManualSubmit} className="mt-5 space-y-4">
              <div
                className={`flex h-[64px] sm:h-[72px] items-center overflow-hidden rounded-2xl border bg-white shadow-sm transition focus-within:border-blue-400 focus-within:ring-4 focus-within:ring-blue-100 ${inputError ? 'border-red-400 ring-4 ring-red-100' : 'border-slate-200'
                  }`}
              >
                <div className="flex h-full w-[60px] sm:w-[72px] items-center justify-center border-r border-slate-200 text-xl sm:text-2xl font-bold text-[#10255f] bg-slate-50/50">
                  #
                </div>

                <input
                  id="orderId"
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter Laundelle tag (e.g. BAG-ORD-10245 or ORD-10245)"
                  className="h-full flex-1 bg-transparent px-4 sm:px-5 text-base sm:text-lg font-semibold text-[#10255f] placeholder:text-slate-400 focus:outline-hidden"
                />

                {manualCode && (
                  <button
                    type="button"
                    onClick={() => setManualCode('')}
                    className="p-2 mr-3 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>

              {/* Find Order Button */}
              <button
                id="findOrderButton"
                type="submit"
                disabled={isLoadingOrder}
                className="find-btn-hover flex h-[58px] sm:h-[66px] w-full items-center justify-center gap-2.5 sm:gap-3 rounded-2xl bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-700 hover:to-blue-600 text-base sm:text-lg font-bold text-white shadow-md shadow-blue-500/25 cursor-pointer active:scale-98 transition-all disabled:opacity-70"
              >
                {isLoadingOrder ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Verifying Tag & Facility...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5 sm:h-6 sm:w-6 stroke-[2.5]" />
                    <span>Verify & Intake Order</span>
                  </>
                )}
              </button>
            </form>

          </div>
        </div>
      </div>

      {/* ─── ERROR MODAL: INVALID QR OR PLANT MISMATCH ─────────────────────── */}
      {scanError && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setScanError(null)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top status stripe */}
            <div
              className={`absolute top-0 left-0 right-0 h-2 ${scanError.type === 'NOT_COLLECTED'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-yellow-500'
                : scanError.type === 'ALREADY_INTAKED'
                  ? 'bg-gradient-to-r from-purple-500 via-indigo-500 to-blue-500'
                  : scanError.type === 'PLANT_MISMATCH'
                    ? 'bg-gradient-to-r from-red-500 via-rose-500 to-orange-500'
                    : 'bg-gradient-to-r from-amber-500 via-red-500 to-rose-500'
                }`}
            />

            <div className="flex items-start justify-between gap-4 pt-2">
              <div className="flex items-start gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${scanError.type === 'INVALID_QR'
                    ? 'bg-amber-100 text-amber-600'
                    : scanError.type === 'NOT_COLLECTED'
                      ? 'bg-orange-100 text-orange-600'
                      : scanError.type === 'ALREADY_INTAKED'
                        ? 'bg-purple-100 text-purple-600'
                        : scanError.type === 'PLANT_MISMATCH'
                          ? 'bg-red-100 text-red-600'
                          : 'bg-rose-100 text-rose-600'
                    }`}
                >
                  {scanError.type === 'INVALID_QR' ? (
                    <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                  ) : scanError.type === 'NOT_COLLECTED' ? (
                    <ShieldAlert className="w-6 h-6 stroke-[2.2]" />
                  ) : scanError.type === 'ALREADY_INTAKED' ? (
                    <CheckCircle2 className="w-6 h-6 stroke-[2.2]" />
                  ) : scanError.type === 'PLANT_MISMATCH' ? (
                    <Building2 className="w-6 h-6 stroke-[2.2]" />
                  ) : (
                    <AlertOctagon className="w-6 h-6 stroke-[2.2]" />
                  )}
                </div>

                <div>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider mb-1 ${scanError.type === 'INVALID_QR'
                      ? 'bg-amber-100 text-amber-800'
                      : scanError.type === 'NOT_COLLECTED'
                        ? 'bg-orange-100 text-orange-800'
                        : scanError.type === 'ALREADY_INTAKED'
                          ? 'bg-purple-100 text-purple-800'
                          : scanError.type === 'PLANT_MISMATCH'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-gray-100 text-gray-800'
                      }`}
                  >
                    {scanError.type === 'INVALID_QR'
                      ? 'Step 1: Tag Authentication Failed'
                      : scanError.type === 'NOT_COLLECTED'
                        ? 'Step 2: Driver Pickup Required (OTP Verification)'
                        : scanError.type === 'ALREADY_INTAKED'
                          ? 'Intake Blocked: Duplicate Intake Prohibited'
                          : scanError.type === 'PLANT_MISMATCH'
                            ? 'Step 3: Facility Assignment Mismatch'
                            : 'Scan Error'}
                  </span>
                  <h3 className="text-lg sm:text-xl font-extrabold text-[#10255f] leading-snug">
                    {scanError.title}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setScanError(null)}
                className="p-1.5 rounded-xl hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error Message & Breakdown */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
              <p className="text-xs sm:text-sm text-slate-700 font-medium leading-relaxed">
                {scanError.message}
              </p>

              {scanError.type === 'PLANT_MISMATCH' && (
                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-200/80 text-xs">
                  <div className="p-2.5 rounded-xl bg-red-50 border border-red-200">
                    <p className="text-[10px] font-bold uppercase text-red-600">Assigned Facility</p>
                    <p className="text-xs font-extrabold text-red-900 mt-0.5 truncate">
                      {scanError.orderPlant || 'Another Plant'}
                    </p>
                  </div>
                  <div className="p-2.5 rounded-xl bg-blue-50 border border-blue-200">
                    <p className="text-[10px] font-bold uppercase text-blue-600">This Station</p>
                    <p className="text-xs font-extrabold text-blue-900 mt-0.5 truncate">
                      {scanError.currentPlant || currentProcessorPlant.name}
                    </p>
                  </div>
                </div>
              )}

              {scanError.currentStatus && (
                <div className="text-[11px] font-mono text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-sans font-bold text-slate-400">Current Order Stage: </span>
                  <span className="font-bold text-[#10255f]">{scanError.currentStatus}</span>
                </div>
              )}

              {scanError.scannedCode && (
                <div className="text-[11px] font-mono text-slate-500 bg-white p-2.5 rounded-xl border border-slate-200 truncate">
                  <span className="font-sans font-bold text-slate-400">Scanned input: </span>
                  {scanError.scannedCode}
                </div>
              )}
            </div>

            {/* Instruction Warning */}
            <div
              className={`flex items-start gap-2.5 text-xs p-3 rounded-2xl border ${scanError.type === 'NOT_COLLECTED'
                ? 'text-orange-900 bg-orange-50 border-orange-200'
                : scanError.type === 'ALREADY_INTAKED'
                  ? 'text-purple-900 bg-purple-50 border-purple-200'
                  : 'text-amber-800 bg-amber-50/80 border-amber-200/80'
                }`}
            >
              <Info className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
              <p>
                {scanError.type === 'NOT_COLLECTED' ? (
                  <>
                    <strong>Driver OTP Verification Required:</strong> The pickup driver must collect the laundry bag from the customer and successfully verify the customer OTP in the driver app before plant intake can proceed.
                  </>
                ) : scanError.type === 'ALREADY_INTAKED' ? (
                  <>
                    <strong>Single Intake Policy:</strong> This order has already been received at the plant. It cannot be intaked a second time. Switch to the Processing Board tab to track or update its washing progress.
                  </>
                ) : (
                  <>
                    <strong>Operational Policy:</strong> Intake is halted. Do not wash or sort parcels that do not belong to this plant facility.
                  </>
                )}
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setScanError(null);
                setManualCode('');
              }}
              className="w-full py-3.5 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl text-xs sm:text-sm transition-all shadow-md cursor-pointer active:scale-98"
            >
              Acknowledge & Scan Next Bag
            </button>
          </div>
        </div>
      )}

      {/* ─── HOW TO SCAN HELP MODAL ────────────────────────────────────────── */}
      {showHowToScanModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowHowToScanModal(false)}
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-6 sm:p-7 space-y-5 animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-lg font-extrabold text-[#10255f]">How to Scan Bag Tags</h3>
                  <p className="text-xs text-gray-400">Plant Intake Operating Guide</p>
                </div>
              </div>
              <button
                onClick={() => setShowHowToScanModal(false)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3.5">
              {[
                {
                  step: '1',
                  title: 'Locate Genuine Laundelle Bag QR Tag',
                  desc: 'Find the official high-contrast Laundelle QR tag (formatted BAG-ORD-...) fastened to the driver collection bag.'
                },
                {
                  step: '2',
                  title: 'Automatic Verification',
                  desc: 'The terminal first validates the QR is genuine Laundelle, then verifies that the order is assigned to this plant facility.'
                },
                {
                  step: '3',
                  title: 'Facility Guard',
                  desc: 'If the parcel belongs to a different plant or is non-Laundelle, the terminal immediately halts and will not proceed.'
                },
                {
                  step: '4',
                  title: 'One-Click Intake Confirmation',
                  desc: 'Review order details and click "Intake Order" to reassign the parcel from driver to processor and start washing.'
                }
              ].map((s) => (
                <div key={s.step} className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-100">
                  <div className="w-7 h-7 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                    {s.step}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-gray-900">{s.title}</h4>
                    <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setShowHowToScanModal(false)}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs transition-colors shadow-sm cursor-pointer"
            >
              Got it, continue scanning
            </button>
          </div>
        </div>
      )}

      {/* ─── STREAMLINED ORDER INTAKE CONFIRMATION MODAL ───────────────────── */}
      {/* (No digital scale or weight editing controls) */}
      {scannedOrder && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/65 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSubmitting) {
              setScannedOrder(null);
            }
          }}
        >
          <div
            className="relative w-full max-w-xl bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden my-auto max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-150"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top Accent Stripe */}
            <div className={`h-1.5 shrink-0 ${scannedOrder.alreadyIntaked
              ? 'bg-gradient-to-r from-purple-600 via-indigo-500 to-blue-500'
              : 'bg-gradient-to-r from-blue-600 via-indigo-500 to-emerald-500'
              }`} />

            {/* Modal Header */}
            <div className="p-5 sm:p-6 pb-4 border-b border-gray-100 flex items-start justify-between gap-4 shrink-0 bg-white">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`w-13 h-13 rounded-2xl flex items-center justify-center shrink-0 shadow-2xs ${scannedOrder.alreadyIntaked ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'
                  }`}>
                  <ShoppingBag className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-black text-lg text-[#10255f] tracking-tight">
                      #{scannedOrder.orderId}
                    </span>
                    {scannedOrder.alreadyIntaked ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                        <Sparkles className="w-3 h-3 text-purple-600" />
                        {scannedOrder.statusLabel || 'In Processing'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <ShieldCheck className="w-3 h-3 text-emerald-600" />
                        Laundelle Verified
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                      <Building2 className="w-3 h-3 text-blue-600" />
                      {scannedOrder.plantName || currentProcessorPlant.name}
                    </span>
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 mt-1 truncate">
                    {scannedOrder.customerName}
                  </h3>
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

            {/* Modal Body: Clean Order Overview (No Weight Inputs) */}
            <div className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 bg-white">
              {/* If already in processing, show notice */}
              {scannedOrder.alreadyIntaked && (
                <div className="flex items-start gap-2.5 p-3.5 rounded-2xl bg-amber-50/90 border border-amber-200 text-xs text-amber-900">
                  <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-extrabold">Active in Processing: </span>
                    <span>This order has already been intaked and is currently in stage <strong className="text-[#10255f]">{scannedOrder.statusLabel || scannedOrder.status}</strong>.</span>
                  </div>
                </div>
              )}

              {/* Handover & Bag Tag Banner */}
              <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 border border-blue-100 text-xs">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <span className="font-bold text-[#10255f]">Bag QR Tag:</span>
                  <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                    {scannedOrder.bagQr || `BAG-${scannedOrder.orderId}`}
                  </span>
                </div>
                <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                  <Check className="w-3.5 h-3.5" />
                  <span>Plant Matched</span>
                </div>
              </div>

              {/* Service Manifest & Customer Address */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-gray-200/80 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                    Service & Package Details
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-mono font-bold text-slate-600 bg-white px-2.5 py-1 rounded-lg border border-gray-200 shadow-2xs">
                    <Scale className="w-3.5 h-3.5 text-slate-400" />
                    Weight: {scannedOrder.weight} kg
                  </span>
                </div>

                <p className="text-sm font-bold text-gray-900 leading-snug">
                  {scannedOrder.service}
                </p>

                {scannedOrder.specialInstructions && (
                  <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-900">
                    <span className="font-bold">Special Note: </span>
                    <span className="italic">{scannedOrder.specialInstructions}</span>
                  </div>
                )}

                {scannedOrder.items && scannedOrder.items.length > 0 && (
                  <div className="pt-2 border-t border-gray-200/80 space-y-1">
                    <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                      Itemized Manifest ({scannedOrder.items.length} items):
                    </p>
                    <div className="space-y-1 max-h-28 overflow-y-auto pr-1">
                      {scannedOrder.items.map((it: any, idx: number) => (
                        <div key={idx} className="flex items-center justify-between text-xs text-gray-700 bg-white p-2 rounded-lg border border-gray-100">
                          <span className="font-medium truncate">{it.name || it.description || 'Laundry Item'}</span>
                          <span className="font-mono font-bold text-blue-600 shrink-0">×{it.quantity || 1}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {scannedOrder.address && (
                  <p className="text-xs text-gray-500 flex items-center gap-1.5 pt-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>{scannedOrder.address}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Modal Footer with Single Intake Order Button or View in Processing Board */}
            <div className="p-4 sm:p-5 bg-slate-50 border-t border-gray-100 flex items-center gap-3 shrink-0">
              {scannedOrder.alreadyIntaked ? (
                <>
                  <button
                    type="button"
                    onClick={() => setScannedOrder(null)}
                    className="px-5 py-3.5 bg-white hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-2xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close (Esc)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setScannedOrder(null);
                      onNavigateTab('orders');
                    }}
                    className="flex-1 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black bg-[#03045E] hover:bg-[#023E8A] text-white shadow-lg shadow-[#03045E]/20 cursor-pointer flex items-center justify-center gap-2 active:scale-98 transition-all"
                  >
                    <ShoppingBag className="w-4 h-4 text-[#48CAE4]" />
                    <span>View in Processing Board</span>
                    <ArrowRight className="w-4 h-4 ml-1 text-white/70" />
                  </button>
                </>
              ) : (
                <>
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
                    className={`flex-1 py-3.5 px-6 rounded-2xl text-xs sm:text-sm font-black transition-all cursor-pointer flex items-center justify-center gap-2 shadow-lg ${confirmedSuccess
                      ? 'bg-emerald-600 text-white shadow-emerald-600/30'
                      : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30 active:scale-98'
                      }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Assigning to Processor & Recording Intake...</span>
                      </>
                    ) : confirmedSuccess ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        <span>Intake Confirmed! Opening Board...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4 text-blue-200" />
                        <span>In take order</span>
                        <ArrowRight className="w-4 h-4 ml-1 text-white/70" />
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import {
  Package, Clock, CheckCircle2, Phone, MapPin, Calendar, FileText,
  ChevronRight, RefreshCw, ShoppingBag, Truck, AlertTriangle, Search,
  Check, Navigation, X, ChevronLeft, Filter,
  Star, Headphones, ShieldCheck, Key, Droplets, QrCode, Building2,
  Sparkles, CheckCheck, XCircle, Shirt, CreditCard
} from 'lucide-react';
import { Order, OrderStatus } from '@laundelle/types';
import { dbCancelOrder, getStoredSession, apiFetch } from '@laundelle/api-client';

export interface JourneyStage {
  id: string;
  stepNumber: number;
  title: string;
  requirement: string;
  description: string;
  status: 'completed' | 'in_progress' | 'upcoming';
  timestamp: string | null;
  icon: React.ElementType;
  metaBadge?: string;
}

export const formatTimelineDate = (isoString?: string | null) => {
  if (!isoString) return null;
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return null;
  }
};

export const computeOrderJourney = (order: Order) => {
  const events = order.timeline_events || [];
  const status = order.status || '';

  const findEventTime = (eventNames: string[]) => {
    const found = events.find((e: any) => eventNames.includes(e.event));
    return found?.timestamp || null;
  };

  // 1. Booking Confirmed: Customer placed order and payment was successfully completed
  const isPaid = order.paymentStatus === 'Paid' || order.isPaid === true;
  const isPendingPayment = status === 'pending_payment';
  const hasMovedPastBooking = !isPendingPayment && [
    'booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress',
    'laundry_collected', 'received_at_facility', 'sorting', 'washing', 'in_wash', 'drying',
    'ironing', 'folding', 'quality_check', 'qc_ready', 'ready_for_delivery', 'waiting_for_driver',
    'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery',
    'delivered', 'completed'
  ].includes(status);

  const step1Completed = (isPaid || hasMovedPastBooking) && !isPendingPayment;
  const step1InProgress = isPendingPayment;
  const step1Time = findEventTime(['payment_success', 'order_placed', 'order_created']) || order.createdAt;

  // 2. Order Pickup Completed: Driver picks up the order by verifying the OTP
  const pickupOtpVerified = Boolean(
    order.pickup_pin_verified_at ||
    (order as any).pickup_otp_verified_at ||
    order.qr_tracking?.collectedAt ||
    findEventTime(['laundry_collected', 'pickup_pin_verified_and_collected', 'pickup_completed'])
  );
  const hasMovedPastPickup = [
    'laundry_collected', 'received_at_facility', 'sorting', 'washing', 'in_wash', 'drying',
    'ironing', 'folding', 'quality_check', 'qc_ready', 'ready_for_delivery', 'waiting_for_driver',
    'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery',
    'delivered', 'completed'
  ].includes(status);

  const step2Completed = pickupOtpVerified || hasMovedPastPickup;
  const step2InProgress = !step2Completed && [
    'booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress'
  ].includes(status);
  const step2Time = order.pickup_pin_verified_at ||
    (order as any).pickup_otp_verified_at ||
    order.qr_tracking?.collectedAt ||
    findEventTime(['laundry_collected', 'pickup_pin_verified_and_collected', 'pickup_completed']);

  // 3. Received at Plant: Driver submits order to processor and processor takes it by scanning QR
  const plantIntakeDone = Boolean(
    (order as any).intake?.intakeAt ||
    (order as any).package?.attached_at ||
    findEventTime(['facility_intake', 'received_at_facility'])
  );
  const hasMovedPastPlant = [
    'received_at_facility', 'sorting', 'washing', 'in_wash', 'drying', 'ironing', 'folding',
    'quality_check', 'qc_ready', 'ready_for_delivery', 'waiting_for_driver',
    'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery',
    'delivered', 'completed'
  ].includes(status);

  const step3Completed = step2Completed && (plantIntakeDone || hasMovedPastPlant);
  const step3InProgress = !step3Completed && status === 'laundry_collected';
  const step3Time = (order as any).intake?.intakeAt ||
    (order as any).package?.attached_at ||
    findEventTime(['facility_intake', 'received_at_facility']);

  // 4. Washing: Processor starts washing the clothes
  const hasMovedPastWashing = [
    'drying', 'ironing', 'folding', 'quality_check', 'qc_ready', 'ready_for_delivery',
    'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery',
    'out_for_delivery', 'delivered', 'completed'
  ].includes(status) || Boolean((order as any).qc?.passed);

  const step4Completed = step3Completed && hasMovedPastWashing;
  const step4InProgress = !step4Completed && step3Completed && ['washing', 'in_wash', 'sorting'].includes(status);
  const step4Time = findEventTime(['washing', 'in_wash']) || (status === 'washing' || status === 'in_wash' ? step3Time : null);

  // 5. Quality Check: Processor is doing the QC tests or order is under QC test
  const qcPassed = Boolean(
    (order as any).qc?.passed === true ||
    findEventTime(['quality_check_passed', 'qc_passed']) ||
    ['ready_for_delivery', 'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery', 'delivered', 'completed'].includes(status)
  );

  const step5Completed = step3Completed && qcPassed;
  const step5InProgress = !step5Completed && ['quality_check', 'qc_ready'].includes(status);
  const step5Time = (order as any).qc?.checkedAt || findEventTime(['quality_check_passed', 'qc_passed']);

  // 6. Out for Delivery: All QC are passed and order is ready to deliver
  const hasMovedPastOutForDelivery = ['delivered', 'completed'].includes(status) ||
    Boolean(order.delivery_pin_verified_at || (order as any).delivery_otp_verified_at || (order as any).delivered_at);

  const isReadyOrDispatched = [
    'ready_for_delivery', 'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery'
  ].includes(status);

  const step6Completed = hasMovedPastOutForDelivery;
  const step6InProgress = !step6Completed && (status === 'out_for_delivery' || (step5Completed && isReadyOrDispatched));
  const step6Time = findEventTime(['out_for_delivery', 'package_collected_for_delivery']) || (order as any).ready_for_delivery_at;

  // 7. Delivered at Doorstep: Delivery boy delivers order successfully after verifying delivery Pin
  const deliveryPinVerified = Boolean(
    status === 'delivered' ||
    status === 'completed' ||
    order.delivery_pin_verified_at ||
    (order as any).delivery_otp_verified_at ||
    (order as any).delivered_at ||
    findEventTime(['delivered', 'delivery_confirmed', 'delivery_pin_verified'])
  );

  const step7Completed = deliveryPinVerified;
  const step7InProgress = !step7Completed && status === 'out_for_delivery';
  const step7Time = (order as any).delivered_at ||
    order.delivery_pin_verified_at ||
    (order as any).delivery_otp_verified_at ||
    order.qr_tracking?.deliveredAt ||
    findEventTime(['delivered', 'delivery_confirmed']);

  // Once all these are completed then mark that order as completed.
  const isAllCompleted = step7Completed;

  const stages: JourneyStage[] = [
    {
      id: 'booking_confirmed',
      stepNumber: 1,
      title: 'Booking Confirmed',
      requirement: 'Customer placed order and payment was successfully completed.',
      description: step1Completed
        ? 'Customer placed order and payment was successfully completed.'
        : 'Order placed — awaiting payment confirmation.',
      status: step1Completed ? 'completed' : step1InProgress ? 'in_progress' : 'upcoming',
      timestamp: step1Time,
      icon: CheckCircle2,
      metaBadge: isPaid ? 'Payment Confirmed' : undefined,
    },
    {
      id: 'pickup_completed',
      stepNumber: 2,
      title: 'Order Pickup Completed',
      requirement: 'Driver picks up the order by verifying the OTP.',
      description: step2Completed
        ? 'Driver picked up the order by verifying the customer OTP.'
        : step2InProgress
          ? 'Driver en route for pickup. Share your secure OTP upon arrival.'
          : 'Driver will arrive in your scheduled slot and verify OTP.',
      status: step2Completed ? 'completed' : step2InProgress ? 'in_progress' : 'upcoming',
      timestamp: step2Time,
      icon: ShieldCheck,
      metaBadge: step2Completed ? 'OTP Verified' : undefined,
    },
    {
      id: 'received_at_plant',
      stepNumber: 3,
      title: 'Received at Plant',
      requirement: 'Driver submits the order to processor and processor takes it by scanning QR.',
      description: step3Completed
        ? 'Driver submitted order to processor; processor accepted by scanning QR code.'
        : step3InProgress
          ? 'Order in transit to plant facility. Processor standing by for QR scan intake.'
          : 'Order will arrive at facility and processor will scan QR tag to register intake.',
      status: step3Completed ? 'completed' : step3InProgress ? 'in_progress' : 'upcoming',
      timestamp: step3Time,
      icon: QrCode,
      metaBadge: step3Completed ? 'QR Intake Verified' : undefined,
    },
    {
      id: 'washing',
      stepNumber: 4,
      title: 'Washing',
      requirement: 'Processor starts washing the clothes.',
      description: step4Completed
        ? 'Processor completed washing and fabric-safe eco-sanitization cycle.'
        : step4InProgress
          ? 'Processor has started washing the clothes with eco-friendly sanitization.'
          : 'Garments will enter specialized wash cycle upon intake sorting.',
      status: step4Completed ? 'completed' : step4InProgress ? 'in_progress' : 'upcoming',
      timestamp: step4Time,
      icon: Droplets,
      metaBadge: step4InProgress ? 'Washing in Progress' : undefined,
    },
    {
      id: 'quality_check',
      stepNumber: 5,
      title: 'Quality Check',
      requirement: 'Processor is doing the QC tests or order is under QC test.',
      description: step5Completed
        ? 'All QC tests passed! Garments inspected for cleanliness and fabric care.'
        : step5InProgress
          ? 'Processor is doing QC tests — order is currently under multi-point inspection.'
          : 'Processor will conduct multi-point QC inspection following wash cycle.',
      status: step5Completed ? 'completed' : step5InProgress ? 'in_progress' : 'upcoming',
      timestamp: step5Time,
      icon: CheckCheck,
      metaBadge: step5Completed ? 'QC Passed' : step5InProgress ? 'Under QC Test' : undefined,
    },
    {
      id: 'out_for_delivery',
      stepNumber: 6,
      title: 'Out for Delivery',
      requirement: 'All the QC are passed and order is ready to deliver.',
      description: step6Completed
        ? 'Out for delivery completed; driver reached doorstep destination.'
        : status === 'out_for_delivery'
          ? 'All QC passed! Courier is currently out for delivery to your doorstep.'
          : step6InProgress
            ? 'All QC passed! Order is packaged and assigned for doorstep delivery.'
            : 'Order will be dispatched for delivery once all QC tests are passed.',
      status: step6Completed ? 'completed' : step6InProgress ? 'in_progress' : 'upcoming',
      timestamp: step6Time,
      icon: Truck,
      metaBadge: status === 'out_for_delivery' ? 'On Road' : step6Completed ? 'Completed' : undefined,
    },
    {
      id: 'delivered_at_doorstep',
      stepNumber: 7,
      title: 'Delivered at Doorstep',
      requirement: 'Delivery boy delivers the order successfully after verifying the delivery Pin.',
      description: step7Completed
        ? 'Delivery boy delivered the order successfully after verifying delivery PIN.'
        : step7InProgress
          ? 'Delivery courier is at your doorstep. Please share your delivery PIN.'
          : 'Delivery boy will deliver to your doorstep and verify your delivery PIN.',
      status: step7Completed ? 'completed' : step7InProgress ? 'in_progress' : 'upcoming',
      timestamp: step7Time,
      icon: Package,
      metaBadge: step7Completed ? 'PIN Verified' : undefined,
    },
  ];

  const completedCount = stages.filter(s => s.status === 'completed').length;
  const currentStage = stages.find(s => s.status === 'in_progress') || (isAllCompleted ? stages[6] : stages[0]);

  return {
    stages,
    isAllCompleted,
    completedCount,
    currentStage,
    totalStages: 7
  };
};

interface OrdersViewProps {
  orders: Order[];
  onOpenBookNow: () => void;
  onOpenInvoice: (order: Order) => void;
  onOpenRescheduleCancel: (order: Order, mode: 'reschedule' | 'cancel') => void;
  onOpenAdditionalCharge: (order: Order) => void;
  onRepeatOrder: (order: Order) => void;
  selectedOrderId?: string | null;
}

export const OrdersView: React.FC<OrdersViewProps> = ({
  orders,
  onOpenBookNow,
  onOpenInvoice,
  onOpenRescheduleCancel,
  onOpenAdditionalCharge,
  onRepeatOrder,
  selectedOrderId,
}) => {
  const [filterTab, setFilterTab] = useState<'all' | 'active' | 'completed'>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedOrderIdState, setSelectedOrderIdState] = useState<string | null>(() => selectedOrderId || null);
  const [activeSubTab, setActiveSubTab] = useState<'details' | 'tracking'>('details');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 6;
  const [retryingOrderId, setRetryingOrderId] = useState<string | null>(null);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const selectedOrder = selectedOrderIdState ? orders.find(o => o.id === selectedOrderIdState || (o as any)._id === selectedOrderIdState) || null : null;
  const selectedJourney = selectedOrder ? computeOrderJourney(selectedOrder) : null;

  const handleRetryPayment = async (order: Order) => {
    const orderId = order.id || (order as any)._id;
    setRetryingOrderId(orderId);
    try {
      const session = getStoredSession();
      const token = session?.token;
      const storedUserId = session?.user?.id || '';

      const res = await apiFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          amount: Number(order.total ?? (order as any).total_price ?? (order as any).amount ?? 0),
          customerEmail: (order as any).customerEmail || (order as any).email || session?.user?.email || '',
          userId: order.userId || (order as any).user_id || storedUserId || '',
          orderId: orderId,
          orderPayload: {
            ...order,
            id: orderId,
            userId: order.userId || (order as any).user_id || storedUserId,
            status: 'pending_payment',
            paymentStatus: 'Pending',
          },
          items: order.items || [],
        }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        alert(data.error || 'Failed to initialize payment checkout.');
      }
    } catch (err: any) {
      console.error('Error retrying payment:', err);
      alert('Network error initializing payment checkout.');
    } finally {
      setRetryingOrderId(null);
    }
  };

  const handleCancelUnpaidOrder = async (order: Order) => {
    const orderId = order.id || (order as any)._id;
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setCancellingOrderId(orderId);
    try {
      const res = await dbCancelOrder('', orderId, 'Cancelled by customer due to uncompleted payment');
      if (res.success) {
        if (selectedOrderIdState === orderId) {
          setSelectedOrderIdState(null);
        }
      } else {
        alert(res.error || 'Failed to cancel order.');
      }
    } catch (err: any) {
      console.error('Error cancelling order:', err);
      alert('Error cancelling order.');
    } finally {
      setCancellingOrderId(null);
    }
  };

  useEffect(() => {
    if (selectedOrderId) {
      setSelectedOrderIdState(selectedOrderId);
      setActiveSubTab('tracking');
    }
  }, [selectedOrderId]);

  // Lock body scroll when full-screen modal is open
  useEffect(() => {
    if (selectedOrder) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [selectedOrder]);

  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);

  useEffect(() => {
    if (selectedOrder?.id) {
      setLoadingItems(true);
      apiFetch(`/api/v1/orders/${selectedOrder.id}/items`)
        .then(res => res.json())
        .then(data => {
          if (data?.items && Array.isArray(data.items)) {
            setOrderItems(data.items);
          } else {
            setOrderItems([]);
          }
        })
        .catch(() => setOrderItems([]))
        .finally(() => setLoadingItems(false));
    } else {
      setOrderItems([]);
    }
  }, [selectedOrder?.id]);

  const isOrderCompleted = (status: OrderStatus) => status === 'delivered' || status === 'completed';

  const activeOrders = orders.filter((o) => !isOrderCompleted(o.status) && o.status !== 'cancelled');
  const completedOrders = orders.filter((o) => isOrderCompleted(o.status) || o.status === 'cancelled');

  const filteredOrders = orders
    .filter((o) => {
      if (filterTab === 'active') return !isOrderCompleted(o.status) && o.status !== 'cancelled';
      if (filterTab === 'completed') return isOrderCompleted(o.status) || o.status === 'cancelled';
      return true;
    })
    .filter((o) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        o.id.toLowerCase().includes(q) ||
        o.statusLabel.toLowerCase().includes(q) ||
        o.address.toLowerCase().includes(q) ||
        (o.items || []).some(i => i.name.toLowerCase().includes(q))
      );
    });

  // Pagination calculation
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage) || 1;
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getStatusBadgeStyle = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-200';
      case 'cancelled':
      case 'pickup_failed':
      case 'delivery_failed':
      case 'pending_payment':
      case 'payment_failed':
        return 'bg-rose-100 text-rose-800 border border-rose-200 font-bold';
      case 'delivery_attempted':
      case 'additional_charge_rejected':
        return 'bg-amber-100 text-amber-800 border border-amber-200 font-bold';
      case 'rewash_required':
        return 'bg-purple-100 text-purple-800 border border-purple-200 font-bold';
      case 'in_wash':
      case 'in_processing':
      case 'washing':
        return 'bg-[#e8f8eb] text-[#299b45]';
      case 'out_for_delivery':
      case 'driver_assigned':
      case 'collection_scheduled':
        return 'bg-[#f1ebff] text-[#6544ed]';
      default:
        return 'bg-[#eaf0ff] text-[#2457d5]';
    }
  };

  const getStatusIconStyle = (status: OrderStatus) => {
    switch (status) {
      case 'delivered':
      case 'completed':
        return 'bg-emerald-50 text-emerald-600';
      case 'in_wash':
      case 'in_processing':
      case 'washing':
        return 'bg-[#e9f9ed] text-[#29a148]';
      case 'cancelled':
      case 'pickup_failed':
      case 'delivery_failed':
      case 'pending_payment':
      case 'payment_failed':
        return 'bg-rose-50 text-rose-600';
      case 'delivery_attempted':
      case 'additional_charge_rejected':
        return 'bg-amber-50 text-amber-600';
      case 'rewash_required':
        return 'bg-purple-50 text-purple-600';
      case 'out_for_delivery':
      case 'driver_assigned':
      case 'collection_scheduled':
        return 'bg-[#f0eaff] text-[#6749e8]';
      default:
        return 'bg-[#edf3ff] text-[#2459db]';
    }
  };

  return (
    <div className="min-h-screen bg-[#f9fbff] md:bg-[#f8fafc] text-[#071844] font-sans pb-20 md:pb-8">
      <style>{`
        .page-container {
          background:
            radial-gradient(circle at 72% 4%, rgba(228, 231, 255, 0.45), transparent 30%),
            linear-gradient(180deg, rgba(255,255,255,.94), rgba(249,251,255,.92));
        }

        .hero-section {
          background:
            radial-gradient(circle at 65% 60%, rgba(215, 222, 255, .7), transparent 28%),
            radial-gradient(circle at 90% 0%, rgba(235, 237, 255, .8), transparent 28%);
        }

        .washing-machine {
          width: 145px;
          height: 190px;
          border-radius: 12px;
          background: linear-gradient(145deg, #ffffff, #eef3ff);
          border: 1px solid #d8e1f8;
          box-shadow: 0 18px 40px rgba(53, 80, 150, .12);
        }

        .machine-top {
          height: 40px;
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 0 12px;
          border-bottom: 1px solid #d9e1f4;
        }

        .machine-display {
          width: 31px;
          height: 8px;
          border-radius: 3px;
          background: #d7e2ff;
        }

        .machine-knob {
          width: 20px;
          height: 20px;
          border: 2px solid #abbde7;
          border-radius: 50%;
        }

        .machine-screen {
          width: 38px;
          height: 20px;
          margin-left: auto;
          border-radius: 3px;
          background: #173975;
        }

        .machine-door {
          width: 91px;
          height: 91px;
          margin: 16px auto;
          border-radius: 50%;
          border: 8px solid #dce5fc;
          background: radial-gradient(circle at 35% 30%, #7897d9, #3559a0 42%, #17366f 45%, #122d64 70%);
          box-shadow: inset 0 0 0 2px rgba(255,255,255,.25), 0 5px 15px rgba(20, 48, 110, .15);
        }

        .laundry-basket {
          position: absolute;
          right: -54px;
          bottom: 3px;
          width: 104px;
          height: 53px;
          border-radius: 8px 8px 13px 13px;
          background: linear-gradient(180deg, #6d8ee0, #3559ae);
          box-shadow: 0 12px 20px rgba(48, 78, 151, .18);
        }

        .basket-handle {
          position: absolute;
          top: -13px;
          left: 14px;
          right: 14px;
          height: 20px;
          border: 6px solid #7c9bea;
          border-bottom: 0;
          border-radius: 10px 10px 0 0;
        }

        .shirt {
          position: absolute;
          left: 19px;
          top: -19px;
          width: 62px;
          height: 42px;
          border-radius: 8px 8px 14px 14px;
          background: #ff8d9f;
          transform: rotate(-4deg);
        }

        .shirt::before,
        .shirt::after {
          content: "";
          position: absolute;
          top: 1px;
          width: 20px;
          height: 19px;
          background: #ff8d9f;
        }

        .shirt::before {
          left: -13px;
          transform: rotate(35deg);
        }

        .shirt::after {
          right: -13px;
          transform: rotate(-35deg);
        }

        .plant {
          position: absolute;
          left: -65px;
          bottom: 4px;
          width: 58px;
          height: 70px;
        }

        .plant-pot {
          position: absolute;
          bottom: 0;
          left: 15px;
          width: 32px;
          height: 31px;
          border-radius: 3px 3px 12px 12px;
          background: linear-gradient(180deg, #ffffff, #dbe7ff);
        }

        .leaf {
          position: absolute;
          bottom: 25px;
          left: 28px;
          width: 12px;
          height: 42px;
          border-radius: 100% 0 100% 0;
          background: linear-gradient(180deg, #79c7b1, #3d91a0);
          transform-origin: bottom;
        }

        .leaf:nth-child(1) {
          transform: rotate(-30deg);
        }

        .leaf:nth-child(2) {
          height: 52px;
          transform: rotate(0deg);
        }

        .leaf:nth-child(3) {
          transform: rotate(31deg);
        }

        .order-card {
          transition: transform .25s ease, box-shadow .25s ease, border-color .25s ease;
        }

        @media (min-width: 768px) {
          .order-card:hover {
            transform: translateY(-4px);
            border-color: #d4dced;
            box-shadow: 0 18px 45px rgba(35,55,120,.10);
          }
        }

        .book-button {
          box-shadow: 0 10px 25px rgba(93, 61, 232, .30);
        }

        @media (max-width: 767px) {
          .washing-machine {
            transform: scale(.82);
            transform-origin: bottom center;
          }
          .plant {
            transform: scale(.82);
            transform-origin: bottom center;
          }
          .laundry-basket {
            right: -40px;
          }
        }
      `}</style>

      <div className="page-wrapper min-h-screen md:px-4 md:py-6">
        {/* ======================================================
             PAGE CONTAINER
        ======================================================= */}
        <main className="page-container mx-auto max-w-[1500px] overflow-hidden rounded-none border-0 md:rounded-[24px] md:border md:border-[#dce2ee] md:shadow-soft">

          {/* ==================================================
               HERO SECTION
          =================================================== */}
          <section className="hero-section relative px-6 pb-7 pt-6 sm:px-10 md:px-12 md:pb-10 md:pt-10">
            {/* Decorative Elements (Desktop) */}
            <div className="absolute right-[28%] top-12 hidden h-3 w-3 rounded-full border border-white bg-white/60 md:block pointer-events-none" />
            <div className="absolute right-[25%] top-20 hidden h-4 w-4 rounded-full border border-[#dce4ff] md:block pointer-events-none" />

            <div className="grid items-center gap-4 md:grid-cols-[1fr_1fr] md:gap-8">
              {/* Hero Content */}
              <div>
                <p className="mb-3 text-[12px] font-semibold tracking-[.15em] text-[#6544ed] md:text-[13px] md:text-[#1f61bd] uppercase">
                  <span className="md:hidden">CUSTOMER PORTAL</span>
                  <span className="hidden md:inline">CUSTOMER LAUNDRY PORTAL</span>
                </p>

                <h1 className="max-w-[570px] text-[40px] font-extrabold leading-[1.05] tracking-[-.04em] text-[#071844] sm:text-[46px] md:text-[54px]">
                  My Orders &
                  <br />
                  Collections
                </h1>

                <p className="mt-4 md:mt-5 max-w-[470px] text-[15px] md:text-[16px] font-medium leading-6 md:leading-7 text-[#536486]">
                  Track live progress, view invoices,
                  <br className="hidden md:block" />
                  {' '}reschedule or repeat past
                  <br className="hidden md:block" />
                  {' '}laundry orders.
                </p>
              </div>

              {/* Hero Illustration & Book Button */}
              <div className="relative flex h-[190px] items-end justify-center md:h-[250px]">
                <div className="relative mb-1 mr-6 md:mb-3 md:mr-8 select-none pointer-events-none">
                  {/* Plant */}
                  <div className="plant">
                    <span className="leaf" />
                    <span className="leaf" />
                    <span className="leaf" />
                    <div className="plant-pot" />
                  </div>

                  {/* Washing Machine */}
                  <div className="washing-machine">
                    <div className="machine-top">
                      <div>
                        <div className="machine-display mb-2" />
                        <div className="machine-display w-6" />
                      </div>
                      <div className="machine-knob" />
                      <div className="machine-screen" />
                    </div>
                    <div className="machine-door" />
                  </div>

                  {/* Basket */}
                  <div className="laundry-basket">
                    <div className="basket-handle" />
                    <div className="shirt" />
                    <div className="absolute bottom-2 left-5 h-5 w-5 rounded bg-[#172d6e]" />
                    <div className="absolute bottom-2 left-12 h-5 w-5 rounded bg-[#172d6e]" />
                  </div>
                </div>

                {/* Sparkles */}
                <div className="absolute right-[18%] top-7 text-2xl text-white select-none pointer-events-none">✦</div>
                <div className="absolute right-[12%] top-16 text-3xl text-[#9fb4ef] select-none pointer-events-none">✧</div>

                {/* Desktop Book Button */}
                <button
                  onClick={onOpenBookNow}
                  className="absolute right-0 top-1/2 hidden -translate-y-1/2 items-center gap-3 rounded-xl bg-[#102e78] hover:bg-[#0c235c] px-6 py-4 text-sm font-semibold text-white shadow-lg shadow-blue-900/10 transition hover:-translate-y-[55%] hover:shadow-xl lg:flex cursor-pointer"
                >
                  <Calendar className="w-5 h-5 text-sky-300" />
                  <span>Book New Collection</span>
                </button>

                {/* Mobile Book Button */}
                <div className="absolute right-0 top-[-2px] flex flex-col items-center md:right-2 lg:hidden">
                  <button
                    onClick={onOpenBookNow}
                    className="book-button flex h-[72px] w-[72px] items-center justify-center rounded-full bg-gradient-to-br from-[#7851f4] to-[#5127dc] text-white cursor-pointer active:scale-95 transition-transform"
                    title="Book New Collection"
                  >
                    <Calendar className="w-7 h-7 stroke-[1.8]" />
                  </button>
                  <div className="mt-2 text-center text-[15px] font-bold leading-5 text-[#071844]">
                    Book New
                    <br />
                    Collection
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
               STATISTICS (4 Columns on PC & Mobile)
          =================================================== */}
          <section className="px-5 md:px-8 lg:px-10 -mt-2 md:-mt-6 relative z-10">
            <div className="grid grid-cols-4 overflow-hidden rounded-[20px] border border-[#e3e8f3] bg-white/95 shadow-card">
              {/* Active Orders */}
              <div className="flex flex-col items-center justify-center gap-2 border-r border-[#e7ebf4] px-2 py-5 sm:flex-row sm:gap-3 sm:px-4 md:justify-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eee8ff] text-[#6544ed] sm:h-14 sm:w-14">
                  <ShoppingBag className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-none text-[#071844] sm:text-[25px]">
                    {activeOrders.length}
                  </div>
                  <div className="mt-2 text-[11px] font-medium leading-4 text-[#607092] sm:text-[12px]">
                    <span className="sm:hidden">Active<br />Orders</span>
                    <span className="hidden sm:inline">Active Orders</span>
                  </div>
                </div>
              </div>

              {/* Past Orders */}
              <div className="flex flex-col items-center justify-center gap-2 border-r border-[#e7ebf4] px-2 py-5 sm:flex-row sm:gap-3 sm:px-4 md:justify-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#eaf1ff] text-[#4780ed] sm:h-14 sm:w-14">
                  <Clock className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-none text-[#071844] sm:text-[25px]">
                    {completedOrders.length}
                  </div>
                  <div className="mt-2 text-[11px] font-medium leading-4 text-[#607092] sm:text-[12px]">
                    <span className="sm:hidden">Past<br />Orders</span>
                    <span className="hidden sm:inline">Past Orders</span>
                  </div>
                </div>
              </div>

              {/* Completion Rate */}
              <div className="flex flex-col items-center justify-center gap-2 border-r border-[#e7ebf4] px-2 py-5 sm:flex-row sm:gap-3 sm:px-4 md:justify-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#e8f8eb] text-[#32a34a] sm:h-14 sm:w-14">
                  <CheckCircle2 className="w-6 h-6 stroke-[1.8]" />
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-none text-[#071844] sm:text-[25px]">
                    98%
                  </div>
                  <div className="mt-2 text-[11px] font-medium leading-4 text-[#607092] sm:text-[12px]">
                    <span className="sm:hidden">Completion<br />Rate</span>
                    <span className="hidden sm:inline">Completion Rate</span>
                  </div>
                </div>
              </div>

              {/* Customer Rating */}
              <div className="flex flex-col items-center justify-center gap-2 px-2 py-5 sm:flex-row sm:gap-3 sm:px-4 md:justify-start">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#fff4e5] text-[#f5a13b] sm:h-14 sm:w-14">
                  <Star className="w-6 h-6 fill-[#f5a13b] text-[#f5a13b]" />
                </div>
                <div>
                  <div className="text-[22px] font-bold leading-none text-[#071844] sm:text-[25px]">
                    4.8
                  </div>
                  <div className="mt-2 text-[11px] font-medium leading-4 text-[#607092] sm:text-[12px]">
                    <span className="sm:hidden">Rating</span>
                    <span className="hidden sm:inline">Customer Rating</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ==================================================
               ORDERS LISTING CONTENT
          =================================================== */}
          <section className="px-5 pb-24 pt-8 md:px-8 md:pb-10 md:pt-12 lg:px-10">
            {/* Tabs & Search Bar */}
            <div className="mb-5 flex flex-col gap-4 lg:mb-8 lg:flex-row lg:items-center lg:justify-between">
              {/* Tabs */}
              <div className="grid grid-cols-3 gap-2 md:flex md:flex-wrap">
                <button
                  onClick={() => {
                    setFilterTab('active');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[13px] font-semibold transition-all cursor-pointer md:px-4 ${filterTab === 'active'
                      ? 'bg-[#102e78] text-white shadow-lg shadow-blue-900/10'
                      : 'border border-[#dfe4ef] bg-white text-[#24365f] hover:border-[#bdc8e0] hover:bg-[#fafbff]'
                    }`}
                >
                  <span>Active Orders</span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${filterTab === 'active' ? 'bg-white/20 text-white' : 'bg-[#f3f5f9] text-[#536486]'
                      }`}
                  >
                    {activeOrders.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setFilterTab('completed');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[13px] font-medium transition-all cursor-pointer md:px-4 ${filterTab === 'completed'
                      ? 'bg-[#102e78] text-white shadow-lg shadow-blue-900/10'
                      : 'border border-[#dfe4ef] bg-white text-[#24365f] hover:border-[#bdc8e0] hover:bg-[#fafbff]'
                    }`}
                >
                  <span>Past History</span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${filterTab === 'completed' ? 'bg-white/20 text-white' : 'bg-[#f3f5f9] text-[#536486]'
                      }`}
                  >
                    {completedOrders.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    setFilterTab('all');
                    setCurrentPage(1);
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-3.5 text-[13px] font-medium transition-all cursor-pointer md:px-4 ${filterTab === 'all'
                      ? 'bg-[#102e78] text-white shadow-lg shadow-blue-900/10'
                      : 'border border-[#dfe4ef] bg-white text-[#24365f] hover:border-[#bdc8e0] hover:bg-[#fafbff]'
                    }`}
                >
                  <span>All Orders</span>
                  <span
                    className={`flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[11px] font-bold ${filterTab === 'all' ? 'bg-white/20 text-white' : 'bg-[#f3f5f9] text-[#536486]'
                      }`}
                  >
                    {orders.length}
                  </span>
                </button>
              </div>

              {/* Search */}
              <div className="flex w-full gap-3 lg:w-auto">
                <div className="relative flex-1 lg:w-[285px]">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-[#8090b2] w-5 h-5 pointer-events-none" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    placeholder="Search by Order ID or item..."
                    className="h-12 w-full rounded-xl border border-[#dce2ee] bg-white pl-12 pr-4 text-[14px] text-[#1d2f5c] outline-none placeholder:text-[#8793ae] focus:border-[#8296d0] focus:ring-4 focus:ring-[#315bdc]/5"
                  />
                </div>

                <button
                  onClick={() => {
                    setSearchQuery('');
                    setFilterTab('all');
                  }}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-[#dce2ee] bg-white text-[#263d78] transition hover:bg-[#f7f9ff] cursor-pointer shadow-xs"
                  title="Reset filters"
                >
                  <Filter className="w-5 h-5 stroke-[1.8]" />
                </button>
              </div>
            </div>

            {/* ==================================================
                 ORDER GRID
            =================================================== */}
            {paginatedOrders.length === 0 ? (
              <div className="text-center py-16 bg-white rounded-3xl border border-dashed border-[#dce2ee] p-8 space-y-4">
                <div className="w-16 h-16 bg-[#eaf1ff] text-[#102e78] rounded-2xl flex items-center justify-center mx-auto shadow-xs">
                  <Package className="w-8 h-8 stroke-[1.8]" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-base font-bold text-[#071844]">No orders found</h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    {searchQuery ? 'No orders match your search query.' : 'You do not have any orders in this category.'}
                  </p>
                </div>
                <button
                  onClick={onOpenBookNow}
                  className="mt-2 bg-[#102e78] hover:bg-[#0c235c] text-white px-6 py-3 rounded-xl text-xs font-bold shadow-md cursor-pointer transition-all"
                >
                  Book New Collection
                </button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3 md:gap-5">
                {paginatedOrders.map((order, idx) => {
                  const orderId = order.publicId || order.orderNumber || order.id || (order as any)._id || `order-${idx}`;
                  const itemKey = `${orderId}-${idx}`;
                  const mainItemName = (order.items || [])[0]?.name || 'Standard Laundry Service';
                  const moreItemsCount = (order.items || []).length > 1 ? ` +${(order.items || []).length - 1} more` : '';
                  const hasPendingCharge = order.additionalCharge && order.additionalCharge.status === 'pending';

                  return (
                    <article
                      key={itemKey}
                      onClick={() => {
                        setSelectedOrderIdState(orderId);
                        setActiveSubTab('details');
                      }}
                      className="order-card rounded-2xl border border-[#e7eaf2] bg-white p-4 sm:p-5 shadow-card hover:border-[#102e78]/40 hover:shadow-lg transition-all cursor-pointer select-none group"
                    >
                      <div className="relative flex items-center gap-4 md:gap-5">
                        {/* Icon */}
                        <div className={`flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-full ${getStatusIconStyle(order.status)} group-hover:scale-105 transition-transform`}>
                          <Truck className="w-7 h-7 sm:w-8 sm:h-8 stroke-[1.7]" />
                        </div>

                        {/* Content */}
                        <div className="min-w-0 flex-1">
                          {/* Top Row: Order ID, Service, Price & Badge */}
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <h3 className="text-[16px] sm:text-[17px] font-bold text-[#071844] group-hover:text-[#102e78] transition-colors">
                                Order #{orderId}
                              </h3>
                              <p className="mt-0.5 text-[13px] sm:text-[14px] text-[#253866] truncate">
                                {mainItemName}{moreItemsCount}
                              </p>
                              <p className="mt-1 text-[15px] font-extrabold text-[#071844]">
                                £{Number(order.total ?? (order as any).total_price ?? (order as any).amount ?? 0).toFixed(2)}
                              </p>

                              {/* Instruction badges */}
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {order.deliveryInstructionType === 'LEAVE_AT_DOOR' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 text-[10px] font-bold border border-amber-200">
                                    <Truck className="w-3 h-3 text-amber-600" />
                                    Leave at Door (Photo Proof)
                                  </span>
                                )}
                                {order.pickupInstructionType === 'OUTSIDE' && (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 text-[10px] font-bold border border-blue-200">
                                    <Navigation className="w-3 h-3 text-blue-600" />
                                    Pickup Outside
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex flex-col items-end gap-1.5 shrink-0">
                              <span className={`rounded-full px-3 py-1 text-[9px] sm:text-[10px] font-bold uppercase tracking-wide ${getStatusBadgeStyle(order.status)}`}>
                                {isOrderCompleted(order.status)
                                  ? 'Completed'
                                  : (order.status === 'pending_payment' || order.status === 'payment_failed' || order.paymentStatus === 'Failed')
                                    ? 'Payment Failed'
                                    : order.statusLabel}
                              </span>
                              {order.sla && (
                                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider ${
                                  order.sla.status === 'BREACHED' || (order.sla as any).isBreached
                                    ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                    : order.sla.status === 'AT_RISK' || (order.sla as any).isAtRisk
                                      ? 'bg-amber-100 text-amber-800 border border-amber-200 animate-pulse'
                                      : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                }`}>
                                  <Clock className="w-2.5 h-2.5" />
                                  {order.sla.status === 'BREACHED' || (order.sla as any).isBreached ? 'SLA Breached' : order.sla.status === 'AT_RISK' || (order.sla as any).isAtRisk ? 'SLA At Risk' : 'SLA On Time'}
                                </span>
                              )}
                              <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-[#102e78] group-hover:translate-x-1 transition-all" />
                            </div>
                          </div>

                          {/* Pickup Failed Alert */}
                          {order.status === 'pickup_failed' && (
                            <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900 font-semibold">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span className="text-[11px]">Collection Failed: {(order as any).lastPickupFailureReason?.replace(/_/g, ' ') || 'Action Needed'}</span>
                              </div>
                              <span className="font-bold text-[11px] text-rose-700 underline">Reschedule Slot →</span>
                            </div>
                          )}

                          {/* Unpaid / Failed Payment Alert */}
                          {(order.status === 'pending_payment' || order.status === 'payment_failed' || order.paymentStatus === 'Failed') && (
                            <div
                              className="mt-2.5 p-3 bg-rose-50/90 border border-rose-200 rounded-xl space-y-2 text-xs"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="flex items-center gap-1.5 text-rose-900 font-bold">
                                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                                <span>Payment Unsuccessful / Pending</span>
                              </div>
                              <p className="text-[11px] text-rose-700 leading-tight">
                                Payment was not completed. Complete payment to proceed with collection or cancel this order.
                              </p>
                              <div className="flex flex-wrap items-center gap-2 pt-1">
                                <button
                                  type="button"
                                  disabled={retryingOrderId === orderId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleRetryPayment(order);
                                  }}
                                  className="flex-1 py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[11px] font-bold shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                                >
                                  {retryingOrderId === orderId ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <CreditCard className="w-3.5 h-3.5" />
                                  )}
                                  <span>{retryingOrderId === orderId ? 'Redirecting...' : 'Complete Payment (Pay Now)'}</span>
                                </button>
                                <button
                                  type="button"
                                  disabled={cancellingOrderId === orderId}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCancelUnpaidOrder(order);
                                  }}
                                  className="py-2 px-3 bg-white border border-rose-200 text-rose-700 hover:bg-rose-100 rounded-lg text-[11px] font-bold transition-all cursor-pointer disabled:opacity-50"
                                >
                                  {cancellingOrderId === orderId ? 'Cancelling...' : 'Cancel Order'}
                                </button>
                              </div>
                            </div>
                          )}

                          {/* Delivery Failed Alert */}
                          {order.status === 'delivery_failed' && (
                            <div className="mt-2.5 p-2 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-900 font-semibold">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span className="text-[11px]">Delivery Failed: {(order as any).lastDeliveryFailureReason?.replace(/_/g, ' ') || 'Action Needed'}</span>
                              </div>
                              <span className="font-bold text-[11px] text-rose-700 underline">Reschedule Delivery →</span>
                            </div>
                          )}

                          {/* Pending Charge Notification */}
                          {hasPendingCharge && (
                            <div className="mt-2.5 p-2 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-900 font-semibold">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span className="text-[11px]">Weight Adjustment</span>
                              </div>
                              <span className="font-bold text-[11px]">+£{Number(order.additionalCharge?.additionalAmount || 0).toFixed(2)}</span>
                            </div>
                          )}

                          {/* Quick In-App PIN Security Pill */}
                          {Boolean(order.pickup_pin || order.pickup_otp) && ['booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress'].includes(order.status) && (
                            <div className="mt-2 p-1.5 px-2.5 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-blue-900 font-semibold">
                                <ShieldCheck className="w-3.5 h-3.5 text-[#102e78]" />
                                <span className="text-[11px]">Collection PIN:</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {String(order.pickup_pin || order.pickup_otp || '').split('').map((char, i) => (
                                  <span key={i} className="w-4 h-5 rounded bg-white border border-blue-200 text-[#102e78] font-mono font-black text-[10px] flex items-center justify-center shadow-2xs">
                                    {char}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {Boolean(order.delivery_pin || order.delivery_otp) && ['ready_for_delivery', 'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery', 'delivery_in_progress'].includes(order.status) && (
                            <div className="mt-2 p-1.5 px-2.5 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs">
                              <div className="flex items-center gap-1.5 text-emerald-900 font-semibold">
                                <Key className="w-3.5 h-3.5 text-emerald-600" />
                                <span className="text-[11px]">Delivery PIN:</span>
                              </div>
                              <div className="flex items-center gap-0.5">
                                {String(order.delivery_pin || order.delivery_otp || '').split('').map((char, i) => (
                                  <span key={i} className="w-4 h-5 rounded bg-white border border-emerald-200 text-emerald-700 font-mono font-black text-[10px] flex items-center justify-center shadow-2xs">
                                    {char}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {/* ==================================================
                 FEATURE STRIP (Desktop)
            =================================================== */}
            <div className="mt-9 hidden overflow-hidden rounded-2xl border border-[#e5e8f5] bg-gradient-to-r from-[#f7f5ff] via-[#f7f9ff] to-[#f5f8ff] lg:block">
              <div className="grid grid-cols-4">
                {/* Feature 1 */}
                <div className="flex items-center gap-4 px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d7caff] bg-white text-[#5c45e9]">
                    <Truck className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#10265e]">Real-time Tracking</h4>
                    <p className="mt-1 text-[11px] leading-4 text-[#637194]">
                      Track your order <br /> at every step
                    </p>
                  </div>
                </div>

                {/* Feature 2 */}
                <div className="flex items-center gap-4 border-l border-[#e5e8f5] px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#cbd8ff] bg-white text-[#3264e6]">
                    <FileText className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#10265e]">Digital Invoices</h4>
                    <p className="mt-1 text-[11px] leading-4 text-[#637194]">
                      View & download <br /> official invoices
                    </p>
                  </div>
                </div>

                {/* Feature 3 */}
                <div className="flex items-center gap-4 border-l border-[#e5e8f5] px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#c9ecd2] bg-white text-[#2aa149]">
                    <Calendar className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#10265e]">Reschedule Easily</h4>
                    <p className="mt-1 text-[11px] leading-4 text-[#637194]">
                      Change your slot <br /> anytime
                    </p>
                  </div>
                </div>

                {/* Feature 4 */}
                <div className="flex items-center gap-4 border-l border-[#e5e8f5] px-6 py-6">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-[#d8cfff] bg-white text-[#5b45e8]">
                    <Headphones className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  <div>
                    <h4 className="text-[12px] font-bold text-[#10265e]">Need Help?</h4>
                    <p className="mt-1 text-[11px] leading-4 text-[#637194]">
                      Our support team is <br /> here for you
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* ==================================================
                 PAGINATION
            =================================================== */}
            {totalPages > 1 && (
              <div className="mt-7 flex items-center justify-center gap-3">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ee] bg-white text-[#172e6e] transition hover:bg-[#f5f7ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                {Array.from({ length: totalPages }, (_, idx) => idx + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition-all cursor-pointer ${currentPage === pageNum
                        ? 'bg-[#102e78] text-white shadow-md'
                        : 'border border-[#e1e5ee] bg-white text-[#172e6e] hover:bg-[#f5f7ff]'
                      }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-lg border border-[#e1e5ee] bg-white text-[#172e6e] transition hover:bg-[#f5f7ff] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </section>
        </main>
      </div>

      {/* =========================================================================
          FULL-SCREEN ORDER DETAIL & LIVE JOURNEY MODAL
      ========================================================================= */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-0 md:p-6 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-[#f8fafc] w-full min-h-screen md:min-h-0 md:h-[92vh] md:max-w-4xl md:rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-gray-100 animate-in slide-in-from-bottom duration-300">
            {/* Modal Top Bar */}
            <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between shadow-xs">
              <div className="flex items-center gap-3">
                <span className="text-base font-extrabold text-[#091942]">Order #{selectedOrder.id}</span>
                <span className={`text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider ${getStatusBadgeStyle(selectedOrder.status)}`}>
                  {isOrderCompleted(selectedOrder.status) || selectedJourney?.isAllCompleted
                    ? 'Completed'
                    : (selectedOrder.status === 'pending_payment' || selectedOrder.status === 'payment_failed' || selectedOrder.paymentStatus === 'Failed')
                      ? 'Payment Failed'
                      : selectedOrder.statusLabel}
                </span>
              </div>
              <button
                onClick={() => setSelectedOrderIdState(null)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Modal Content */}
            <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6">
              {/* Header & Quick Action Pills */}
              <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-gray-100">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-heading font-extrabold text-gray-900">Order #{selectedOrder.id}</h2>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Booked on {new Date(selectedOrder.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => setActiveSubTab('tracking')}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer ${activeSubTab === 'tracking'
                        ? 'bg-[#102e78] text-white'
                        : 'bg-white border border-[#dce2ee] text-[#102e78] hover:bg-slate-50'
                      }`}
                  >
                    <Truck className="w-3.5 h-3.5" />
                    <span>Track Live GPS</span>
                  </button>

                  <button
                    onClick={() => onOpenInvoice(selectedOrder)}
                    className="bg-white hover:bg-slate-50 text-gray-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-[#dce2ee] shadow-xs"
                  >
                    <FileText className="w-3.5 h-3.5 text-[#102e78]" />
                    <span>Invoice</span>
                  </button>
                </div>
              </div>

              {/* Tab Selector */}
              <div className="flex border-b border-gray-100 mt-2">
                <button
                  type="button"
                  onClick={() => setActiveSubTab('details')}
                  className={`flex-1 pb-3 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${activeSubTab === 'details'
                      ? 'border-[#102e78] text-[#102e78]'
                      : 'border-transparent text-gray-400 hover:text-[#102e78]'
                    }`}
                >
                  Order Details & Bill
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('tracking')}
                  className={`flex-1 pb-3 text-xs font-bold border-b-2 text-center transition-all cursor-pointer ${activeSubTab === 'tracking'
                      ? 'border-[#102e78] text-[#102e78]'
                      : 'border-transparent text-gray-400 hover:text-[#102e78]'
                    }`}
                >
                  Live Journey & Timeline
                </button>
              </div>

              {activeSubTab === 'details' ? (
                <>
                  {/* Unpaid / Failed Payment Alert in Modal */}
                  {(selectedOrder.status === 'pending_payment' || selectedOrder.status === 'payment_failed' || selectedOrder.paymentStatus === 'Failed') && (
                    <div className="p-4 sm:p-5 bg-rose-50 border-2 border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">
                            Payment Unsuccessful / Pending
                          </span>
                          <p className="text-xs text-rose-800 mt-0.5">
                            This order will not be processed until payment is completed. Complete the payment now to confirm collection or cancel this order.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto shrink-0">
                        <button
                          type="button"
                          disabled={retryingOrderId === selectedOrder.id}
                          onClick={() => handleRetryPayment(selectedOrder)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 flex items-center justify-center gap-1.5"
                        >
                          {retryingOrderId === selectedOrder.id ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                          ) : (
                            <CreditCard className="w-4 h-4" />
                          )}
                          <span>{retryingOrderId === selectedOrder.id ? 'Redirecting...' : 'Complete Payment (Pay Now)'}</span>
                        </button>
                        <button
                          type="button"
                          disabled={cancellingOrderId === selectedOrder.id}
                          onClick={() => handleCancelUnpaidOrder(selectedOrder)}
                          className="flex-1 sm:flex-initial px-4 py-2.5 bg-white border border-rose-300 text-rose-700 hover:bg-rose-100 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98"
                        >
                          {cancellingOrderId === selectedOrder.id ? 'Cancelling...' : 'Cancel Order'}
                        </button>
                      </div>
                    </div>
                  )}
                  {/* Failed Attempt Alerts & Rescheduling */}
                  {selectedOrder.status === 'pickup_failed' && (
                    <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">
                            Collection Attempt Unsuccessful
                          </span>
                          <p className="text-xs text-rose-800 mt-0.5">
                            Reason: {(selectedOrder as any).lastPickupFailureReason?.replace(/_/g, ' ') || 'Courier was unable to reach you or access property'}.
                          </p>
                        </div>
                      </div>
                      {Boolean(onOpenRescheduleCancel) && (
                        <button
                          type="button"
                          onClick={() => onOpenRescheduleCancel(selectedOrder, 'reschedule')}
                          className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 shrink-0 text-center"
                        >
                          Reschedule Pickup Window
                        </button>
                      )}
                    </div>
                  )}

                  {selectedOrder.status === 'delivery_failed' && (
                    <div className="p-4 sm:p-5 bg-rose-50 border border-rose-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <AlertTriangle className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-rose-900 block">
                            Delivery Attempt Unsuccessful
                          </span>
                          <p className="text-xs text-rose-800 mt-0.5">
                            Reason: {(selectedOrder as any).lastDeliveryFailureReason?.replace(/_/g, ' ') || 'Courier was unable to complete delivery'}.
                          </p>
                        </div>
                      </div>
                      {Boolean(onOpenRescheduleCancel) && (
                        <button
                          type="button"
                          onClick={() => onOpenRescheduleCancel(selectedOrder, 'reschedule')}
                          className="w-full sm:w-auto px-4 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-98 shrink-0 text-center"
                        >
                          Reschedule Delivery Window
                        </button>
                      )}
                    </div>
                  )}

                  {/* Collection Pickup Security PIN */}
                  {Boolean(selectedOrder.pickup_pin || selectedOrder.pickup_otp) && ['booking_confirmed', 'collection_scheduled', 'driver_assigned', 'pickup_in_progress'].includes(selectedOrder.status) && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-[#102e78] text-white flex items-center justify-center shrink-0 shadow-md">
                          <ShieldCheck className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-[#102e78]">
                              In-App Collection PIN
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-200/70 text-blue-900 rounded-full">
                              In-App Only • No SMS
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Share this 6-digit PIN with your driver when they arrive to collect your bags. Never shared via SMS.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center sm:items-end w-full sm:w-auto bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-blue-100">
                        <span className="text-xs text-slate-400 font-medium mb-1.5">Your 6-digit PIN</span>
                        <div className="flex items-center gap-1.5">
                          {String(selectedOrder.pickup_pin || selectedOrder.pickup_otp || '').split('').map((char, i) => (
                            <span
                              key={i}
                              className="w-8 h-10 sm:w-9 sm:h-11 bg-white border-2 border-blue-300 text-[#102e78] font-mono font-black text-xl rounded-xl flex items-center justify-center shadow-xs"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Leave at Door Delivery Banner */}
                  {selectedOrder.deliveryInstructionType === 'LEAVE_AT_DOOR' && ['ready_for_delivery', 'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery', 'delivery_in_progress'].includes(selectedOrder.status) && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl flex items-center gap-3.5 shadow-sm">
                      <div className="w-11 h-11 rounded-xl bg-amber-600 text-white flex items-center justify-center shrink-0 shadow-md">
                        <Truck className="w-6 h-6 stroke-[2.2]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-900">
                            Leave-at-Door Delivery Authorized
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-200 text-amber-900 rounded-full">
                            Photo Verified • No PIN Required
                          </span>
                        </div>
                        <p className="text-xs text-amber-800 mt-0.5">
                          Your courier will safely leave your clean items at your doorstep, record mandatory timestamped photographic evidence and GPS proof, and complete delivery.
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivery Security PIN */}
                  {selectedOrder.deliveryInstructionType !== 'LEAVE_AT_DOOR' && Boolean(selectedOrder.delivery_pin || selectedOrder.delivery_otp) && ['ready_for_delivery', 'waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery', 'delivery_in_progress'].includes(selectedOrder.status) && (
                    <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                      <div className="flex items-start sm:items-center gap-3.5">
                        <div className="w-11 h-11 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                          <Key className="w-6 h-6 stroke-[2.2]" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-900">
                              In-App Delivery PIN
                            </span>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-200/70 text-emerald-900 rounded-full">
                              In-App Only • No SMS
                            </span>
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5">
                            Share this 4-digit PIN with your driver only after you have safely received your clean items.
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-col items-center sm:items-end w-full sm:w-auto bg-white sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-emerald-100">
                        <span className="text-xs text-slate-400 font-medium mb-1.5">Delivery PIN (4 digits)</span>
                        <div className="flex items-center gap-1.5">
                          {String(selectedOrder.delivery_pin || selectedOrder.delivery_otp || '').split('').map((char, i) => (
                            <span
                              key={i}
                              className="w-8 h-10 sm:w-9 sm:h-11 bg-white border-2 border-emerald-300 text-emerald-700 font-mono font-black text-xl rounded-xl flex items-center justify-center shadow-xs"
                            >
                              {char}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Pending Charge Card (if applicable) */}
                  {selectedOrder.additionalCharge && selectedOrder.additionalCharge.status === 'pending' && (
                    <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                          <AlertTriangle className="w-4 h-4 text-amber-700" />
                          <span>Intake Weigh-in Approval Required</span>
                        </div>
                        <p className="text-xs text-amber-800">
                          {selectedOrder.additionalCharge.reason} (+£{Number(selectedOrder.additionalCharge.additionalAmount || 0).toFixed(2)})
                        </p>
                      </div>
                      <button
                        onClick={() => onOpenAdditionalCharge(selectedOrder)}
                        className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs cursor-pointer shrink-0"
                      >
                        Review & Authorize
                      </button>
                    </div>
                  )}

                  {/* Modify Order Options (Reschedule / Cancel) */}
                  {['booking_confirmed', 'collection_scheduled'].includes(selectedOrder.status) && (
                    <div className="p-4 bg-white border border-gray-100 rounded-2xl flex flex-wrap items-center justify-between gap-3 text-xs shadow-xs">
                      <div>
                        <span className="font-bold text-gray-800 block">Need to change your collection slot?</span>
                        <p className="text-gray-500 text-[11px]">Free changes up to 1 hour before courier arrival.</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => onOpenRescheduleCancel(selectedOrder, 'reschedule')}
                          className="px-3.5 py-1.5 bg-white border border-gray-200 hover:border-[#102e78] text-gray-800 rounded-xl font-bold cursor-pointer transition-colors shadow-2xs"
                        >
                          Reschedule Slot
                        </button>
                        <button
                          onClick={() => onOpenRescheduleCancel(selectedOrder, 'cancel')}
                          className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl font-bold cursor-pointer transition-colors"
                        >
                          Cancel Order
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Courier Card (if active) */}
                  {(selectedOrder.driver || (selectedOrder as any).driver_name) && (() => {
                    const driverName = selectedOrder.driver?.name || (selectedOrder as any).driver_name || 'Assigned Driver';
                    const driverPhone = selectedOrder.driver?.phone || (selectedOrder as any).driver_phone;
                    const driverVehicle = selectedOrder.driver?.vehicle || 'Delivery Vehicle';
                    const rating = selectedOrder.driver?.rating || 4.9;

                    return (
                      <div className="p-4 bg-[#eaf1ff] border border-[#cbd8ff] rounded-2xl flex items-center justify-between shadow-xs">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[#102e78] text-white flex items-center justify-center font-bold text-sm shadow-sm">
                            {driverName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-gray-900 block">{driverName}</span>
                            <span className="text-[11px] text-gray-500">
                              {driverVehicle} • {rating} ★
                            </span>
                          </div>
                        </div>
                        {driverPhone ? (
                          <a
                            href={`tel:${driverPhone}`}
                            className="px-3 py-2 bg-white hover:bg-gray-50 text-[#102e78] rounded-xl shadow-xs transition-colors border border-[#cbd8ff] flex items-center gap-1.5 font-bold text-xs cursor-pointer"
                            title="Call Courier"
                          >
                            <Phone className="w-3.5 h-3.5 text-[#102e78]" />
                            <span>Call Driver</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-gray-400 font-medium">Assigned</span>
                        )}
                      </div>
                    );
                  })()}

                  {/* Collection Slot & Delivery Address Logistics Card */}
                  <div className="p-4 sm:p-5 bg-white rounded-2xl border border-gray-100 shadow-xs space-y-3">
                    <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">
                      Collection & Delivery Logistics
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Collection Slot info */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-[#eaf1ff] text-[#102e78] flex items-center justify-center shrink-0">
                          <Calendar className="w-4 h-4 stroke-[1.8]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Collection Slot
                          </span>
                          <span className="text-xs font-bold text-gray-900 block mt-0.5">
                            {selectedOrder.pickupDate || 'Scheduled'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {selectedOrder.pickupSlot || '10:00 AM – 12:00 PM'}
                          </span>
                          <span className="inline-block mt-1 text-[10px] font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                            {selectedOrder.pickupInstructionType === 'OUTSIDE' ? 'Collect Outside' : selectedOrder.pickupInstructionType === 'RECEPTION_PORTER' ? 'Reception/Porter' : 'Collect In Person'}
                          </span>
                        </div>
                      </div>

                      {/* Delivery Slot info */}
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center shrink-0">
                          <Truck className="w-4 h-4 stroke-[1.8]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Delivery Window
                          </span>
                          <span className="text-xs font-bold text-gray-900 block mt-0.5">
                            {selectedOrder.deliveryDate || 'Scheduled Turnaround'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {selectedOrder.deliverySlot || 'Standard Delivery'}
                          </span>
                          <span className={`inline-block mt-1 text-[10px] font-semibold px-2 py-0.5 rounded ${
                            selectedOrder.deliveryInstructionType === 'LEAVE_AT_DOOR'
                              ? 'text-amber-800 bg-amber-50 border border-amber-200'
                              : 'text-indigo-700 bg-indigo-50'
                          }`}>
                            {selectedOrder.deliveryInstructionType === 'LEAVE_AT_DOOR' ? 'Leave at Door (Photo Proof)' : selectedOrder.deliveryInstructionType === 'RECEPTION_PORTER' ? 'Reception/Porter' : 'Deliver In Person (PIN)'}
                          </span>
                        </div>
                      </div>

                      {/* Address info */}
                      <div className="sm:col-span-2 flex items-start gap-3 pt-1 border-t border-gray-100">
                        <div className="w-9 h-9 rounded-xl bg-[#eaf1ff] text-[#102e78] flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 stroke-[1.8]" />
                        </div>
                        <div>
                          <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
                            Service Address
                          </span>
                          <span className="text-xs font-semibold text-gray-800 block mt-0.5 leading-snug">
                            {selectedOrder.address}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-extrabold text-gray-400 uppercase tracking-wider">Garment Care Items & Inspection</h3>
                      {orderItems.length > 0 && (
                        <span className="text-[11px] font-bold text-[#102e78] bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                          {orderItems.length} Garments Tracked
                        </span>
                      )}
                    </div>

                    <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden divide-y divide-gray-100 shadow-xs">
                      {orderItems.length > 0 ? (
                        orderItems.map((item: any, idx: number) => {
                          const isQcPassed = item.qcStatus === 'PASSED' || item.qcStatus === 'pass';
                          const isRewash = item.qcStatus === 'REWASH' || item.qcStatus === 'fail' || item.rewashRequired;
                          return (
                            <div key={idx} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                              <div className="flex items-start sm:items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isRewash ? 'bg-purple-50 text-purple-600' : isQcPassed ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-50 text-gray-500'}`}>
                                  <Shirt className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-gray-900">{item.description || item.category || 'Garment'}</span>
                                    {item.color && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.color}</span>}
                                    {item.brand && <span className="text-[10px] text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">{item.brand}</span>}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-gray-400 mt-0.5">
                                    <span>Stage: <strong className="text-gray-700 capitalize">{(item.currentStage || 'Processing').replace(/_/g, ' ')}</strong></span>
                                    {item.conditionNotes && (
                                      <span>• Condition: <em className="text-amber-700">{item.conditionNotes}</em></span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  isRewash
                                    ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                    : isQcPassed
                                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                                }`}>
                                  {isRewash ? 'Rewash Required' : isQcPassed ? 'QC Passed' : 'Inspection Pending'}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        (selectedOrder.items || []).map((item, idx) => (
                          <div key={idx} className="p-4 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500 shrink-0">
                                <Package className="w-4 h-4" />
                              </div>
                              <div>
                                <span className="font-bold text-gray-900 block">{item.name}</span>
                                <span className="text-gray-400 text-[11px]">Qty: {item.quantity || 1} × £{Number(item.price || 0).toFixed(2)}</span>
                              </div>
                            </div>
                            <span className="font-extrabold text-gray-900">
                              £{(Number(item.quantity || 1) * Number(item.price || 0)).toFixed(2)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Pricing Summary */}
                  <div className="p-5 bg-white rounded-2xl border border-gray-100 space-y-2.5 text-xs shadow-xs">
                    <div className="flex justify-between text-gray-500">
                      <span>Subtotal</span>
                      <span>£{Number(selectedOrder.total ?? (selectedOrder as any).total_price ?? (selectedOrder as any).amount ?? 0).toFixed(2)}</span>
                    </div>
                    {selectedOrder.additionalCharge && selectedOrder.additionalCharge.status === 'paid' && (
                      <div className="flex justify-between text-amber-800 font-semibold">
                        <span>Additional Intake Weight Charge</span>
                        <span>+£{Number(selectedOrder.additionalCharge.additionalAmount || 0).toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-500">
                      <span>Collection & Next-Day Delivery</span>
                      <span className="text-emerald-600 font-bold">FREE</span>
                    </div>
                    <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-extrabold text-gray-900">
                      <span>Total Paid ({selectedOrder.paymentMethod?.toUpperCase() || 'CARD'})</span>
                      <span className="text-[#102e78]">
                        £{((Number(selectedOrder.total ?? (selectedOrder as any).total_price ?? (selectedOrder as any).amount ?? 0)) + (selectedOrder.additionalCharge?.status === 'paid' ? Number(selectedOrder.additionalCharge.additionalAmount || 0) : 0)).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons: Cancel Order & Repeat Order */}
                  <div className="pt-2 space-y-2">
                    {Boolean(onOpenRescheduleCancel) && !['washing', 'drying', 'folding_steaming', 'qc_ready', 'ready_for_delivery', 'out_for_delivery', 'delivered', 'cancelled'].includes(selectedOrder.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          onOpenRescheduleCancel(selectedOrder, 'cancel');
                        }}
                        className="w-full py-3 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                      >
                        <XCircle className="w-4 h-4 text-red-600" />
                        <span>Cancel This Order</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        onRepeatOrder(selectedOrder);
                        setSelectedOrderIdState(null);
                      }}
                      className="w-full py-3.5 bg-gradient-to-r from-[#102e78] to-[#1e4ab8] hover:from-[#0c235c] hover:to-[#15388F] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-98"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span>Repeat This Exact Order</span>
                    </button>
                  </div>
                </>
              ) : (
                /* Tracking & Journey Timeline */
                <div className="space-y-6">
                  {selectedJourney && (
                    <>
                      {/* Celebratory Order Completed Banner */}
                      {selectedJourney.isAllCompleted ? (
                        <div className="p-5 sm:p-6 bg-gradient-to-br from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border-2 border-emerald-500/40 rounded-3xl shadow-sm space-y-3">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3.5">
                              <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-600/30 shrink-0">
                                <CheckCircle2 className="w-7 h-7" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="text-base sm:text-lg font-black text-emerald-950">
                                    Order Completed 🎉
                                  </h3>
                                  <span className="px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider bg-emerald-600 text-white rounded-full">
                                    Completed
                                  </span>
                                </div>
                                <p className="text-xs text-emerald-800 mt-0.5">
                                  All 7 stages from booking confirmation to doorstep delivery have been completed successfully.
                                </p>
                              </div>
                            </div>
                            <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto bg-white/80 p-3 sm:p-2 sm:bg-transparent rounded-xl sm:rounded-none border border-emerald-200 sm:border-0">
                              <span className="text-[10px] uppercase font-bold text-emerald-700">Finished</span>
                              <span className="text-xs font-bold font-mono text-emerald-900">
                                {formatTimelineDate(selectedJourney.stages[6].timestamp || selectedOrder.delivered_at) || 'Completed'}
                              </span>
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* Active Live Journey Progress Card */
                        <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-50/90 to-indigo-50/70 border border-blue-200/80 rounded-2xl space-y-3 shadow-xs">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[#102e78] font-bold text-xs sm:text-sm">
                              <Navigation className="w-4 h-4 animate-spin text-[#285BEA]" />
                              <span>Live Order Journey & Timeline</span>
                            </div>
                            <span className="text-[11px] bg-white text-[#102e78] font-extrabold px-3 py-1 rounded-full shadow-2xs border border-blue-100 flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              Live Tracking 🟢
                            </span>
                          </div>

                          <div className="space-y-1.5 pt-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-extrabold text-[#102e78]">
                                Active Stage: {selectedJourney.currentStage.title}
                              </span>
                              <span className="text-slate-500 font-bold">
                                {selectedJourney.completedCount} of 7 Completed ({Math.round((selectedJourney.completedCount / 7) * 100)}%)
                              </span>
                            </div>
                            <div className="w-full bg-blue-200/60 rounded-full h-2 overflow-hidden">
                              <div
                                className="bg-gradient-to-r from-[#102e78] to-[#285BEA] h-2 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(12, Math.round((selectedJourney.completedCount / 7) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 7-Stage Chronological Journey Stepper */}
                      <div className="bg-white rounded-3xl border border-gray-100 p-5 sm:p-7 space-y-6 shadow-xs">
                        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                          <div>
                            <h3 className="text-sm font-extrabold text-[#091942] uppercase tracking-wider">
                              Live 7-Stage Order Journey
                            </h3>
                            <p className="text-xs text-gray-400 mt-0.5">
                              Real-time chronological progress from booking to final doorstep delivery.
                            </p>
                          </div>
                          <span className={`text-[11px] font-extrabold px-3 py-1 rounded-full ${selectedJourney.isAllCompleted
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-blue-50 text-[#102e78]'
                            }`}>
                            {selectedJourney.isAllCompleted ? '100% Completed' : `Stage ${selectedJourney.currentStage.stepNumber} of 7`}
                          </span>
                        </div>

                        <div className="relative pl-6 sm:pl-8 space-y-8 border-l-2 border-slate-200 ml-4 sm:ml-5">
                          {selectedJourney.stages.map((step) => {
                            const isDone = step.status === 'completed';
                            const isCurrent = step.status === 'in_progress';
                            const IconComponent = step.icon;

                            return (
                              <div key={step.id} className="relative group">
                                {/* Step Circle Indicator on timeline spine */}
                                <div className={`absolute -left-[35px] sm:-left-[43px] top-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${isDone
                                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                                    : isCurrent
                                      ? 'bg-[#102e78] border-[#102e78] text-white ring-4 ring-blue-100 animate-pulse'
                                      : 'bg-white border-slate-300 text-slate-400'
                                  }`}>
                                  {isDone ? (
                                    <Check className="w-4 h-4 stroke-[3]" />
                                  ) : (
                                    <IconComponent className="w-4 h-4 stroke-[2]" />
                                  )}
                                </div>

                                {/* Step Details Card */}
                                <div className={`p-4 rounded-2xl border transition-all ${isCurrent
                                    ? 'bg-gradient-to-br from-blue-50/60 to-indigo-50/30 border-blue-200 shadow-sm'
                                    : isDone
                                      ? 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
                                      : 'bg-white/50 border-slate-100 opacity-60'
                                  }`}>
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md ${isDone
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isCurrent
                                            ? 'bg-[#102e78] text-white'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                        Step {step.stepNumber}
                                      </span>
                                      <h4 className={`text-sm font-extrabold ${isDone ? 'text-gray-900' : isCurrent ? 'text-[#102e78]' : 'text-gray-500'
                                        }`}>
                                        {step.title}
                                      </h4>
                                    </div>

                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                      {step.metaBadge && (
                                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                          {step.metaBadge}
                                        </span>
                                      )}
                                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${isDone
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : isCurrent
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-slate-100 text-slate-400'
                                        }`}>
                                        {isDone ? 'Completed' : isCurrent ? 'In Progress' : 'Pending'}
                                      </span>
                                    </div>
                                  </div>

                                  {/* Description matching user requirement */}
                                  <p className={`text-xs mt-1.5 leading-relaxed ${isDone ? 'text-slate-700' : isCurrent ? 'text-blue-900 font-medium' : 'text-slate-400'
                                    }`}>
                                    {step.description}
                                  </p>

                                  {/* In-App Helper Card for OTP verification during pickup */}
                                  {step.id === 'pickup_completed' && isCurrent && (selectedOrder.pickup_pin || selectedOrder.pickup_otp) && (
                                    <div className="mt-3 p-3 bg-white border border-blue-200 rounded-xl flex items-center justify-between shadow-2xs">
                                      <div className="flex items-center gap-2">
                                        <ShieldCheck className="w-4 h-4 text-[#102e78]" />
                                        <span className="text-xs font-bold text-[#102e78]">Your Pickup PIN:</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {String(selectedOrder.pickup_pin || selectedOrder.pickup_otp || '').split('').map((char, i) => (
                                          <span
                                            key={i}
                                            className="w-6 h-8 sm:w-7 sm:h-9 bg-blue-50 border border-blue-200 text-[#102e78] font-mono font-black text-sm sm:text-base rounded-md sm:rounded-lg flex items-center justify-center shadow-2xs"
                                          >
                                            {char}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* In-App Helper Card for Delivery PIN verification */}
                                  {step.id === 'delivered_at_doorstep' && isCurrent && (selectedOrder.delivery_pin || selectedOrder.delivery_otp) && (
                                    <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-xl flex items-center justify-between shadow-2xs">
                                      <div className="flex items-center gap-2">
                                        <Key className="w-4 h-4 text-emerald-700" />
                                        <span className="text-xs font-bold text-emerald-900">Your Delivery PIN:</span>
                                      </div>
                                      <div className="flex items-center gap-1">
                                        {String(selectedOrder.delivery_pin || selectedOrder.delivery_otp || '').split('').map((char, i) => (
                                          <span
                                            key={i}
                                            className="w-6 h-8 sm:w-7 sm:h-9 bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono font-black text-sm sm:text-base rounded-md sm:rounded-lg flex items-center justify-center shadow-2xs"
                                          >
                                            {char}
                                          </span>
                                        ))}
                                      </div>
                                    </div>
                                  )}

                                  {/* Timestamp */}
                                  {step.timestamp && (
                                    <div className="flex items-center gap-1.5 mt-2.5 text-[11px] text-slate-400 font-medium">
                                      <Clock className="w-3 h-3 text-slate-400" />
                                      <span>{formatTimelineDate(step.timestamp)}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

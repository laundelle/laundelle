import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Trash2,
  Calendar,
  Clock,
  MapPin,
  Tag,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Plus,
  Minus,
  Check,
  ChevronDown,
  ChevronUp,
  CreditCard,
  Edit2,
  Shirt,
  CheckCircle2,
  Receipt,
  Navigation,
  AlertCircle,
  HelpCircle,
  User,
  Building2,
  Sparkles,
  Lock
} from 'lucide-react';
import { CartItem, UserAddress, Order } from '@laundelle/types';
import { dbCreateOrder, dbCreateAddress, dbFetchSlots, getStoredSession, apiFetch, authHeaders } from '@laundelle/api-client';
import { AddAddressModal } from './AddAddressModal';
import {
  ScheduleConfig,
  isPickupDateValid,
  isPickupTimeSlotValid,
  isDeliveryDateValid,
  isDeliveryTimeSlotValid,
  isScheduleValid,
  getAvailablePickupSlots,
  getAvailableDeliverySlots,
  getTodayYyyyMmDd,
  formatDateToYyyyMmDd,
  formatDateToDdMmYyyy,
  parseDateString,
} from '@laundelle/validations';

export type CheckoutStep = 'cart' | 'slots' | 'contact' | 'review' | 'payment';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CartItem[];
  onUpdateQuantity: (id: string, delta: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
  addresses: UserAddress[];
  onOrderPlaced: (order: Order) => void;
  isLoggedIn?: boolean;
  onRequireLogin?: () => void;
  onAddAddress?: () => void;
  onAddressAdded?: (address: UserAddress) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cart,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  addresses,
  onOrderPlaced,
  isLoggedIn,
  onRequireLogin,
  onAddAddress: _onAddAddress,
  onAddressAdded
}) => {
  // Step Navigation: 'cart' | 'slots' | 'contact' | 'review' | 'payment'
  const [currentStep, setCurrentStep] = useState<CheckoutStep>('cart');

  // Reset to cart or slots when opened
  useEffect(() => {
    if (isOpen) {
      if (cart.length > 0 && currentStep === 'cart') {
        // stay on cart or allow review
      }
    } else {
      setCurrentStep('cart');
      setSubmitError(null);
    }
  }, [isOpen]);

  // Session & Auth
  const session = getStoredSession();
  const isSessionAuthed = session?.isAuthenticated && session?.user && (!session?.user?.role || session?.user?.role === 'customer');
  const effectiveIsLoggedIn = Boolean(isLoggedIn || isSessionAuthed);

  // Address State
  const [internalAddresses, setInternalAddresses] = useState<UserAddress[]>(addresses);
  const [addressModalOpen, setAddressModalOpen] = useState(false);
  const [addressToEdit, setAddressToEdit] = useState<UserAddress | null>(null);
  const [selectedAddressId, setSelectedAddressId] = useState(
    addresses.find((a) => a.isDefault)?.id || addresses[0]?.id || ''
  );

  useEffect(() => {
    setInternalAddresses(addresses);
    if (addresses.length > 0 && !selectedAddressId) {
      const def = addresses.find((a) => a.isDefault) || addresses[0];
      setSelectedAddressId(def.id);
    }
  }, [addresses]);

  // Declared Item Count
  const [declaredItemCount, setDeclaredItemCount] = useState<string>('');

  // -------------------------------------------------------------
  // SCREEN 1: SLOTS STATE (DYNAMIC FROM PLANT MANAGER)
  // -------------------------------------------------------------
  const [pickupDate, setPickupDate] = useState('');
  const [pickupSlot, setPickupSlot] = useState('');
  const [pickupInstruction, setPickupInstruction] = useState<string>('Collect from me in person');

  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliverySlot, setDeliverySlot] = useState('');
  const [deliveryInstruction, setDeliveryInstruction] = useState<string>('Deliver to me in person');
  const [scheduleError, setScheduleError] = useState<string | null>(null);

  // Dynamic slots state from DB
  const [dynamicSlots, setDynamicSlots] = useState<any[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsLoadedPlantName, setSlotsLoadedPlantName] = useState<string | null>(null);

  const selectedAddress = useMemo(() => {
    return internalAddresses.find((a) => a.id === selectedAddressId) || internalAddresses[0] || null;
  }, [internalAddresses, selectedAddressId]);

  const currentPostcode = selectedAddress?.pincode || (selectedAddress as any)?.postcode || '';

  // Fetch dynamic slots for the selected address postcode
  useEffect(() => {
    let isMounted = true;
    const fetchManagerSlots = async () => {
      setSlotsLoading(true);
      try {
        const fetched = await dbFetchSlots(currentPostcode ? { postcode: currentPostcode } : undefined);
        if (isMounted) {
          setDynamicSlots(fetched);
          if (fetched.length > 0 && fetched[0].plant_name) {
            setSlotsLoadedPlantName(fetched[0].plant_name);
          } else {
            setSlotsLoadedPlantName(null);
          }
        }
      } catch (e) {
        console.error('Failed to load dynamic plant slots:', e);
      } finally {
        if (isMounted) setSlotsLoading(false);
      }
    };

    if (isOpen) {
      fetchManagerSlots();
    }
    return () => { isMounted = false; };
  }, [currentPostcode, isOpen]);

  // Derive dynamic pickup and delivery slots created by plant managers
  const dynamicPickupSlots = useMemo(() => {
    return dynamicSlots
      .filter((s) => s.isActive !== false && (s.slotType === 'both' || s.slotType === 'pickup' || s.type === 'both' || s.type === 'pickup' || !s.slotType))
      .map((s) => s.slot || `${s.startTime} - ${s.endTime}`);
  }, [dynamicSlots]);

  const dynamicDeliverySlots = useMemo(() => {
    return dynamicSlots
      .filter((s) => s.isActive !== false && (s.slotType === 'both' || s.slotType === 'delivery' || s.type === 'both' || s.type === 'delivery' || !s.slotType))
      .map((s) => s.slot || `${s.startTime} - ${s.endTime}`);
  }, [dynamicSlots]);

  const dynamicScheduleConfig: ScheduleConfig = useMemo(() => {
    return {
      minBookingLeadMinutes: 30,
      pickupSlots: dynamicPickupSlots,
      deliverySlots: dynamicDeliverySlots
    };
  }, [dynamicPickupSlots, dynamicDeliverySlots]);

  const todayYyyyMmDd = useMemo(() => getTodayYyyyMmDd(), []);

  const availablePickupSlots = useMemo(() => {
    return getAvailablePickupSlots(pickupDate, undefined, dynamicScheduleConfig);
  }, [pickupDate, dynamicScheduleConfig]);

  const availableDeliverySlots = useMemo(() => {
    return getAvailableDeliverySlots(pickupDate, pickupSlot, deliveryDate, undefined, dynamicScheduleConfig);
  }, [pickupDate, pickupSlot, deliveryDate, dynamicScheduleConfig]);

  const handlePickupDateChange = (newDate: string) => {
    setScheduleError(null);
    setPickupDate(newDate);
    if (pickupSlot) {
      const slotValidation = isPickupTimeSlotValid(newDate, pickupSlot, undefined, dynamicScheduleConfig);
      if (!slotValidation.valid) setPickupSlot('');
    }
    if (deliveryDate) {
      const dDateCheck = isDeliveryDateValid(newDate, deliveryDate, undefined, dynamicScheduleConfig);
      if (!dDateCheck.valid) {
        setDeliveryDate('');
        setDeliverySlot('');
      } else {
        const dSlotCheck = isDeliveryTimeSlotValid(newDate, pickupSlot, deliveryDate, deliverySlot, undefined, dynamicScheduleConfig);
        if (!dSlotCheck.valid) setDeliverySlot('');
      }
    }
  };

  const handlePickupSlotChange = (newSlot: string) => {
    setScheduleError(null);
    setPickupSlot(newSlot);
    if (deliveryDate && deliverySlot) {
      const dSlotCheck = isDeliveryTimeSlotValid(pickupDate, newSlot, deliveryDate, deliverySlot, undefined, dynamicScheduleConfig);
      if (!dSlotCheck.valid) setDeliverySlot('');
    }
  };

  const handleDeliveryDateChange = (newDate: string) => {
    setScheduleError(null);
    setDeliveryDate(newDate);
    if (deliverySlot) {
      const dSlotCheck = isDeliveryTimeSlotValid(pickupDate, pickupSlot, newDate, deliverySlot, undefined, dynamicScheduleConfig);
      if (!dSlotCheck.valid) setDeliverySlot('');
    }
  };

  const handleDeliverySlotChange = (newSlot: string) => {
    setScheduleError(null);
    setDeliverySlot(newSlot);
  };

  // Quick Day Selectors for Collection
  const tomorrowYyyyMmDd = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return getTodayYyyyMmDd(d);
  }, []);

  const deliveryTomorrowYyyyMmDd = useMemo(() => {
    const base = pickupDate ? (parseDateString(pickupDate)?.date || new Date()) : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + 1);
    return getTodayYyyyMmDd(d);
  }, [pickupDate]);

  const deliveryIn2DaysYyyyMmDd = useMemo(() => {
    const base = pickupDate ? (parseDateString(pickupDate)?.date || new Date()) : new Date();
    const d = new Date(base);
    d.setDate(d.getDate() + 2);
    return getTodayYyyyMmDd(d);
  }, [pickupDate]);

  // Quick Day Selectors for Collection
  const handleQuickCollectionDay = (offsetDays: number) => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    const dateStr = getTodayYyyyMmDd(d);
    handlePickupDateChange(dateStr);
  };

  // Quick Day Selectors for Delivery
  const handleQuickDeliveryDay = (offsetDays: number) => {
    const baseDate = pickupDate ? (parseDateString(pickupDate)?.date || new Date()) : new Date();
    const d = new Date(baseDate);
    d.setDate(d.getDate() + offsetDays);
    const dateStr = getTodayYyyyMmDd(d);
    handleDeliveryDateChange(dateStr);
  };

  // -------------------------------------------------------------
  // SCREEN 2: CONTACT DETAILS STATE
  // -------------------------------------------------------------
  const [accountType, setAccountType] = useState<'individual' | 'company'>('individual');
  const [firstName, setFirstName] = useState(() => {
    if (session?.user?.name) {
      return session.user.name.split(' ')[0] || '';
    }
    return '';
  });
  const [lastName, setLastName] = useState(() => {
    if (session?.user?.name) {
      return session.user.name.split(' ').slice(1).join(' ') || '';
    }
    return '';
  });
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState((session?.user as any)?.phone?.replace(/^\+44/, '') || '');
  const [email, setEmail] = useState(session?.user?.email || '');
  const [contactError, setContactError] = useState<string | null>(null);

  // Sync with session if user signs in while drawer is open
  useEffect(() => {
    if (session?.user) {
      if (!firstName && session.user.name) setFirstName(session.user.name.split(' ')[0] || '');
      if (!lastName && session.user.name) setLastName(session.user.name.split(' ').slice(1).join(' ') || '');
      if (!email && session.user.email) setEmail(session.user.email);
      if (!phone && (session.user as any).phone) setPhone((session.user as any).phone.replace(/^\+44/, ''));
    }
  }, [session]);

  // -------------------------------------------------------------
  // SCREEN 3: REVIEW, PRICING & TIP STATE
  // -------------------------------------------------------------
  const [couponCode, setCouponCode] = useState('');
  const [appliedDiscount, setAppliedDiscount] = useState<number>(0);
  const [couponError, setCouponError] = useState('');
  const [couponSuccess, setCouponSuccess] = useState('');
  const [driverTip, setDriverTip] = useState<number>(0);

  // Accordion Toggles
  const [howChargesWorkOpen, setHowChargesWorkOpen] = useState(true);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  // Financial Calculations
  const subtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cart]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * appliedDiscount) / 100 * 100) / 100;
  }, [subtotal, appliedDiscount]);

  // Small order fee: Minimum order value is £20.00.
  // If subtotal is below £20.00, top it up to £20.00 with small order fee.
  const smallOrderFee = useMemo(() => {
    if (subtotal <= 0) return 0;
    const threshold = 20.00;
    if (subtotal < threshold) {
      return Math.round((threshold - subtotal) * 100) / 100;
    }
    return 0;
  }, [subtotal]);

  // Fixed Service Fee
  const serviceFee = 3.49;
  // Collection & Delivery is FREE
  const collectionDeliveryFee = 0.00;

  // Estimated Total
  const estimatedTotal = useMemo(() => {
    return Math.max(0, subtotal - discountAmount + smallOrderFee + serviceFee + collectionDeliveryFee + driverTip);
  }, [subtotal, discountAmount, smallOrderFee, serviceFee, collectionDeliveryFee, driverTip]);

  const handleApplyCoupon = () => {
    setCouponError('');
    setCouponSuccess('');
    if (!couponCode.trim()) return;

    if (couponCode.trim().toUpperCase() === 'WELCOME20') {
      setAppliedDiscount(20);
      setCouponSuccess('20% discount applied successfully!');
    } else if (couponCode.trim().toUpperCase() === 'CLEAN10') {
      setAppliedDiscount(10);
      setCouponSuccess('10% discount applied successfully!');
    } else {
      setCouponError('Invalid promo code. Try WELCOME20 for 20% off items.');
    }
  };

  // -------------------------------------------------------------
  // SCREEN 4: PAYMENT STATE (CASH ON DELIVERY REMOVED)
  // -------------------------------------------------------------
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSaveAddress = async (newAddr: UserAddress) => {
    setInternalAddresses((prev) => {
      const exists = prev.some((a) => a.id === newAddr.id);
      let updated = exists
        ? prev.map((a) => (a.id === newAddr.id ? newAddr : a))
        : [...prev, newAddr];

      if (newAddr.isDefault) {
        updated = updated.map((a) => (a.id === newAddr.id ? a : { ...a, isDefault: false }));
      }
      return updated;
    });

    setSelectedAddressId(newAddr.id);

    try {
      const uId = session?.user?.id || 'guest';
      await dbCreateAddress(uId, newAddr);
    } catch (e) {
      console.error('Failed to save address to DB:', e);
    }

    if (onAddressAdded) {
      onAddressAdded(newAddr);
    }
  };

  // Step Validation Handlers
  const handleProceedFromSlots = () => {
    setScheduleError(null);
    if (!activeAddr) {
      setScheduleError('Please add or select your service location first.');
      return;
    }
    if (!pickupDate || !pickupSlot) {
      setScheduleError('Please select both collection day and time slot.');
      return;
    }
    if (!deliveryDate || !deliverySlot) {
      setScheduleError('Please select both delivery day and time slot.');
      return;
    }
    const scheduleValidation = isScheduleValid(pickupDate, pickupSlot, deliveryDate, deliverySlot, undefined, dynamicScheduleConfig);
    if (!scheduleValidation.valid) {
      setScheduleError(scheduleValidation.error || 'Please select a valid collection and delivery schedule.');
      return;
    }
    setCurrentStep('contact');
  };

  const handleProceedFromContact = () => {
    setContactError(null);
    if (!effectiveIsLoggedIn) {
      setContactError('Authentication required: Please log in or create an account to place an order.');
      if (onRequireLogin) onRequireLogin();
      return;
    }
    if (!firstName.trim()) {
      setContactError('First name is required.');
      return;
    }
    if (!phone.trim()) {
      setContactError('Mobile number is required for SMS delivery updates.');
      return;
    }
    if (!email.trim() || !email.includes('@')) {
      setContactError('A valid email address is required.');
      return;
    }
    if (!selectedAddressId && internalAddresses.length === 0) {
      setContactError('Please select a delivery address.');
      return;
    }
    setCurrentStep('review');
  };

  // Final Payment & Stripe Session Initialization (COD Removed!)
  const handleCompletePayment = async () => {
    if (!effectiveIsLoggedIn) {
      setSubmitError('You must be logged in to place an order. Please log in or create an account.');
      if (onRequireLogin) onRequireLogin();
      return;
    }
    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const selectedAddr = internalAddresses.find((a) => a.id === selectedAddressId) || internalAddresses[0];
      const addressStr = selectedAddr
        ? `${selectedAddr.flatNo}, ${selectedAddr.street}, ${selectedAddr.landmark ? selectedAddr.landmark + ', ' : ''}${selectedAddr.city} - ${selectedAddr.pincode}${selectedAddr.coordinates ? ` [GPS: ${selectedAddr.coordinates.lat.toFixed(5)}, ${selectedAddr.coordinates.lng.toFixed(5)}]` : ''
        }`
        : 'Doorstep Delivery Address';

      const newOrderId = `L2U-${Math.floor(10000 + Math.random() * 90000)}`;

      const newOrder: Order = {
        id: newOrderId,
        createdAt: new Date().toISOString(),
        items: [...cart],
        itemCount: cart.reduce((acc, i) => acc + i.quantity, 0),
        subtotal,
        discount: discountAmount,
        tax: 0,
        collectionFee: 0,
        deliveryFee: collectionDeliveryFee,
        expressFee: 0,
        serviceFee,
        smallOrderFee,
        driverTip,
        total: estimatedTotal,
        pickupDate: formatDateToDdMmYyyy(pickupDate),
        pickupSlot,
        pickupInstruction,
        pickupInstructionType: (pickupInstruction.toLowerCase().includes('outside') ? 'OUTSIDE' : pickupInstruction.toLowerCase().includes('reception') ? 'RECEPTION_PORTER' : 'IN_PERSON') as any,
        deliveryDate: formatDateToDdMmYyyy(deliveryDate),
        deliverySlot,
        deliveryInstruction,
        deliveryInstructionType: (deliveryInstruction.toLowerCase().includes('leave') || deliveryInstruction.toLowerCase().includes('door') ? 'LEAVE_AT_DOOR' : deliveryInstruction.toLowerCase().includes('reception') ? 'RECEPTION_PORTER' : 'IN_PERSON') as any,
        address: addressStr,
        addressLabel: selectedAddr?.label || 'Delivery Address',
        postcode: selectedAddr?.pincode || '',
        contactDetails: {
          accountType,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          companyName: accountType === 'company' ? companyName.trim() : undefined,
          phone: `+44${phone.replace(/^\+44/, '').trim()}`,
          email: email.trim(),
        },
        paymentMethod: 'Pay Online (Stripe)',
        paymentStatus: 'Pending',
        isPaid: false,
        status: 'pending_payment',
        statusLabel: 'Pending Payment Authorization',
        declaredItemCount: declaredItemCount ? parseInt(declaredItemCount, 10) || undefined : undefined,
        coordinates: selectedAddr?.coordinates || (selectedAddr?.latitude && selectedAddr?.longitude ? { lat: selectedAddr.latitude, lng: selectedAddr.longitude } : undefined),
        timeline: [
          { status: 'booking_confirmed', label: 'Order Created', completed: true, current: true, time: 'Just now' },
          { status: 'collection_scheduled', label: 'Collection Scheduled', completed: false },
          { status: 'laundry_collected', label: 'Laundry Collected', completed: false },
          { status: 'received_at_facility', label: 'Received at Facility', completed: false },
          { status: 'washing', label: 'Washing & Care', completed: false },
          { status: 'ready_for_delivery', label: 'Ready for Delivery', completed: false },
          { status: 'delivered', label: 'Delivered', completed: false },
        ]
      };

      // Request Stripe Checkout Session (order will be created ONLY when payment succeeds)
      const stripeRes = await apiFetch('/api/stripe/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          amount: estimatedTotal,
          customerEmail: email.trim() || session?.user?.email,
          userId: session?.user?.id || 'guest',
          orderPayload: newOrder,
          items: [
            ...cart.map((item) => ({
              name: item.name,
              price: item.price,
              quantity: item.quantity,
            })),
            ...(smallOrderFee > 0 ? [{ name: 'Small Order Fee (Under £20 minimum)', price: smallOrderFee, quantity: 1 }] : []),
            { name: 'Service Fee', price: serviceFee, quantity: 1 },
            ...(driverTip > 0 ? [{ name: 'Driver Tip', price: driverTip, quantity: 1 }] : [])
          ],
        }),
      });

      const sessionData = await stripeRes.json();
      if (!stripeRes.ok || !sessionData.url) {
        throw new Error(sessionData.error || 'Failed to initialize Stripe checkout session');
      }

      // 3. Close drawer and redirect directly to Stripe (cart preserved in storage until payment authorized)
      onClose();
      window.location.href = sessionData.url;
    } catch (err: any) {
      console.error('Order checkout error:', err);
      setSubmitError(err.message || 'Error processing payment. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  // Selected address for preview
  const activeAddr = internalAddresses.find((a) => a.id === selectedAddressId) || internalAddresses[0];

  return (
    <div className="fixed inset-0 z-[120] bg-[#f8fafc] overflow-y-auto min-h-screen flex flex-col animate-in fade-in-50 duration-200">
      {/* =========================================================================
          TOP NAVBAR: LAUNDELLE BRANDING & STEP INDICATOR
      ========================================================================= */}
      <header className="w-full bg-[#082b78] text-white px-4 sm:px-8 py-3.5 flex items-center justify-between shadow-md shrink-0 sticky top-0 z-30">
        <div className="flex items-center gap-4">
          {currentStep !== 'cart' && (
            <button
              type="button"
              onClick={() => {
                if (currentStep === 'payment') setCurrentStep('review');
                else if (currentStep === 'review') setCurrentStep('contact');
                else if (currentStep === 'contact') setCurrentStep('slots');
                else if (currentStep === 'slots') setCurrentStep('cart');
              }}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer flex items-center gap-1 text-xs font-semibold"
              title="Go back to previous screen"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          <div className="flex flex-col cursor-pointer" onClick={onClose}>
            <span className="font-serif text-lg sm:text-xl font-bold tracking-wider text-white">
              LAUNDELLE
            </span>
            <span className="text-[9px] sm:text-[10px] tracking-widest text-white/80 uppercase font-medium -mt-0.5">
              CARE THAT SHOWS
            </span>
          </div>
        </div>

        {/* Dynamic Stepper Header Pills for multi-screen navigation */}
        {currentStep !== 'cart' && cart.length > 0 && (
          <div className="hidden md:flex items-center gap-2 text-xs font-semibold text-white/80">
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${currentStep === 'slots' ? 'bg-white text-[#082b78] font-bold shadow-sm' : 'bg-white/10 text-white/90'
              }`}>
              1. Time Slots
            </span>
            <span className="text-white/40">›</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${currentStep === 'contact' ? 'bg-white text-[#082b78] font-bold shadow-sm' : 'bg-white/10 text-white/90'
              }`}>
              2. Contact Details
            </span>
            <span className="text-white/40">›</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${currentStep === 'review' ? 'bg-white text-[#082b78] font-bold shadow-sm' : 'bg-white/10 text-white/90'
              }`}>
              3. Review & Confirm
            </span>
            <span className="text-white/40">›</span>
            <span className={`px-2.5 py-1 rounded-full text-[11px] transition-all ${currentStep === 'payment' ? 'bg-white text-[#082b78] font-bold shadow-sm' : 'bg-white/10 text-white/90'
              }`}>
              4. Payment
            </span>
          </div>
        )}

        <div className="flex items-center gap-3">
          <div className="hidden xs:flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/90">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>100% Quality Care</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/20 bg-white/10 hover:bg-white/20 px-3 py-1.5 text-xs font-bold text-white flex items-center gap-1 transition-all cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span className="hidden sm:inline">Close</span>
          </button>
        </div>
      </header>

      {/* =========================================================================
          MAIN MULTI-SCREEN CONTENT
      ========================================================================= */}
      <main className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-6 sm:py-8 flex-1 flex flex-col justify-between">
        {cart.length === 0 ? (
          /* EMPTY CART SCREEN */
          <div className="rounded-3xl border border-gray-200/80 bg-white p-8 sm:p-14 text-center space-y-4 shadow-xs my-auto">
            <div className="w-20 h-20 rounded-3xl bg-[#eef4ff] text-[#1d5bd8] mx-auto flex items-center justify-center shadow-2xs">
              <Shirt className="w-10 h-10" />
            </div>
            <div className="space-y-1.5 max-w-md mx-auto">
              <h2 className="text-xl sm:text-2xl font-bold text-navy">
                Your cart is currently empty
              </h2>
              <p className="text-xs sm:text-sm text-gray-500 leading-relaxed">
                Explore our premium laundry and garment care services to add items.
              </p>
            </div>
            <div className="pt-2">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-navy hover:bg-[#072465] text-white text-xs sm:text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer active:scale-98"
              >
                <span>Browse Services</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* =========================================================================
                SCREEN 0: CART ITEMS REVIEW
            ========================================================================= */}
            {currentStep === 'cart' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy tracking-tight">
                      Laundry Cart
                    </h1>
                    <p className="text-xs sm:text-sm text-gray-500 mt-0.5">
                      Review your items before choosing time slots
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={onClearCart}
                    className="text-xs font-bold text-red-500 hover:text-red-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <span>Clear All</span>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Items List */}
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-xs flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap"
                    >
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-14 h-14 rounded-2xl bg-[#eef4ff] p-1 flex items-center justify-center shrink-0 overflow-hidden border border-blue-100/60 shadow-2xs">
                          {item.image ? (
                            <img
                              src={item.image}
                              alt={item.name}
                              className="w-full h-full object-contain drop-shadow-xs rounded-xl"
                            />
                          ) : (
                            <Shirt className="w-7 h-7 text-[#1d5bd8]" />
                          )}
                        </div>

                        <div>
                          <h3 className="text-sm sm:text-base font-bold text-navy leading-snug">
                            {item.name}
                          </h3>
                          <div className="text-xs text-gray-500 font-medium mt-0.5">
                            £{item.price.toFixed(2)}{' '}
                            <span className="text-gray-400 font-normal">
                              per {item.unit.replace('per ', '')}
                            </span>
                          </div>
                          {item.selectedOption && (
                            <span className="inline-block mt-1.5 text-[10px] font-bold bg-[#eef4ff] text-[#1d5bd8] px-2.5 py-0.5 rounded-md">
                              {item.selectedOption}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-3.5 sm:gap-6 ml-auto">
                        <div className="flex items-center gap-2 sm:gap-3 border border-gray-200 rounded-xl px-2.5 sm:px-3 py-1.5 bg-white shadow-2xs">
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, -1)}
                            className="p-1 text-gray-500 hover:text-navy cursor-pointer transition-colors"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs sm:text-sm font-bold text-navy flex items-center gap-1 min-w-[32px] justify-center">
                            {item.quantity}{' '}
                            <span className="text-[10px] text-gray-400 font-normal">
                              {item.unit.replace('per ', '')}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateQuantity(item.id, 1)}
                            className="p-1 text-gray-500 hover:text-navy cursor-pointer transition-colors"
                            aria-label="Increase quantity"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <span className="text-sm sm:text-base font-extrabold text-navy min-w-[60px] text-right">
                          £{(item.price * item.quantity).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="w-9 h-9 rounded-xl border border-gray-200 hover:border-red-200 hover:bg-red-50 text-gray-400 hover:text-red-600 flex items-center justify-center transition-all cursor-pointer shrink-0"
                          title="Remove Item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Declared Item Count (Optional/Helpful) */}
                <div className="rounded-2xl bg-white p-4 sm:p-5 shadow-xs border border-gray-100 space-y-2">
                  <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wider">
                    <Shirt className="w-4 h-4 text-[#1d5bd8]" />
                    <span>Estimated Total Items in Bag</span>
                  </div>
                  <div className="rounded-xl p-3 bg-[#f8fbff] border border-dashed border-[#d0e1fd] flex items-center gap-3">
                    <input
                      type="text"
                      value={declaredItemCount}
                      onChange={(e) => setDeclaredItemCount(e.target.value)}
                      placeholder="e.g. 7 (3 shirts, 4 pants)"
                      className="w-full bg-transparent text-xs sm:text-sm font-semibold placeholder:font-normal focus:outline-none text-navy placeholder:text-gray-400"
                    />
                  </div>
                  <p className="text-[11px] text-gray-400">
                    Optional: Helpful for our facility staff when weighing and counting garments.
                  </p>
                </div>

                {/* Subtotal Banner & Button to proceed */}
                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider block">Items Subtotal</span>
                      <span className="text-2xl font-extrabold text-[#03045E]">£{subtotal.toFixed(2)}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setCurrentStep('slots')}
                      className="px-8 py-3.5 bg-navy hover:bg-[#072465] text-white text-sm font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2 active:scale-98"
                    >
                      <span>Proceed to Time Slots</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 1: SELECT TIME SLOTS (DEDICATED SCREEN)
            ========================================================================= */}
            {currentStep === 'slots' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Mobile Stepper Header */}
                <div className="flex md:hidden items-center justify-between text-xs font-bold text-gray-400 pb-2 border-b border-gray-100">
                  <span className="text-[#1d5bd8]">Step 1 of 4: Select Time Slots</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('cart')}
                    className="text-gray-500 hover:text-navy underline"
                  >
                    View Bag ({cart.length})
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy tracking-tight">
                    Select time slots
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Select your preferred order collection and delivery time slots.
                  </p>
                </div>

                {/* 1. SERVICE LOCATION UI (Shown First) */}
                <div className="rounded-2xl border-2 border-blue-200 bg-[#f8fbff] p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between gap-3 flex-wrap sm:flex-nowrap">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#03045E] text-white flex items-center justify-center shrink-0 shadow-xs">
                        <MapPin className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-extrabold text-[#03045E]">1. Service Location</span>
                          {activeAddr?.pincode && (
                            <span className="font-mono text-xs font-extrabold bg-[#CAF0F8] text-[#03045E] px-2.5 py-0.5 rounded-md">
                              {activeAddr.pincode}
                            </span>
                          )}
                          {activeAddr && slotsLoadedPlantName ? (
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Covering Plant: {slotsLoadedPlantName}
                            </span>
                          ) : activeAddr && slotsLoading ? (
                            <span className="text-[10px] text-gray-400">Locating covering plant...</span>
                          ) : null}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          {activeAddr
                            ? `${activeAddr.flatNo ? activeAddr.flatNo + ', ' : ''}${activeAddr.street}, ${activeAddr.city}`
                            : 'Please add or select your delivery and collection address to load available time slots for your area.'}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-auto shrink-0">
                      {internalAddresses.length > 1 && (
                        <select
                          value={selectedAddressId}
                          onChange={(e) => setSelectedAddressId(e.target.value)}
                          className="h-10 px-3 rounded-xl border border-gray-300 text-xs font-bold text-navy bg-white focus:outline-none cursor-pointer shadow-2xs"
                        >
                          {internalAddresses.map(a => (
                            <option key={a.id} value={a.id}>
                              {a.label} ({a.pincode})
                            </option>
                          ))}
                        </select>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setAddressToEdit(null);
                          setAddressModalOpen(true);
                        }}
                        className="px-4 py-2.5 rounded-xl bg-[#03045E] hover:bg-[#023E8A] text-white text-xs font-bold transition-all shadow-xs cursor-pointer flex items-center gap-1.5"
                      >
                        <Plus className="w-4 h-4" />
                        <span>{activeAddr ? 'Change Address' : 'Add Service Location'}</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* 2. TIME SLOTS SECTION (Revealed ONLY after Service Location is set) */}
                {!activeAddr ? (
                  <div className="rounded-2xl border-2 border-dashed border-blue-200 bg-blue-50/50 p-8 text-center space-y-4">
                    <div className="w-12 h-12 rounded-full bg-blue-100 text-[#1d5bd8] flex items-center justify-center mx-auto">
                      <MapPin className="w-6 h-6 animate-bounce" />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-navy">Service Location Required First</h3>
                      <p className="text-xs text-gray-500">
                        Please add or select your service location above. Once your location is set, available pickup and delivery time slots for your area will be revealed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setAddressToEdit(null);
                        setAddressModalOpen(true);
                      }}
                      className="px-6 py-3 bg-[#03045E] hover:bg-[#023E8A] text-white text-xs font-bold rounded-xl shadow-md transition-all cursor-pointer inline-flex items-center gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Add Service Location Now</span>
                    </button>
                  </div>
                ) : (
                  <>

                {/* COLLECTION TIME CARD */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1d5bd8] flex items-center justify-center font-bold text-xs">
                        1
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-navy">Collection time</h2>
                        <p className="text-[11px] text-gray-400">When should we collect your laundry bags?</p>
                      </div>
                    </div>
                  </div>

                  {/* Day Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select day:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleQuickCollectionDay(0)}
                        className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${pickupDate === todayYyyyMmDd
                          ? 'border-[#1d5bd8] bg-[#eef4ff] text-[#1d5bd8] shadow-2xs ring-1 ring-[#1d5bd8]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span className="block text-sm">Today</span>
                        <span className="text-[10px] font-normal text-gray-400">Available</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickCollectionDay(1)}
                        className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${pickupDate === tomorrowYyyyMmDd
                          ? 'border-[#1d5bd8] bg-[#eef4ff] text-[#1d5bd8] shadow-2xs ring-1 ring-[#1d5bd8]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span className="block text-sm">Tomorrow</span>
                        <span className="text-[10px] font-normal text-gray-400">Standard</span>
                      </button>

                      <div className="col-span-2 sm:col-span-1">
                        <input
                          type="date"
                          value={formatDateToYyyyMmDd(pickupDate)}
                          min={todayYyyyMmDd}
                          onChange={(e) => handlePickupDateChange(e.target.value)}
                          className="w-full h-full min-h-[46px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#1d5bd8]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time Slot Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select time:
                    </label>
                    {dynamicPickupSlots.length === 0 ? (
                      <div className="py-4 px-3 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        {slotsLoading ? 'Loading manager-created slots...' : 'No dynamic pickup slots configured by the plant manager for this area.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {dynamicPickupSlots.map((slot) => {
                          const slotObj = availablePickupSlots.find((s) => s.slot === slot);
                          const disabled = slotObj?.disabled || false;
                          const isSelected = pickupSlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={disabled}
                              onClick={() => handlePickupSlotChange(slot)}
                              className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${disabled
                                ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                                : isSelected
                                  ? 'border-[#1d5bd8] bg-[#1d5bd8] text-white shadow-xs'
                                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                                }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{slot}</span>
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Pickup Instruction Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select pickup instruction dropdown
                    </label>
                    <div className="relative">
                      <select
                        value={pickupInstruction}
                        onChange={(e) => setPickupInstruction(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8] appearance-none"
                      >
                        <option value="Collect from me in person">Collect from me in person</option>
                        <option value="Collect from outside">Collect from outside</option>
                        <option value="Collection from reception/porter">Collection from reception/porter</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {/* DELIVERY TIME CARD */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#1d5bd8] flex items-center justify-center font-bold text-xs">
                        2
                      </div>
                      <div>
                        <h2 className="text-base font-bold text-navy">Delivery time</h2>
                        <p className="text-[11px] text-gray-400">When should we return your fresh, clean garments? (Minimum 24h turnaround)</p>
                      </div>
                    </div>
                  </div>

                  {/* Day Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select day:
                    </label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                      <button
                        type="button"
                        onClick={() => handleQuickDeliveryDay(1)}
                        className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${deliveryDate === deliveryTomorrowYyyyMmDd
                          ? 'border-[#1d5bd8] bg-[#eef4ff] text-[#1d5bd8] shadow-2xs ring-1 ring-[#1d5bd8]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span className="block text-sm">Tomorrow</span>
                        <span className="text-[10px] font-normal text-gray-400">Next Day (+24h)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleQuickDeliveryDay(2)}
                        className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${deliveryDate === deliveryIn2DaysYyyyMmDd
                          ? 'border-[#1d5bd8] bg-[#eef4ff] text-[#1d5bd8] shadow-2xs ring-1 ring-[#1d5bd8]'
                          : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                          }`}
                      >
                        <span className="block text-sm">In 2 Days</span>
                        <span className="text-[10px] font-normal text-gray-400">Standard 48hr</span>
                      </button>

                      <div className="col-span-2 sm:col-span-1">
                        <input
                          type="date"
                          value={formatDateToYyyyMmDd(deliveryDate)}
                          min={deliveryTomorrowYyyyMmDd || todayYyyyMmDd}
                          disabled={!pickupDate}
                          onChange={(e) => handleDeliveryDateChange(e.target.value)}
                          className="w-full h-full min-h-[46px] px-3 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-700 focus:outline-none focus:border-[#1d5bd8] disabled:opacity-50"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Time Slot Picker */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">
                      Select time:
                    </label>
                    {dynamicDeliverySlots.length === 0 ? (
                      <div className="py-4 px-3 text-center text-xs text-gray-500 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                        {slotsLoading ? 'Loading manager-created slots...' : 'No dynamic delivery slots configured by the plant manager for this area.'}
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                        {dynamicDeliverySlots.map((slot) => {
                          const slotObj = availableDeliverySlots.find((s) => s.slot === slot);
                          const disabled = slotObj?.disabled || false;
                          const isSelected = deliverySlot === slot;
                          return (
                            <button
                              key={slot}
                              type="button"
                              disabled={disabled || !deliveryDate}
                              onClick={() => handleDeliverySlotChange(slot)}
                              title={slotObj?.reason}
                              className={`py-3 px-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${disabled || !deliveryDate
                                ? 'opacity-40 cursor-not-allowed bg-gray-50 border-gray-200 text-gray-400'
                                : isSelected
                                  ? 'border-[#1d5bd8] bg-[#1d5bd8] text-white shadow-xs'
                                  : 'border-gray-200 bg-white hover:border-gray-300 text-gray-800'
                                }`}
                            >
                              <span className="flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                <span>{slot}</span>
                              </span>
                              {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delivery Instruction Dropdown */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Select delivery instruction dropdown
                    </label>
                    <div className="relative">
                      <select
                        value={deliveryInstruction}
                        onChange={(e) => setDeliveryInstruction(e.target.value)}
                        className="w-full h-11 pl-4 pr-10 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8] appearance-none"
                      >
                        <option value="Deliver to me in person">Deliver to me in person</option>
                        <option value="Leave at the door">Leave at the door</option>
                        <option value="Deliver to the reception/porter">Deliver to the reception/porter</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>
                  </>
                )}

                {scheduleError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{scheduleError}</span>
                  </div>
                )}

                {/* Bottom Action Bar for Step 1 */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('cart')}
                    className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-navy flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Cart</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleProceedFromSlots}
                    className="px-8 py-3.5 rounded-xl bg-navy hover:bg-[#072465] text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                  >
                    <span>Continue to Contact Details</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 2: CONTACT DETAILS (DEDICATED SCREEN)
            ========================================================================= */}
            {currentStep === 'contact' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Mobile Stepper Header */}
                <div className="flex md:hidden items-center justify-between text-xs font-bold text-gray-400 pb-2 border-b border-gray-100">
                  <span className="text-[#1d5bd8]">Step 2 of 4: Contact Details</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('slots')}
                    className="text-gray-500 hover:text-navy underline"
                  >
                    Change Slots
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy tracking-tight">
                    Enter contact details
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    We only use your details to keep you updated about your order. Log in if you have an existing account.
                  </p>
                </div>

                {!effectiveIsLoggedIn && (
                  <div className="p-3.5 rounded-2xl bg-[#eef4ff] border border-[#d6e5ff] flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs text-navy">
                      <User className="w-4 h-4 text-[#1d5bd8] shrink-0" />
                      <span>Have a Laundelle account? Sign in for saved addresses and loyalty points.</span>
                    </div>
                    <button
                      type="button"
                      onClick={onRequireLogin}
                      className="px-3.5 py-1.5 bg-navy text-white text-xs font-bold rounded-lg hover:bg-[#072465] transition-all shrink-0 cursor-pointer"
                    >
                      Log In
                    </button>
                  </div>
                )}

                {/* Individual vs Company Segmented Toggle */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-5">
                  <div className="flex p-1 bg-gray-100 rounded-xl max-w-xs">
                    <button
                      type="button"
                      onClick={() => setAccountType('individual')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${accountType === 'individual'
                        ? 'bg-white text-navy shadow-xs'
                        : 'text-gray-500 hover:text-navy'
                        }`}
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Individual</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAccountType('company')}
                      className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${accountType === 'company'
                        ? 'bg-white text-navy shadow-xs'
                        : 'text-gray-500 hover:text-navy'
                        }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span>Company</span>
                    </button>
                  </div>

                  {accountType === 'company' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g. Acme Hospitality Ltd"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8]"
                      />
                    </div>
                  )}

                  {/* First & Last Name */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        First name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-700 mb-1">
                        Last name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8]"
                      />
                    </div>
                  </div>

                  {/* Phone with fixed +44 badge */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Phone <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="h-11 px-3 bg-gray-100 border border-r-0 border-gray-200 rounded-l-xl text-xs font-bold text-gray-700 flex items-center gap-1.5 shrink-0">
                        <span>🇬🇧</span>
                        <span>+44</span>
                      </div>
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="Your mobile number"
                        className="w-full h-11 px-3.5 rounded-r-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8]"
                      />
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1">We send SMS driver tracking updates to this number.</p>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">
                      Email <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className="w-full h-11 px-3.5 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-navy focus:outline-none focus:border-[#1d5bd8]"
                    />
                  </div>
                </div>

                {/* READ-ONLY SELECTED COLLECTION & DELIVERY ADDRESS CARD */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-navy uppercase tracking-wider">
                    <MapPin className="w-4 h-4 text-[#1d5bd8]" />
                    <span>Selected Collection & Delivery Address</span>
                  </div>

                  {selectedAddress ? (
                    <div className="p-4 rounded-xl border border-[#1d5bd8] bg-[#f8fbff] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-extrabold text-navy text-sm">{selectedAddress.label || 'Home Location'}</span>
                        {selectedAddress.isDefault && (
                          <span className="text-[10px] font-bold bg-blue-100 text-[#1d5bd8] px-2.5 py-0.5 rounded-full">
                            Default Address
                          </span>
                        )}
                      </div>
                      <p className="text-gray-700 font-semibold leading-relaxed pt-0.5">
                        {[selectedAddress.flatNo, selectedAddress.street, selectedAddress.landmark, selectedAddress.city].filter(Boolean).join(', ')}
                        {selectedAddress.pincode || (selectedAddress as any).postcode ? ` — ${selectedAddress.pincode || (selectedAddress as any).postcode}` : ''}
                      </p>
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 font-semibold">
                      No address selected. Please select your service location first.
                    </div>
                  )}
                </div>

                {contactError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{contactError}</span>
                  </div>
                )}

                {/* Bottom Action Bar for Step 2 */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('slots')}
                    className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-navy flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Slots</span>
                  </button>

                  <button
                    type="button"
                    onClick={effectiveIsLoggedIn ? handleProceedFromContact : () => { if (onRequireLogin) onRequireLogin(); }}
                    className="px-8 py-3.5 rounded-xl bg-navy hover:bg-[#072465] text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                  >
                    {!effectiveIsLoggedIn ? (
                      <>
                        <Lock className="w-4 h-4 text-[#48CAE4]" />
                        <span>Log In to Continue</span>
                      </>
                    ) : (
                      <>
                        <span>Continue to Review & Confirm</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 3: REVIEW AND CONFIRM (DEDICATED SCREEN)
            ========================================================================= */}
            {currentStep === 'review' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Mobile Stepper Header */}
                <div className="flex md:hidden items-center justify-between text-xs font-bold text-gray-400 pb-2 border-b border-gray-100">
                  <span className="text-[#1d5bd8]">Step 3 of 4: Review and Confirm</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('contact')}
                    className="text-gray-500 hover:text-navy underline"
                  >
                    Edit Details
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy tracking-tight">
                    Review and confirm
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    You will be charged after we weigh and clean your items.{' '}
                    <button
                      type="button"
                      onClick={() => setHowChargesWorkOpen(true)}
                      className="text-[#1d5bd8] font-bold hover:underline"
                    >
                      Learn more
                    </button>
                  </p>
                </div>

                {/* Slots & Delivery Summary Banner */}
                <div className="rounded-2xl border border-blue-100 bg-[#f8fbff] p-4 flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-[#eef4ff] text-[#1d5bd8] flex items-center justify-center shrink-0">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-bold text-navy">
                        Collection: {pickupDate} ({pickupSlot}) • Delivery: {deliveryDate} ({deliverySlot})
                      </p>
                      <p className="text-gray-500 text-[11px]">
                        Deliver to: {firstName} {lastName} ({activeAddr?.street || 'Delivery Address'})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('slots')}
                    className="text-[11px] font-bold text-[#1d5bd8] hover:underline shrink-0"
                  >
                    Change Slots
                  </button>
                </div>

                {/* ESTIMATED TOTAL BREAKDOWN CARD */}
                <div className="rounded-2xl border border-gray-200/90 bg-white p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-baseline justify-between border-b border-gray-100 pb-3">
                    <span className="text-sm font-bold text-navy uppercase tracking-wider">Estimated total</span>
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#1d5bd8] font-sans">
                      ~£{estimatedTotal.toFixed(2)}
                    </span>
                  </div>

                  {/* Breakdown rows */}
                  <div className="space-y-2.5 text-xs sm:text-sm">
                    {/* Cart Items Subtotal */}
                    {cart.map((item) => (
                      <div key={item.id} className="flex items-center justify-between text-gray-700">
                        <span>{item.name} {item.quantity > 1 ? `(${item.quantity}x)` : ''}</span>
                        <span className="font-bold text-navy">£{(item.price * item.quantity).toFixed(2)}</span>
                      </div>
                    ))}

                    {/* Small Order Fee */}
                    <div className="flex items-center justify-between text-gray-700">
                      <div className="flex items-center gap-1.5">
                        <span>Small order fee</span>
                        <span title="Minimum order value is £20.00">
                          <HelpCircle className="w-3.5 h-3.5 text-gray-400" />
                        </span>
                      </div>
                      <span className="font-bold text-navy">£{smallOrderFee.toFixed(2)}</span>
                    </div>

                    {/* Service Fee */}
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Service fee</span>
                      <span className="font-bold text-navy">£{serviceFee.toFixed(2)}</span>
                    </div>

                    {/* Collection & Delivery */}
                    <div className="flex items-center justify-between text-gray-700">
                      <span>Collection & Delivery</span>
                      <span className="font-bold text-emerald-600 uppercase tracking-wider text-xs">FREE</span>
                    </div>

                    {/* Driver Tip */}
                    {driverTip > 0 && (
                      <div className="flex items-center justify-between text-[#1d5bd8]">
                        <span>Driver tip</span>
                        <span className="font-bold">£{driverTip.toFixed(2)}</span>
                      </div>
                    )}

                    {/* Promo Discount */}
                    {discountAmount > 0 && (
                      <div className="flex items-center justify-between text-emerald-600">
                        <span>Promo discount ({appliedDiscount}%)</span>
                        <span className="font-bold">-£{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                  </div>

                  {/* PROMO CODE BOX */}
                  <div className="pt-3 border-t border-gray-100">
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">
                      Promo code
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        placeholder="Enter promo code"
                        className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-xs w-full uppercase font-mono placeholder:normal-case placeholder:font-sans focus:outline-none focus:border-[#1d5bd8]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyCoupon}
                        className="px-6 py-2.5 bg-navy hover:bg-[#072465] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer shrink-0"
                      >
                        Enter
                      </button>
                    </div>
                    {couponError && <p className="text-[11px] text-red-500 font-medium mt-1">{couponError}</p>}
                    {couponSuccess && <p className="text-[11px] text-emerald-600 font-bold mt-1">{couponSuccess}</p>}
                  </div>

                  {/* TIP YOUR DRIVER */}
                  <div className="pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-gray-700">Tip your driver?</span>
                      {driverTip > 0 && (
                        <span className="text-xs font-bold text-emerald-600">+£{driverTip.toFixed(2)} added</span>
                      )}
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                      {[
                        { label: 'No', value: 0 },
                        { label: '£3.00', value: 3 },
                        { label: '£6.00', value: 6 },
                        { label: '£10.00', value: 10 },
                      ].map((tipOpt) => (
                        <button
                          key={tipOpt.label}
                          type="button"
                          onClick={() => setDriverTip(tipOpt.value)}
                          className={`py-2.5 rounded-xl border text-xs font-bold transition-all text-center cursor-pointer ${driverTip === tipOpt.value
                            ? 'border-[#1d5bd8] bg-[#1d5bd8] text-white shadow-xs'
                            : 'border-gray-200 bg-white hover:border-gray-300 text-gray-700'
                            }`}
                        >
                          {tipOpt.label}
                        </button>
                      ))}
                    </div>
                    <p className="text-[11px] text-gray-400 mt-1.5 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Most users in your area choose this</span>
                    </p>
                  </div>
                </div>

                {/* ACCORDION 1: HOW CHARGES WORK */}
                <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden">
                  <button
                    type="button"
                    onClick={() => setHowChargesWorkOpen(!howChargesWorkOpen)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      <Receipt className="w-4 h-4 text-[#1d5bd8]" />
                      <span className="text-sm font-bold text-navy">How charges work</span>
                    </div>
                    {howChargesWorkOpen ? (
                      <ChevronUp className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    )}
                  </button>

                  {howChargesWorkOpen && (
                    <div className="p-4 sm:p-5 pt-0 border-t border-gray-100 space-y-4">
                      {/* Step 1 */}
                      <div className="flex items-start gap-3 pt-2">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1d5bd8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          1
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-navy">1. Book your order</h4>
                          <span className="text-[11px] font-bold text-emerald-600 block">No upfront payment</span>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Place your order by providing your payment details. We won’t charge you until your items are checked at our facility.
                          </p>
                        </div>
                      </div>

                      {/* Step 2 */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1d5bd8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          2
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-navy">2. Facility checks bags</h4>
                          <span className="text-[11px] font-bold text-[#1d5bd8] block">Items are weighed and counted</span>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Our local cleaning partner will check your bags and issue an itemised online receipt as per our pricelist.
                          </p>
                        </div>
                      </div>

                      {/* Step 3 */}
                      <div className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-lg bg-blue-50 text-[#1d5bd8] flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                          3
                        </div>
                        <div className="space-y-0.5">
                          <h4 className="text-xs sm:text-sm font-bold text-navy">3. Final price is calculated</h4>
                          <span className="text-[11px] font-bold text-purple-600 block">You’re charged after cleaning</span>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            Once your items are processed, we’ll charge your card for the final amount based on quantity, weight, and services selected.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* ACCORDION 2: FREQUENTLY ASKED QUESTIONS */}
                <div className="rounded-2xl border border-gray-200/90 bg-white shadow-sm overflow-hidden divide-y divide-gray-100">
                  <div className="p-4 sm:p-5 bg-gray-50/50">
                    <h3 className="text-sm font-bold text-navy flex items-center gap-2">
                      <HelpCircle className="w-4 h-4 text-[#1d5bd8]" />
                      <span>Frequently asked questions</span>
                    </h3>
                  </div>

                  {[
                    {
                      q: 'What is a small order fee?',
                      a: 'To ensure the quality of our service, we have a minimum order value of £20.00. If your total is below that, we’ll simply top it up with a small order fee to meet the minimum.'
                    },
                    {
                      q: 'What is the service fee?',
                      a: 'The service fee helps us work with trusted local cleaning partners and offer you a smooth, fast, and reliable experience.'
                    },
                    {
                      q: 'Will my prepaid packs get applied automatically?',
                      a: 'Yes - if you have an active prepaid pack, it will apply automatically once we check your order. The final charge will adjust based on how many items you’ve sent. We advise you to ensure sending enough items to cover the minimum order value.'
                    },
                    {
                      q: 'How promo codes work?',
                      a: "Any promo codes will be applied when the final invoice is issued and, once applied, they cannot be removed. Promo codes don't apply to service or driver fees."
                    }
                  ].map((faq, idx) => {
                    const isOpen = openFaqIndex === idx;
                    return (
                      <div key={idx} className="transition-colors">
                        <button
                          type="button"
                          onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                          className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 cursor-pointer"
                        >
                          <span className="text-xs sm:text-sm font-bold text-navy">{faq.q}</span>
                          {isOpen ? (
                            <ChevronUp className="w-4 h-4 text-gray-400 shrink-0" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-gray-400 shrink-0" />
                          )}
                        </button>
                        {isOpen && (
                          <div className="px-4 pb-4 text-xs text-gray-500 leading-relaxed">
                            {faq.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Bottom Action Bar for Step 3 */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('contact')}
                    className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-navy flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Contact</span>
                  </button>

                  <button
                    type="button"
                    onClick={effectiveIsLoggedIn ? () => setCurrentStep('payment') : () => { if (onRequireLogin) onRequireLogin(); }}
                    className="px-8 py-3.5 rounded-xl bg-navy hover:bg-[#072465] text-white text-sm font-bold flex items-center gap-2 shadow-md transition-all cursor-pointer active:scale-98"
                  >
                    {!effectiveIsLoggedIn ? (
                      <>
                        <Lock className="w-4 h-4 text-[#48CAE4]" />
                        <span>Log In to Proceed to Payment</span>
                      </>
                    ) : (
                      <>
                        <span>Proceed to Payment</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* =========================================================================
                SCREEN 4: PAYMENT SCREEN (CASH ON DELIVERY COMPLETELY REMOVED)
            ========================================================================= */}
            {currentStep === 'payment' && (
              <div className="space-y-6 animate-in fade-in-50 duration-200">
                {/* Mobile Stepper Header */}
                <div className="flex md:hidden items-center justify-between text-xs font-bold text-gray-400 pb-2 border-b border-gray-100">
                  <span className="text-[#1d5bd8]">Step 4 of 4: Payment</span>
                  <button
                    type="button"
                    onClick={() => setCurrentStep('review')}
                    className="text-gray-500 hover:text-navy underline"
                  >
                    Review Order
                  </button>
                </div>

                <div className="space-y-1">
                  <h1 className="font-serif text-2xl sm:text-3xl font-bold text-navy tracking-tight">
                    Complete Payment
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">
                    Pay securely online. No upfront charges will be taken today.
                  </p>
                </div>

                {/* No Upfront Payment Reassurance */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/80 p-4 sm:p-5 flex items-start gap-3.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-sm">
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-emerald-900">
                      No Upfront Payment Required
                    </h3>
                    <p className="text-xs text-emerald-700 mt-0.5 leading-relaxed">
                      Your card will be verified and authorized. You won’t be charged until our professional team weighs and inspects your garments at our facility.
                    </p>
                  </div>
                </div>

                {/* Card Payment Card (Online Stripe Only - COD Removed!) */}
                <div className="rounded-2xl border-2 border-[#1d5bd8] bg-[#f8fbff] p-5 sm:p-6 shadow-sm space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[#1d5bd8] text-white flex items-center justify-center shadow-xs">
                        <CreditCard className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-navy">Online Card Payment</h4>
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-[#1d5bd8] uppercase">
                            Stripe Secure
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Debit / Credit Card, Apple Pay, Google Pay
                        </p>
                      </div>
                    </div>

                    <div className="w-6 h-6 rounded-full bg-[#1d5bd8] flex items-center justify-center text-white">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </div>

                  <div className="p-3 bg-white rounded-xl border border-blue-100 text-xs text-gray-600 space-y-1">
                    <div className="flex items-center justify-between font-semibold">
                      <span>Estimated Total Authorization:</span>
                      <span className="text-base font-extrabold text-[#1d5bd8]">~£{estimatedTotal.toFixed(2)}</span>
                    </div>
                    <p className="text-[11px] text-gray-400">
                      Final amount adjusts based on bag weight, piece count, and active discount packs.
                    </p>
                  </div>
                </div>

                {/* 256-Bit SSL Security Badge */}
                <div className="flex items-center justify-center gap-2 text-xs text-gray-400 pt-1">
                  <Lock className="w-3.5 h-3.5 text-emerald-600" />
                  <span>256-bit Bank-Grade SSL Encryption • 100% Secure Checkout</span>
                </div>

                {submitError && (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-semibold flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span>{submitError}</span>
                  </div>
                )}

                {/* Bottom Action Bar for Step 4 */}
                <div className="pt-2 flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => setCurrentStep('review')}
                    className="px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-xs font-bold text-navy flex items-center gap-1.5 cursor-pointer"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Review</span>
                  </button>

                  <button
                    type="button"
                    onClick={effectiveIsLoggedIn ? handleCompletePayment : () => { if (onRequireLogin) onRequireLogin(); }}
                    disabled={isSubmitting}
                    className="flex-1 py-4 rounded-xl bg-navy hover:bg-[#072465] text-white text-sm sm:text-base font-bold flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer active:scale-98 disabled:opacity-50"
                  >
                    {!effectiveIsLoggedIn ? (
                      <>
                        <Lock className="w-4 h-4 text-[#48CAE4]" />
                        <span>Log In to Authorise & Book Order</span>
                      </>
                    ) : isSubmitting ? (
                      <span>Redirecting to Secure Gateway...</span>
                    ) : (
                      <>
                        <CreditCard className="w-4 h-4" />
                        <span>Authorise Card & Book Order (~£{estimatedTotal.toFixed(2)})</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* Add / Edit Address & GPS Coordinates Modal */}
      <AddAddressModal
        isOpen={addressModalOpen}
        onClose={() => setAddressModalOpen(false)}
        onSaveAddress={handleSaveAddress}
        initialAddress={addressToEdit}
      />
    </div>
  );
};

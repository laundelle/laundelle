'use client';

import React, { useState } from 'react';
import { ActiveTab, CartItem, ServiceItem, Order, UserProfile, CustomerNotification } from '@laundelle/types';
import { User } from 'lucide-react';

import { SplashScreen } from '../components/SplashScreen';
import { Navbar } from '../components/Navbar';
import { MobileNav } from '../components/MobileNav';
import { CartDrawer } from '../components/CartDrawer';
import { SchedulePickupModal } from '../components/SchedulePickupModal';
import { PostcodeCheckerModal } from '../components/PostcodeCheckerModal';

import { HomeView } from '../components/HomeView';
import { ServicesView } from '../components/ServicesView';
import { OrdersView } from '../components/OrdersView';
import { InvoiceReceiptModal } from '../components/InvoiceReceiptModal';
import { RescheduleCancelModal } from '../components/RescheduleCancelModal';
import { AdditionalChargeModal } from '../components/AdditionalChargeModal';
import { ServiceCustomizeModal } from '../components/ServiceCustomizeModal';
import { SupportView } from '../components/SupportView';
import { NotificationsView } from '../components/NotificationsView';
import { AccountView } from '../components/AccountView';
import { AIAssistantView } from '../components/AIAssistantView';
import { OrderPlacedAnimationModal } from '../components/OrderPlacedAnimationModal';
import { useAuth0 } from '@auth0/auth0-react';
import { CustomerAuthModal } from '../components/CustomerAuthModal';
import { CompleteProfileModal } from '../components/CompleteProfileModal';
import { parseCurrentRoute, navigateToRoute, AuthSession, UserRole } from '@laundelle/utils';
import { Footer } from '../components/Footer';
import {
  getStoredSession,
  dbFetchProfile,
  dbUpdateProfile,
  dbUpdatePreferences,
  dbCreateAddress,
  dbUpdateAddress,
  dbDeleteAddress,
  dbFetchOrders,
  dbFetchNotifications,
  clearSession,
  dbFetchServices,
  dbCancelOrder,
  dbAuth0Sync,
  apiFetch,
  authHeaders
} from '@laundelle/api-client';

export default function App({ initialTab }: { initialTab?: string }) {
  // Auth0 Hook at component root
  const {
    isAuthenticated: isAuth0Authenticated,
    user: auth0User,
    isLoading: isAuth0Loading,
    error: auth0Error,
    loginWithRedirect,
  } = useAuth0();

  const [showSplash, setShowSplash] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.has('payment')) return 'orders';
      const p = window.location.pathname.replace(/^\//, '');
      if (p === 'orders') return 'orders';
      if (p === 'services') return 'services';
      if (p === 'support') return 'support';
      if (p === 'notifications') return 'notifications';
      if (p === 'account') return 'account';
      if (p === 'ai') return 'assistant';
    }
    return (initialTab as ActiveTab) || 'home';
  });

  // Only show splash screen once on the user's very first visit to the website
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const hasShown = localStorage.getItem('laundelle_splash_shown');
      const params = new URLSearchParams(window.location.search);
      const isPaymentRedirect = params.has('payment');
      const isAuthRedirect = params.has('code') || params.has('state') || params.has('error');

      if (!hasShown && !isPaymentRedirect && !isAuthRedirect) {
        setShowSplash(true);
      }
    } catch {
      // storage unavailable
    }
  }, []);

  // Listen for custom tab navigation events (e.g. from post-Auth0 redirect)
  React.useEffect(() => {
    const handleNavigateTab = (e: any) => {
      if (e.detail && ['home', 'services', 'orders', 'support', 'notifications', 'account', 'assistant'].includes(e.detail)) {
        setActiveTab(e.detail as ActiveTab);
      }
    };
    window.addEventListener('l2u_navigate_tab', handleNavigateTab);
    return () => window.removeEventListener('l2u_navigate_tab', handleNavigateTab);
  }, []);

  // Display toast if Auth0 returns an error query parameter or auth fails
  React.useEffect(() => {
    if (auth0Error) {
      console.error('[Auth0 Error]', auth0Error);
      showToast(`Auth0 Error: ${auth0Error.message || 'Authentication failed'}`);
    }
  }, [auth0Error]);

  // Handle Stripe payment redirect callbacks


  const handleSplashComplete = () => {
    setShowSplash(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('laundelle_splash_shown', 'true');
      } catch { }
    }
  };

  const [services, setServices] = useState<ServiceItem[]>([]);

  // Fetch Services from Database
  React.useEffect(() => {
    dbFetchServices().then(data => {
      setServices(data || []);
    });
  }, []);
  const [orders, setOrders] = useState<Order[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('laundelle_user_cart');
        if (saved) return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to restore cart from localStorage:', e);
      }
    }
    return [];
  });

  // Sync cart to localStorage whenever it changes
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        if (cart.length > 0) {
          localStorage.setItem('laundelle_user_cart', JSON.stringify(cart));
        } else {
          localStorage.removeItem('laundelle_user_cart');
        }
      } catch (e) {
        console.error('Failed to sync cart to localStorage:', e);
      }
    }
  }, [cart]);

  // Navigation & Preselection Context
  const [selectedTrackingOrderId, setSelectedTrackingOrderId] = useState<string | null>(null);

  // Modals & Drawers
  const [cartDrawerOpen, setCartDrawerOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [postcodeModalOpen, setPostcodeModalOpen] = useState(false);
  const [activeInvoiceOrder, setActiveInvoiceOrder] = useState<Order | null>(null);
  const [rescheduleCancelOrder, setRescheduleCancelOrder] = useState<Order | null>(null);
  const [rescheduleCancelMode, setRescheduleCancelMode] = useState<'reschedule' | 'cancel'>('reschedule');
  const [activeChargeOrder, setActiveChargeOrder] = useState<Order | null>(null);
  const [serviceToCustomize, setServiceToCustomize] = useState<ServiceItem | null>(null);
  const [animationModalOrder, setAnimationModalOrder] = useState<Order | null>(null);

  // Toast banner
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  const handleNavigate = (tab: ActiveTab) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Sync URL pathname with activeTab
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    // Critical: Do NOT rewrite URL if Auth0 callback parameters or Stripe callback parameters are present!
    // Overriding the URL while Auth0 is parsing code/state or error parameters wipes them and breaks authentication.
    if (
      isAuth0Loading ||
      window.location.search.includes('code=') ||
      window.location.search.includes('state=') ||
      window.location.search.includes('error=') ||
      window.location.search.includes('payment=')
    ) {
      return;
    }

    let path = '/home';
    if (activeTab === 'services') path = '/services';
    else if (activeTab === 'orders') path = '/orders';
    else if (activeTab === 'support') path = '/support';
    else if (activeTab === 'notifications') path = '/notifications';
    else if (activeTab === 'account') path = '/account';
    else if (activeTab === 'assistant') path = '/ai';

    if (window.location.pathname !== path) {
      window.history.pushState(null, '', path);
    }
  }, [activeTab, isAuth0Loading]);

  // Direct Book Now navigation with service pre-selected
  const handleStartBookingWithService = (serviceId?: string) => {
    setActiveTab('services');
    if (serviceId) {
      const s = services.find((x) => x.id === serviceId);
      if (s) setServiceToCustomize(s);
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Cart operations (Guests can freely add items without sign-in prompt)
  const handleAddToCart = (
    service: ServiceItem,
    quantity: number,
    selectedOption?: string,
    specialInstructions?: string
  ) => {
    const existingIndex = cart.findIndex(
      (i) => i.serviceId === service.id && i.selectedOption === selectedOption
    );

    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += quantity;
      setCart(updated);
    } else {
      const newItem: CartItem = {
        id: `cart-${Date.now()}`,
        serviceId: service.id,
        name: service.name,
        price: service.price,
        unit: service.unit,
        quantity,
        selectedOption,
        specialInstructions,
        image: service.image,
      };
      setCart([...cart, newItem]);
    }

    showToast(`Added ${service.name} to cart!`);
  };

  const handleUpdateCartQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const handleRemoveCartItem = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearCart = () => {
    setCart([]);
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('laundelle_user_cart');
      } catch {}
    }
  };

  const handleOrderPlaced = (newOrder: Order) => {
    // Clear cart upon successful order placement
    handleClearCart();

    // Ensure splash screen never shows after placing an order
    setShowSplash(false);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('laundelle_splash_shown', 'true');
      } catch { }
    }

    setOrders((prev) => [newOrder, ...prev]);
    setSelectedTrackingOrderId(newOrder.id);

    // Add booking confirmed notification
    const newNotif: CustomerNotification = {
      id: `notif-${Date.now()}`,
      title: '✅ Booking Confirmed',
      message: `Your collection #${newOrder.id} is scheduled for ${newOrder.pickupDate}. Driver will arrive in your slot.`,
      date: 'Just now',
      category: 'order_status',
      read: false,
      orderId: newOrder.id,
      actionTab: 'orders',
    };
    setNotifications((prev) => [newNotif, ...prev]);

    // Show Order Placed delivery truck animation modal
    setAnimationModalOrder(newOrder);

    // Navigate to Orders tab (tracking is now integrated there)
    setActiveTab('orders');
    showToast(`✅ Collection #${newOrder.id} scheduled successfully!`);
  };

  const handleReOrder = (pastOrder: Order) => {
    setCart([...pastOrder.items]);
    setCartDrawerOpen(true);
    showToast(`Loaded ${pastOrder.items.length} items from #${pastOrder.id} into cart.`);
  };

  const handleOrderCancelled = async (orderId: string, reason: string = 'Customer requested cancellation') => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, status: 'cancelled' as const, statusLabel: 'Cancelled', cancelReason: reason } : o));
    showToast(`Order #${orderId} has been cancelled.`);
    await dbCancelOrder(authSession.user?.id || 'guest', orderId, reason);
  };

  const handleOrderRescheduled = (orderId: string, newDate: string, newTime: string) => {
    setOrders(orders.map(o => o.id === orderId ? { ...o, pickupDate: newDate, pickupTime: newTime } : o));
    showToast(`Booking #${orderId} rescheduled to ${newDate} (${newTime}).`);
  };

  // Auth Session State
  const [authSession, setAuthSession] = useState<AuthSession>({
    role: null,
    user: null,
    isAuthenticated: false,
  });

  const handleOpenCustomerAuth = (_screenHint?: 'signup') => {
    try {
      if (typeof window !== 'undefined' && cartDrawerOpen) {
        localStorage.setItem('laundelle_open_cart', 'true');
      }
    } catch {}
    setCustomerAuthOpen(true);
  };

  const handleDirectAuth0Login = (screenHint?: 'signup') => {
    try {
      if (typeof window !== 'undefined' && cartDrawerOpen) {
        localStorage.setItem('laundelle_open_cart', 'true');
      }
    } catch {}
    loginWithRedirect({
      appState: {
        returnTo: typeof window !== 'undefined' && window.location.pathname !== '/' ? window.location.pathname : '/home',
        tab: activeTab,
      },
      authorizationParams: {
        screen_hint: screenHint,
      },
    });
  };

  // Sync Auth0 authenticated user into backend and app session
  React.useEffect(() => {
    let isCancelled = false;

    const syncAuth0 = async () => {
      if (!isAuth0Loading && isAuth0Authenticated && auth0User) {
        const email = auth0User.email || '';
        const name = auth0User.name || auth0User.nickname || email.split('@')[0] || 'Customer';
        const sub = auth0User.sub || '';
        const picture = auth0User.picture;

        try {
          const syncResult = await dbAuth0Sync({ email, name, sub, picture });
          if (isCancelled) return;

          if (syncResult.user && syncResult.token) {
            setAuthSession({
              role: 'customer',
              user: {
                id: syncResult.user.id,
                name: syncResult.user.name || name,
                email: syncResult.user.email || email,
                role: 'customer',
                roleLabel: 'Customer Account',
              },
              isAuthenticated: true,
            });

            // Prompt user for Username & Mobile Number if missing (e.g. after Google OAuth signup)
            if (syncResult.needsProfileCompletion || !syncResult.user?.phone) {
              setCompleteProfileModalOpen(true);
            }
          }
        } catch (err) {
          console.error('[AppClient] Failed to sync Auth0 session with backend:', err);
        }

        // Restore cart drawer if user was checking out before login redirect
        try {
          if (typeof window !== 'undefined') {
            const shouldOpenCart = localStorage.getItem('laundelle_open_cart') === 'true';
            if (shouldOpenCart) {
              localStorage.removeItem('laundelle_open_cart');
              setCartDrawerOpen(true);
            }
          }
        } catch {}
      }
    };

    syncAuth0();

    return () => {
      isCancelled = true;
    };
  }, [isAuth0Loading, isAuth0Authenticated, auth0User]);

  // Restore MongoDB auth session from localStorage on mount
  React.useEffect(() => {
    const restoreSession = () => {
      const stored = getStoredSession();
      if (stored?.user) {
        const uRole = stored.user.role || 'customer';
        const isStaff = uRole === 'admin' || uRole === 'super_admin';
        const isManager = uRole === 'manager';
        const isDriver = uRole === 'driver';
        const isProcessor = uRole === 'processor';

        let mappedRole: UserRole = 'customer';
        if (isStaff) mappedRole = 'admin';
        else if (isManager) mappedRole = 'manager';
        else if (isDriver) mappedRole = 'driver';
        else if (isProcessor) mappedRole = 'processor';

        setAuthSession({
          role: mappedRole,
          user: {
            id: stored.user.id,
            name: stored.user.name || stored.user.email?.split('@')[0] || 'User',
            email: stored.user.email || '',
            role: uRole,
            roleLabel: uRole === 'manager' ? 'Plant Manager' : uRole === 'super_admin' ? 'Super Admin' : uRole === 'admin' ? 'Administrator' : uRole === 'driver' ? 'Driver' : uRole === 'processor' ? 'Processor' : 'Customer Account',
          },
          isAuthenticated: true,
        });
      } else {
        setAuthSession({ role: null, user: null, isAuthenticated: false });
      }
    };

    restoreSession();

    // React to login/logout events dispatched by db.ts helpers
    window.addEventListener('l2u_auth_change', restoreSession);
    return () => window.removeEventListener('l2u_auth_change', restoreSession);
  }, []);

  // Fetch MongoDB user data: Profile, Orders, Notifications
  React.useEffect(() => {
    const syncData = async () => {
      const stored = getStoredSession();
      if (authSession.isAuthenticated && authSession.role === 'customer' && authSession.user?.id && stored?.token) {
        try {
          const userId = authSession.user.id;
          const p = await dbFetchProfile(userId);
          setProfile(p);

          // Prompt user to complete profile if mobile number is missing in MongoDB
          if (p && (!p.phone || p.phone.trim() === '')) {
            setCompleteProfileModalOpen(true);
          }

          const o = await dbFetchOrders(userId);
          setOrders(o);

          const n = await dbFetchNotifications(userId);
          setNotifications(n);
        } catch (e) {
          console.error('[AppClient] Failed to load user data from MongoDB:', e);
        }
      } else if (!authSession.isAuthenticated) {
        setProfile({
          name: '',
          email: '',
          phone: '',
          avatar: '',
          walletBalance: 0,
          rewardPoints: 0,
          addresses: [],
          preferences: {
            detergent: 'Premium Eco-Enzyme',
            softener: 'Premium Silk Touch',
            fragrance: 'Fresh Linen',
            starchedShirts: 'No Starch',
            foldingPreference: 'Standard Flat Fold',
            smsNotifications: true,
            emailReceipts: true,
            whatsappUpdates: true,
            marketingEmails: false
          }
        });
        setOrders([]);
        setNotifications([]);
      }
    };
    syncData();
  }, [authSession.isAuthenticated, authSession.role, authSession.user?.id]);

  // Handle Stripe Payment Redirect Query Parameters
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const orderId = params.get('orderId');

    const sessionId = params.get('session_id') || params.get('stripe_session_id');

    if (payment === 'success') {
      // Ensure splash screen is never shown after payment redirect
      setShowSplash(false);
      try {
        localStorage.setItem('laundelle_splash_shown', 'true');
      } catch { }

      setActiveTab('orders');
      if (orderId) setSelectedTrackingOrderId(orderId);

      // Clean up query param from URL without pushing back to home
      const cleanPath = window.location.pathname === '/' ? '/orders' : window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);

      if (!sessionId) {
        showToast('⚠️ Payment returned without session verification ID. Checking orders...');
        dbFetchOrders(authSession.user?.id).then((freshOrders) => {
          if (freshOrders && freshOrders.length > 0) setOrders(freshOrders);
        });
        return;
      }

      showToast('🔄 Verifying payment confirmation with Stripe...');

      // Call our secure backend confirmation endpoint which verifies payment_status with Stripe API
      apiFetch('/api/stripe/confirm-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({ sessionId }),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.ok && data.confirmed && data.order) {
            // Payment is verified and confirmed by Stripe!
            // Clear cart ONLY now that payment is confirmed
            setCart([]);
            try {
              localStorage.removeItem('laundelle_user_cart');
            } catch {}

            const confirmedId = data.order.publicId || data.order.orderNumber || data.order.id || orderId;
            showToast(`💳 Payment confirmed! Order #${confirmedId} is placed.`);
            setAnimationModalOrder(data.order);
            setSelectedTrackingOrderId(data.order.id || data.order.publicId);

            // Refresh orders list with the confirmed order
            dbFetchOrders(authSession.user?.id).then((freshOrders) => {
              if (freshOrders && freshOrders.length > 0) setOrders(freshOrders);
            });
          } else {
            console.warn('[Payment Verification Failed]', data.error);
            showToast(`❌ Payment not verified: ${data.error || 'Payment was not marked as paid by Stripe'}`);
            // Note: Cart is NOT cleared so the user does not lose their items!
          }
        })
        .catch((err) => {
          console.error('[Payment Verification Network Error]', err);
          showToast('⚠️ Could not verify payment with server. Please check your connection.');
        });
    } else if (payment === 'cancel') {
      const cleanPath = window.location.pathname === '/' ? '/orders' : window.location.pathname;
      window.history.replaceState({}, document.title, cleanPath);
      showToast('❌ Payment process cancelled. Your cart has been preserved.');
    }
  }, []);

  // Customer Auth Modal State
  const [customerAuthOpen, setCustomerAuthOpen] = useState(false);
  const [completeProfileModalOpen, setCompleteProfileModalOpen] = useState(false);

  // Hash Router URL State
  const [currentRoute, setCurrentRoute] = useState(parseCurrentRoute());

  React.useEffect(() => {
    const handleHashChange = () => {
      setCurrentRoute(parseCurrentRoute());
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigateRoleLogin = (role: 'admin' | 'manager' | 'driver' | 'processor') => {
    navigateToRoute(role, 'login');
  };

  const handleCustomerLoginSuccess = (email: string, name: string, userId?: string) => {
    setAuthSession({
      role: 'customer',
      user: { id: userId || `cust-${Date.now()}`, name, email, roleLabel: 'Customer' },
      isAuthenticated: true,
    });
    showToast(`Welcome back, ${name}!`);
  };



  return (
    <div className="min-h-screen bg-[#f8fafc] text-gray-900 font-sans flex flex-col antialiased selection:bg-[#CAF0F8] selection:text-[#03045E]">
      {/* App Reload Splash Screen (shown once on first visit only) */}
      {showSplash && <SplashScreen onComplete={handleSplashComplete} />}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#03045E] text-white px-5 py-3 rounded-2xl shadow-xl border border-[#00B4D8]/30 flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top duration-300">
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Sticky Header Navbar */}
      <Navbar
        activeTab={activeTab}
        onNavigate={handleNavigate}
        cartCount={cart.length}
        unreadNotificationsCount={unreadNotificationsCount}
        onOpenCart={() => setCartDrawerOpen(true)}
        onOpenPostcodeModal={() => setPostcodeModalOpen(true)}
        onOpenCustomerAuth={() => handleOpenCustomerAuth()}
        onNavigateRoleLogin={handleNavigateRoleLogin}
        customerUser={authSession.role === 'customer' ? authSession.user : null}
        onOpenSchedulePickup={() => handleStartBookingWithService()}
      />

      {/* Dynamic View Page Routing */}
      <main className="flex-1">
        {activeTab === 'home' && (
          <HomeView
            onNavigate={handleNavigate}
            onSelectService={(service) => {
              setServiceToCustomize(service);
            }}
            onOpenSchedulePickup={() => handleStartBookingWithService()}
            services={services}
          />
        )}


        {activeTab === 'services' && (
          <ServicesView
            services={services}
            onAddToCart={(service, qty, opt, inst) => {
              handleAddToCart(service, qty, opt, inst);
            }}
            onOpenCart={() => setCartDrawerOpen(true)}
            onCustomizeService={(service) => setServiceToCustomize(service)}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'orders' && (
          authSession.isAuthenticated && authSession.role === 'customer' ? (
            <OrdersView
              orders={orders}
              onOpenBookNow={() => handleStartBookingWithService()}
              onOpenInvoice={setActiveInvoiceOrder}
              onOpenRescheduleCancel={(order, mode) => {
                setRescheduleCancelOrder(order);
                setRescheduleCancelMode(mode);
              }}
              onOpenAdditionalCharge={setActiveChargeOrder}
              onRepeatOrder={handleReOrder}
              selectedOrderId={selectedTrackingOrderId}
            />
          ) : (
            <div className="max-w-xl mx-auto px-4 py-20 text-center space-y-4">
              <div className="w-16 h-16 bg-[#eff6ff] text-[#1d5bd8] rounded-full flex items-center justify-center mx-auto">
                <User className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-navy">Sign In to View Orders</h2>
              <p className="text-xs text-gray-500 max-w-sm mx-auto">
                Please sign in with your customer account to view your live orders, invoices, and active driver tracking.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => handleDirectAuth0Login()}
                  className="w-full sm:w-auto px-6 py-3 bg-[#082b78] hover:bg-[#072465] text-white text-xs font-bold rounded-2xl shadow-sm transition-all cursor-pointer"
                >
                  Sign In with Auth0
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenCustomerAuth()}
                  className="w-full sm:w-auto px-6 py-3 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold rounded-2xl transition-all cursor-pointer"
                >
                  Email & Password Login
                </button>
              </div>
            </div>
          )
        )}

        {activeTab === 'support' && (
          <SupportView
            orders={orders}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAsRead={(id) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))}
            onMarkAllAsRead={() => setNotifications(prev => prev.map(n => ({ ...n, read: true })))}
            onClearAll={() => setNotifications([])}
            onNavigate={handleNavigate}
          />
        )}

        {activeTab === 'account' && (
          authSession.isAuthenticated && authSession.role === 'customer' && profile ? (
            <AccountView
              profile={profile}
              onUpdateProfile={async (updated) => {
                const currentProfile = profile;
                setProfile(updated);
                if (authSession.user?.id) {
                  try {
                    const userId = authSession.user.id;
                    // Sync personal details
                    await dbUpdateProfile(userId, updated.name, updated.phone);
                    // Sync preferences
                    await dbUpdatePreferences(userId, updated.preferences);

                    // Sync address modifications
                    const currentAddrs = currentProfile?.addresses || [];
                    const newAddrs = updated.addresses;

                    for (const oldA of currentAddrs) {
                      if (!newAddrs.some(n => n.id === oldA.id)) {
                        await dbDeleteAddress(userId, oldA.id);
                      }
                    }

                    for (const newA of newAddrs) {
                      const matchingOld = currentAddrs.find(o => o.id === newA.id);
                      if (!matchingOld) {
                        await dbCreateAddress(userId, newA);
                      } else if (JSON.stringify(matchingOld) !== JSON.stringify(newA)) {
                        await dbUpdateAddress(userId, newA);
                      }
                    }
                  } catch (e) {
                    console.error('[AppClient] Failed to sync profile changes to MongoDB:', e);
                  }
                }
                showToast('Profile updated!');
              }}
              onNavigate={handleNavigate}
            />
          ) : (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center py-16 px-6">
              <div className="bg-white max-w-md w-full rounded-[32px] p-8 text-center border border-slate-100 shadow-md space-y-6 animate-in fade-in zoom-in-95">
                <div className="w-16 h-16 bg-[#CAF0F8] text-[#03045E] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
                  <User className="w-8 h-8 text-[#00B4D8]" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading font-extrabold text-xl text-gray-900">Access Your Personal Portal</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    View profile details, saved addresses, custom wash preferences, and repeat previous orders in one place.
                  </p>
                </div>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={() => handleDirectAuth0Login()}
                    className="w-full bg-[#03045E] hover:bg-[#023E8A] text-white py-4 rounded-2xl text-xs font-black shadow-xs cursor-pointer transition-colors"
                  >
                    Sign In with Auth0
                  </button>
                  <button
                    onClick={() => handleOpenCustomerAuth()}
                    className="w-full bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 py-3 rounded-2xl text-xs font-bold cursor-pointer transition-colors"
                  >
                    Sign In with Email / Register
                  </button>
                </div>
              </div>
            </div>
          )
        )}

        {activeTab === 'assistant' && (
          <AIAssistantView
            onOpenSchedulePickup={() => handleStartBookingWithService()}
            services={services}
          />
        )}
      </main>

      {/* Footer */}
      {['home', 'services', 'support'].includes(activeTab) && (
        <Footer onNavigate={handleNavigate} onNavigateRoleLogin={handleNavigateRoleLogin} />
      )}

      {/* Mobile Fixed Bottom Navigation Bar */}
      <MobileNav
        activeTab={activeTab}
        onNavigate={handleNavigate}
        cartCount={cart.length}
        isLoggedIn={authSession.isAuthenticated && authSession.role === 'customer'}
      />

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartDrawerOpen}
        onClose={() => setCartDrawerOpen(false)}
        cart={cart}
        onUpdateQuantity={handleUpdateCartQuantity}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
        addresses={profile?.addresses || []}
        onOrderPlaced={handleOrderPlaced}
        isLoggedIn={authSession.isAuthenticated && authSession.role === 'customer'}
        onRequireLogin={() => handleOpenCustomerAuth()}
        onAddressAdded={(newAddr) => {
          setProfile((prev) => {
            if (!prev) return prev;
            const exists = prev.addresses.some((a) => a.id === newAddr.id);
            let nextAddrs = exists
              ? prev.addresses.map((a) => (a.id === newAddr.id ? newAddr : a))
              : [...prev.addresses, newAddr];
            if (newAddr.isDefault) {
              nextAddrs = nextAddrs.map((a) => (a.id === newAddr.id ? a : { ...a, isDefault: false }));
            }
            return { ...prev, addresses: nextAddrs };
          });
        }}
      />

      {/* Quick Schedule Pickup Modal */}
      <SchedulePickupModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
        addresses={profile?.addresses || []}
        services={services}
        onAddToCartAndOpen={(service, qty) => {
          handleAddToCart(service, qty);
          setCartDrawerOpen(true);
        }}
      />

      <PostcodeCheckerModal
        isOpen={postcodeModalOpen}
        onClose={() => setPostcodeModalOpen(false)}
        onBookNow={() => {
          setPostcodeModalOpen(false);
          handleStartBookingWithService();
        }}
      />

      {/* Customer Login & Registration Modal */}
      <CustomerAuthModal
        isOpen={customerAuthOpen}
        onClose={() => setCustomerAuthOpen(false)}
        onLoginSuccess={handleCustomerLoginSuccess}
        onNavigateRoleLogin={handleNavigateRoleLogin}
      />

      {/* Complete Profile Modal for capturing Username and Mobile Number */}
      <CompleteProfileModal
        isOpen={completeProfileModalOpen}
        userId={authSession.user?.id || getStoredSession()?.user?.id || ''}
        initialUsername={profile?.name || authSession.user?.name || auth0User?.name || ''}
        initialPhone={profile?.phone || ''}
        onSuccess={(updatedName, updatedPhone) => {
          setCompleteProfileModalOpen(false);
          if (profile) {
            setProfile({
              ...profile,
              name: updatedName,
              phone: updatedPhone,
            });
          }
          if (authSession.user) {
            setAuthSession((prev) => ({
              ...prev,
              user: prev.user ? { ...prev.user, name: updatedName } : null,
            }));
          }
          showToast('✅ Profile saved to database successfully!');
          try {
            const shouldOpenCart = localStorage.getItem('laundelle_open_cart') === 'true';
            if (shouldOpenCart) {
              localStorage.removeItem('laundelle_open_cart');
              setCartDrawerOpen(true);
            }
          } catch {}
        }}
        onClose={() => setCompleteProfileModalOpen(false)}
      />

      {/* Invoice Modal */}
      <InvoiceReceiptModal
        isOpen={!!activeInvoiceOrder}
        order={activeInvoiceOrder}
        onClose={() => setActiveInvoiceOrder(null)}
      />

      {/* Reschedule/Cancel Modal */}
      <RescheduleCancelModal
        isOpen={!!rescheduleCancelOrder}
        order={rescheduleCancelOrder}
        mode={rescheduleCancelMode}
        onClose={() => setRescheduleCancelOrder(null)}
        onConfirmReschedule={(orderId, date, slot) => {
          handleOrderRescheduled(orderId, date, slot);
          setRescheduleCancelOrder(null);
        }}
        onConfirmCancel={(orderId, reason) => {
          handleOrderCancelled(orderId, reason);
          setRescheduleCancelOrder(null);
        }}
      />

      {/* Additional Charge Modal */}
      {activeChargeOrder && activeChargeOrder.additionalCharge && (
        <AdditionalChargeModal
          isOpen={!!activeChargeOrder}
          orderId={activeChargeOrder.id}
          charge={activeChargeOrder.additionalCharge}
          onClose={() => setActiveChargeOrder(null)}
          onAccept={(orderId) => {
            setOrders(orders.map(o => {
              if (o.id === orderId && o.additionalCharge) {
                return {
                  ...o,
                  total: o.total + o.additionalCharge.additionalAmount,
                  additionalCharge: {
                    ...o.additionalCharge,
                    status: 'accepted'
                  }
                };
              }
              return o;
            }));
            showToast('Additional charge accepted.');
            setActiveChargeOrder(null);
          }}
          onReject={(orderId) => {
            setOrders(orders.map(o => {
              if (o.id === orderId && o.additionalCharge) {
                return {
                  ...o,
                  additionalCharge: {
                    ...o.additionalCharge,
                    status: 'rejected'
                  }
                };
              }
              return o;
            }));
            showToast('Additional charge rejected and sent for manual review.');
            setActiveChargeOrder(null);
          }}
        />
      )}

      {serviceToCustomize && (
        <ServiceCustomizeModal
          service={serviceToCustomize}
          onClose={() => setServiceToCustomize(null)}
          onAddToCart={(service, qty, opt, inst) => {
            handleAddToCart(service, qty, opt, inst);
          }}
        />
      )}

      {/* Order Placed Delivery Truck Animation Modal */}
      <OrderPlacedAnimationModal
        isOpen={Boolean(animationModalOrder)}
        order={animationModalOrder}
        onClose={() => setAnimationModalOrder(null)}
        onCancelOrder={(orderId, reason) => {
          handleOrderCancelled(orderId, reason);
          setAnimationModalOrder(null);
        }}
        onTrackOrder={(orderId) => {
          setSelectedTrackingOrderId(orderId);
          setActiveTab('orders');
          setAnimationModalOrder(null);
        }}
      />
    </div>
  );
}

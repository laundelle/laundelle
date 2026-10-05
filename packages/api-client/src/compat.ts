/**
 * db.ts — MongoDB Client Utility
 * All data operations proxy to our secure server-side API at /api/db.
 */

declare const process: any;


export const getApiBase = (): string => {
  if (typeof window !== 'undefined') {
    // In browser context across all portals (customer, operations, admin),
    // always use relative path ('') so requests route through the Next.js server
    // rewrite proxy (/api/:path* -> http://127.0.0.1:4000/api/:path*).
    // This completely eliminates CORS issues, mixed-content errors, and avoids
    // needing to expose or tunnel port 4000.
    return '';
  }

  // Server-side context (SSR / node)
  if (typeof process !== 'undefined') {
    const internalUrl = process.env?.INTERNAL_API_URL || process.env?.NEXT_PUBLIC_API_URL;
    if (internalUrl && !internalUrl.includes('devtunnels.ms') && !internalUrl.includes('ngrok')) {
      return internalUrl.replace(/\/$/, '');
    }
  }
  return 'http://localhost:4000';
};
export const apiUrl = (path: string): string => `${getApiBase()}${path.startsWith('/') ? path : '/' + path}`;
export const apiFetch = (path: string, init?: RequestInit): Promise<Response> => {
  return fetch(apiUrl(path), init);
};

import { UserProfile, UserAddress, UserPreferences, Order, CustomerNotification } from '@laundelle/types';

// ─── Auth Session Helpers ─────────────────────────────────────────────────────

export interface MongoAuthSession {
    token: string;
    user: {
        id: string;
        email: string;
        name: string;
        role?: string;
    };
    isAuthenticated: boolean;
}

const SESSION_KEY = 'l2u_auth_session';

export function getStoredSession(): MongoAuthSession | null {
    if (typeof window === 'undefined') return null;
    try {
        const raw = localStorage.getItem(SESSION_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        return parsed?.token ? (parsed as MongoAuthSession) : null;
    } catch {
        return null;
    }
}

export function saveSession(session: MongoAuthSession): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    window.dispatchEvent(new Event('l2u_auth_change'));
}

export function clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SESSION_KEY);
    window.dispatchEvent(new Event('l2u_auth_change'));
}

function getAuthToken(): string | null {
    return getStoredSession()?.token ?? null;
}

export function authHeaders(): HeadersInit {
    const token = getAuthToken();
    return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
}

// ─── Auth Actions ─────────────────────────────────────────────────────────────

export interface AuthResult {
    user: { id: string; email: string; name: string; phone?: string; role?: string } | null;
    token: string | null;
    error: string | null;
    needsProfileCompletion?: boolean;
}

function getErrorMessage(err: any, fallback: string): string {
    if (!err) return fallback;
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
        return err.message || err.code || fallback;
    }
    return String(err);
}

export async function mongoSignIn(email: string, password: string): Promise<AuthResult> {
    try {
        const res = await apiFetch('/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return { user: null, token: null, error: getErrorMessage(data.error, 'Login failed') };

        const session: MongoAuthSession = {
            token: data.token,
            user: data.user,
            isAuthenticated: true,
        };
        saveSession(session);
        return { user: data.user, token: data.token, error: null };
    } catch (e: any) {
        return { user: null, token: null, error: e.message || 'Network error' };
    }
}

export async function mongoSignUp(
    email: string,
    password: string,
    fullName: string,
    phone: string
): Promise<AuthResult> {
    try {
        const res = await apiFetch('/api/v1/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, fullName, phone }),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return { user: null, token: null, error: getErrorMessage(data.error, 'Registration failed') };

        const session: MongoAuthSession = {
            token: data.token,
            user: data.user,
            isAuthenticated: true,
        };
        saveSession(session);
        return { user: data.user, token: data.token, error: null };
    } catch (e: any) {
        return { user: null, token: null, error: e.message || 'Network error' };
    }
}

export async function dbAuth0Sync(auth0User: {
    email: string;
    name?: string;
    sub?: string;
    picture?: string;
}): Promise<AuthResult> {
    try {
        const res = await apiFetch('/api/v1/auth/auth0-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(auth0User),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) {
            return { user: null, token: null, error: getErrorMessage(data.error, 'Auth0 synchronization failed') };
        }

        const session: MongoAuthSession = {
            token: data.token,
            user: data.user,
            isAuthenticated: true,
        };
        saveSession(session);
        return { 
            user: data.user, 
            token: data.token, 
            error: null,
            needsProfileCompletion: Boolean(data.needsProfileCompletion || !data.user?.phone)
        };
    } catch (e: any) {
        return { user: null, token: null, error: e.message || 'Network error' };
    }
}

export function mongoSignOut(): void {
    clearSession();
}

// ─── Local Caches ─────────────────────────────────────────────────────────────

const LOCAL_PROFILE_KEY = 'l2u_customer_profile';
const LOCAL_ORDERS_KEY = 'l2u_customer_orders';
const LOCAL_NOTIF_KEY = 'l2u_customer_notifications';
const LOCAL_SERVICES_KEY = 'l2u_services';

function getLocal<T>(key: string, fallback: T): T {
    try {
        if (typeof window === 'undefined') return fallback;
        const v = localStorage.getItem(key);
        return v ? JSON.parse(v) : fallback;
    } catch {
        return fallback;
    }
}

function setLocal<T>(key: string, val: T): void {
    try {
        if (typeof window === 'undefined') return;
        localStorage.setItem(key, JSON.stringify(val));
    } catch { }
}

const DEFAULT_PROFILE: UserProfile = {
    name: 'Guest Customer',
    email: '',
    phone: '',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    walletBalance: 25.0,
    rewardPoints: 120,
    addresses: [],
    preferences: {
        detergent: 'Standard',
        softener: 'Standard',
        fragrance: 'Fresh Linen',
        foldingPreference: 'Standard Flat Fold',
        starchedShirts: 'No Starch',
        smsNotifications: true,
        emailReceipts: true,
        whatsappUpdates: true,
        marketingEmails: false,
    },
};

// ─── Postcode & Waiting List ────────────────────────────────────────────────

export async function checkPostcodeSectorActive(postcode: string): Promise<boolean> {
    try {
        const res = await apiFetch('/api/v1/platform/postcodes/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postcode }),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        return !!data.isServiceable;
    } catch {
        return false;
    }
}

export async function checkPostcodeCoverage(postcode: string): Promise<{
    isServiceable: boolean;
    location: string | null;
    city?: string | null;
    district?: string | null;
    plantId?: string | null;
    plantCode?: string | null;
    plantName?: string | null;
    managerName?: string | null;
    services?: any[];
}> {
    try {
        const res = await apiFetch('/api/v1/platform/postcodes/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ postcode }),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        return {
            isServiceable: !!data.isServiceable,
            location: data.location || null,
            city: data.city || null,
            district: data.district || null,
            plantId: data.plantId || null,
            plantCode: data.plantCode || null,
            plantName: data.plantName || null,
            managerName: data.managerName || null,
            services: data.services || []
        };
    } catch {
        return { isServiceable: false, location: null, services: [] };
    }
}

export const SERVICE_NAME_IMAGES: Record<string, string> = {
    'Basic Alterations & Repairs': '/Images/Basic Alterations & Repairs.png',
    'Curtains & Heavy Drapes': '/Images/Curtains & Heavy Drapes.png',
    'Duvets & Bulky Bedding': '/Images/Duvets & Bulky Bedding.png',
    'Express Same-Day Service': '/Images/Express Same-Day Service.png',
    'Leather & Suede Jackets': '/Images/Leather & Suede Jackets.png',
    'Pet Beds & Blankets': '/Images/Pet Beds & Blankets.png',
    'Silk & Delicates Care': '/Images/Silk & Delicates Care.png',
    'Sneaker & Shoe Deep Clean': '/Images/Sneaker & Shoe Deep Clean.png',
    'Sports & Activewear': '/Images/Sports & Activewear.png',
    'Steam Ironing & Pressing': '/Images/Steam Ironing & Pressing.png',
    'Suit & Jacket Dry Cleaning': '/Images/Suit & Jacket Dry Cleaning.png',
    'Wash + Dry + Fold': '/Images/Wash + Dry + Fold.png',
    'Wash + Steam Iron': '/Images/Wash + Steam Iron.png',
    'Wedding Dress Preservation': '/Images/Wedding Dress Preservation.png',
};

export function resolveServiceImage(s: { name?: string; id?: string; image?: string; category?: string }): string {
    if (s.name && SERVICE_NAME_IMAGES[s.name]) {
        return SERVICE_NAME_IMAGES[s.name];
    }
    if (s.image && s.image.startsWith('/Images/')) {
        return s.image;
    }
    if (s.name) {
        return `/Images/${s.name}.png`;
    }
    return s.image || '/Images/Wash + Dry + Fold.png';
}

export async function dbFetchServices(): Promise<any[]> {
    const cached = getLocal<any[]>(LOCAL_SERVICES_KEY, []);
    try {
        const res = await apiFetch('/api/v1/platform/services', {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (data.error) throw new Error(data.error);
        const servicesArray = Array.isArray(data) ? data : (data.services || []);
        
        // Ensure every service uses its matching image from public/Images/<name>.png
        const sanitized = servicesArray.map((s: any) => ({
            ...s,
            image: resolveServiceImage(s),
        }));

        setLocal(LOCAL_SERVICES_KEY, sanitized);
        return sanitized;
    } catch (e) {
        console.error('[db] dbFetchServices:', e);
        return cached.map((s: any) => ({
            ...s,
            image: resolveServiceImage(s),
        }));
    }
}

export async function joinWaitingList(entry: {
    full_name: string;
    email: string;
    phone?: string;
    postcode: string;
    requested_service_id?: string;
    launch_notification_consent: boolean;
}): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/platform/waitlist', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(entry),
        });
        if (!res.ok) {
            const data = await res.json();
            return { success: false, error: data.error || 'Failed to join waitlist' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

// ─── Profile ─────────────────────────────────────────────────────────────────

export async function dbFetchProfile(_userId?: string): Promise<UserProfile> {
    const cached = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    try {
        const res = await apiFetch('/api/v1/users/me', {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (data.error) throw new Error(data.error);
        setLocal(LOCAL_PROFILE_KEY, data);
        return data as UserProfile;
    } catch (e) {
        console.error('[db] dbFetchProfile:', e);
        return cached;
    }
}

export async function dbUpdateProfile(_userId: string, name: string, phone: string): Promise<void> {
    const local = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    local.name = name;
    local.phone = phone;
    setLocal(LOCAL_PROFILE_KEY, local);
    try {
        await apiFetch('/api/v1/users/me', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ name, phone }),
        });
    } catch (e) {
        console.error('[db] dbUpdateProfile:', e);
    }
}

export async function dbUpdatePreferences(_userId: string, prefs: UserPreferences): Promise<void> {
    const local = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    local.preferences = prefs;
    setLocal(LOCAL_PROFILE_KEY, local);
    try {
        await apiFetch('/api/v1/users/me/preferences', {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ preferences: prefs }),
        });
    } catch (e) {
        console.error('[db] dbUpdatePreferences:', e);
    }
}

// ─── Addresses ───────────────────────────────────────────────────────────────

export async function dbCreateAddress(_userId: string, address: UserAddress): Promise<void> {
    const local = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    if (address.isDefault) local.addresses.forEach((a) => (a.isDefault = false));
    local.addresses.push(address);
    setLocal(LOCAL_PROFILE_KEY, local);
    try {
        await apiFetch('/api/v1/users/me/addresses', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(address),
        });
    } catch (e) {
        console.error('[db] dbCreateAddress:', e);
    }
}

export async function dbUpdateAddress(_userId: string, address: UserAddress): Promise<void> {
    const local = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    if (address.isDefault) local.addresses.forEach((a) => (a.isDefault = false));
    local.addresses = local.addresses.map((a) => (a.id === address.id ? address : a));
    setLocal(LOCAL_PROFILE_KEY, local);
    try {
        await apiFetch(`/api/v1/users/me/addresses/${address.id}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(address),
        });
    } catch (e) {
        console.error('[db] dbUpdateAddress:', e);
    }
}

export async function dbDeleteAddress(_userId: string, addressId: string): Promise<void> {
    const local = getLocal<UserProfile>(LOCAL_PROFILE_KEY, DEFAULT_PROFILE);
    local.addresses = local.addresses.filter((a) => a.id !== addressId);
    setLocal(LOCAL_PROFILE_KEY, local);
    try {
        await apiFetch(`/api/v1/users/me/addresses/${addressId}`, {
            method: 'DELETE',
            headers: authHeaders(),
        });
    } catch (e) {
        console.error('[db] dbDeleteAddress:', e);
    }
}

// ─── Orders ──────────────────────────────────────────────────────────────────

export async function dbFetchOrders(_userId?: string): Promise<Order[]> {
    try {
        // SECURITY: Do NOT pass session_id here.
        // Payment confirmation must only happen via POST /api/stripe/confirm-session (explicit)
        // or via the Stripe webhook. Auto-injecting session_id to GET /orders was allowing
        // orders to be confirmed without a running webhook (direct Stripe API call).
        const res = await apiFetch('/api/v1/orders', {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (data.error) throw new Error(data.error);
        const ordersArray = Array.isArray(data) ? data : (data.orders || []);
        setLocal(LOCAL_ORDERS_KEY, ordersArray);
        return ordersArray;
    } catch (e) {
        console.error('[db] dbFetchOrders:', e);
        return getLocal<Order[]>(LOCAL_ORDERS_KEY, []);
    }
}

export async function dbCreateOrder(userIdOrOrder: string | Order, maybeOrder?: Order): Promise<Order | any> {
    const order: Order = (typeof userIdOrOrder === 'string' ? maybeOrder : userIdOrOrder) as Order;
    if (!order) {
        console.error('[db] dbCreateOrder called without an order object');
        return;
    }

    // SECURITY: Completely block online payment orders from being created via this function.
    // All Stripe payment orders are created ONLY when the webhook fires (checkout.session.completed).
    // dbCreateOrder must ONLY be used for Cash on Delivery orders.
    const isCash = order.paymentMethod === 'Cash on Delivery' || order.paymentMethod === 'Cash';
    if (!isCash) {
        console.error(
            '[db] dbCreateOrder blocked: online payment orders cannot be created client-side. ' +
            'Orders are created by the Stripe webhook after payment is confirmed.'
        );
        throw new Error(
            'Online payment orders cannot be submitted directly. ' +
            'Your order will be confirmed automatically once payment is verified by Stripe.'
        );
    }

    const local = getLocal<Order[]>(LOCAL_ORDERS_KEY, []);
    local.unshift(order);
    setLocal(LOCAL_ORDERS_KEY, local);

    try {
        const res = await apiFetch('/api/v1/orders', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(order),
        });
        if (res.ok) {
            const data = await res.json();
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new Event('l2u_orders_change'));
                window.dispatchEvent(new Event('l2u_driver_assignments_changed'));
            }
            return data.data || data.order || data;
        }
    } catch (e) {
        console.error('[db] dbCreateOrder:', e);
    }
    if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('l2u_orders_change'));
        window.dispatchEvent(new Event('l2u_driver_assignments_changed'));
    }
    return order;
}

export async function dbCancelOrder(_userId: string, orderId: string, reason: string = 'Customer requested cancellation'): Promise<{ success: boolean; error?: string }> {
    const local = getLocal<Order[]>(LOCAL_ORDERS_KEY, []);
    setLocal(
        LOCAL_ORDERS_KEY,
        local.map((o) => (o.id === orderId ? { ...o, status: 'cancelled' as const, statusLabel: 'Cancelled', cancelReason: reason } : o))
    );
    try {
        const res = await apiFetch(`/api/v1/orders/${orderId}/cancel`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            return { success: false, error: data.error?.message || data.error || 'Failed to cancel order' };
        }
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('l2u_orders_change'));
        }
        return { success: true };
    } catch (e: any) {
        console.error('[db] dbCancelOrder:', e);
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbRescheduleOrder(
    _userId: string,
    orderId: string,
    newDate: string,
    newTime: string
): Promise<void> {
    const local = getLocal<Order[]>(LOCAL_ORDERS_KEY, []);
    setLocal(
        LOCAL_ORDERS_KEY,
        local.map((o) => (o.id === orderId ? { ...o, pickupDate: newDate, pickupSlot: newTime, pickupTime: newTime } : o))
    );
    try {
        await apiFetch(`/api/v1/orders/${orderId}/reschedule`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ newDate, newTime }),
        });
    } catch (e) {
        console.error('[db] dbRescheduleOrder:', e);
    }
}

// ─── Notifications ────────────────────────────────────────────────────────────

export async function dbFetchNotifications(_userId?: string): Promise<CustomerNotification[]> {
    try {
        const res = await apiFetch('/api/v1/notifications', {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (data.error) throw new Error(data.error);
        setLocal(LOCAL_NOTIF_KEY, data.items || []);
        return data.items || [];
    } catch (e) {
        console.error('[db] dbFetchNotifications:', e);
        return getLocal<CustomerNotification[]>(LOCAL_NOTIF_KEY, []);
    }
}

export async function dbMarkNotificationRead(notificationId: string): Promise<void> {
    const local = getLocal<CustomerNotification[]>(LOCAL_NOTIF_KEY, []);
    setLocal(
        LOCAL_NOTIF_KEY,
        local.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    );
    try {
        await apiFetch(`/api/v1/notifications/${notificationId}/read`, {
            method: 'PATCH',
            headers: authHeaders(),
        });
    } catch (e) {
        console.error('[db] dbMarkNotificationRead:', e);
    }
}

export async function dbMarkAllNotificationsRead(): Promise<void> {
    const local = getLocal<CustomerNotification[]>(LOCAL_NOTIF_KEY, []);
    setLocal(
        LOCAL_NOTIF_KEY,
        local.map((n) => ({ ...n, read: true }))
    );
    try {
        await apiFetch('/api/v1/notifications/read-all', {
            method: 'PATCH',
            headers: authHeaders(),
        });
    } catch (e) {
        console.error('[db] dbMarkAllNotificationsRead:', e);
    }
}

// ─── Support Tickets ─────────────────────────────────────────────────────────

export async function dbCreateSupportTicket(_userId: string, ticket: any): Promise<void> {
    try {
        await apiFetch('/api/v1/support/tickets', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ ticket }),
        });
    } catch (e) {
        console.error('[db] dbCreateSupportTicket:', e);
    }
}

export async function dbFetchStaff(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/admin/staff', {
            method: 'GET',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return [];
        return data.data?.staff || data.staff || [];
    } catch {
        return [];
    }
}

export async function dbFetchManagers(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/admin/staff?role=manager', {
            method: 'GET',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return [];
        const staff: any[] = data.data?.staff || data.staff || [];
        return staff.filter((s: any) => s.role === 'manager');
    } catch {
        return [];
    }
}

export async function dbFetchManagerDetails(managerId: string): Promise<{ staff: any; plant: any | null; inheritedPostcodes: string[] } | null> {
    try {
        const res = await apiFetch(`/api/v1/admin/staff/${managerId}`, {
            method: 'GET',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return null;
        return data.data || data;
    } catch {
        return null;
    }
}


export async function dbCreateStaffMember(staffData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/staff', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(staffData),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to create staff member' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbUpdateStaffMember(staffId: string, staffData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/admin/staff/${staffId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(staffData),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to update staff member' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbFetchPlants(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/admin/plants', {
            method: 'GET',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return [];
        return data.data?.plants || data.plants || [];
    } catch {
        return [];
    }
}

export async function dbCreatePlant(plantData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/plants', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(plantData),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to create plant' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbUpdatePlant(plantId: string, plantData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/admin/plants/${plantId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(plantData),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to update plant' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbFetchAdminDashboardMetrics(location?: string): Promise<any> {
    try {
        const url = location && location !== 'All Locations'
            ? `/api/v1/admin/metrics?location=${encodeURIComponent(location)}`
            : '/api/v1/admin/metrics';
        const res = await apiFetch(url, {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function dbFetchManagerDashboard(): Promise<any> {
    try {
        const res = await apiFetch('/api/v1/manager/dashboard', {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function dbFetchManagerOrders(status?: string): Promise<any[]> {
    try {
        const url = status && status !== 'all' 
            ? `/api/v1/manager/orders?status=${encodeURIComponent(status)}` 
            : '/api/v1/manager/orders';
        const res = await apiFetch(url, {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return [];
        return Array.isArray(data) ? data : (data.orders || []);
    } catch {
        return [];
    }
}

export async function dbFetchManagerStaff(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/manager/staff', {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return [];
        return Array.isArray(data) ? data : (data.staff || []);
    } catch {
        return [];
    }
}

export async function dbManagerUpdateStaff(staffId: string, staffData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/staff/${staffId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ staffData }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to update staff member' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerCreateStaff(staffData: any): Promise<{ success: boolean; error?: string; staffId?: string }> {
    try {
        const res = await apiFetch('/api/v1/manager/staff', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ staffData }),
        });
        const data = await res.json();
        if (!res.ok || data.error) {
            const msg = typeof data.error === 'string' ? data.error : data.error?.message;
            return { success: false, error: msg || 'Failed to create staff member' };
        }
        return { success: true, staffId: data.staffId };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerAssignDriver(orderId: string, driverId?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/orders/${encodeURIComponent(orderId)}/assign-driver`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ driverId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error || 'Failed to assign driver' };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerAssignProcessor(orderId: string, processorId?: string | null): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/orders/${encodeURIComponent(orderId)}/assign-processor`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ processorId }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error || 'Failed to assign processor' };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerOrderOverride(orderId: string, action: string, data?: any): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/orders/${encodeURIComponent(orderId)}/override`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ action, data }),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to perform override' };
        return { success: true, status: json.status };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerBatchReassignOrders(orderIds: string[], targetId: string | null, type: 'driver' | 'processor'): Promise<{ success: boolean; error?: string; results?: any[] }> {
    try {
        const res = await apiFetch('/api/v1/manager/orders/batch-reassign', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ orderIds, targetId, type }),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to batch reassign orders' };
        return { success: true, results: json.results };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbManagerReassignAllDriverOrders(driverId: string, targetDriverId: string | null): Promise<{ success: boolean; error?: string; count?: number; message?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/drivers/${encodeURIComponent(driverId)}/reassign-all`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ targetDriverId }),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to reassign driver orders' };
        return { success: true, count: json.count, message: json.message };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbFetchOrderAuditLogs(orderId: string): Promise<{ success: boolean; error?: string; logs?: any[] }> {
    try {
        const res = await apiFetch(`/api/v1/manager/orders/${encodeURIComponent(orderId)}/audit-logs`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to fetch audit logs' };
        return { success: true, logs: json.logs || [] };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbFetchManagerIncidents(filters?: { status?: string; orderId?: string; type?: string; priority?: string }): Promise<{ success: boolean; error?: string; incidents?: any[] }> {
    try {
        const params = new URLSearchParams();
        if (filters?.status && filters.status !== 'all') params.set('status', filters.status);
        if (filters?.orderId) params.set('orderId', filters.orderId);
        if (filters?.type && filters.type !== 'all') params.set('type', filters.type);
        if (filters?.priority && filters.priority !== 'all') params.set('priority', filters.priority);

        const qs = params.toString() ? `?${params.toString()}` : '';
        const res = await apiFetch(`/api/v1/manager/incidents${qs}`, {
            headers: authHeaders(),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to fetch incidents' };
        return { success: true, incidents: json.incidents || [] };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbCreateManagerIncident(incidentData: any): Promise<{ success: boolean; error?: string; incident?: any }> {
    try {
        const res = await apiFetch('/api/v1/manager/incidents', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(incidentData),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to file incident' };
        return { success: true, incident: json.incident };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbAddIncidentNote(incidentId: string, note: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/incidents/${encodeURIComponent(incidentId)}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ note }),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to add note' };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbResolveIncident(incidentId: string, resolutionData: { type: string; amount?: number; creditVoucherCode?: string; explanation: string }): Promise<{ success: boolean; error?: string; status?: string }> {
    try {
        const res = await apiFetch(`/api/v1/manager/incidents/${encodeURIComponent(incidentId)}/resolve`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(resolutionData),
        });
        const json = await res.json();
        if (!res.ok || json.error) return { success: false, error: json.error || 'Failed to resolve incident' };
        return { success: true, status: json.status };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbAdminFetchOrders(status?: string): Promise<any[]> {
    try {
        const session = getStoredSession();
        const isManager = session?.user?.role === 'manager';
        const baseEndpoint = isManager ? '/api/v1/manager/orders' : '/api/v1/admin/orders';
        const url = status && status !== 'all'
            ? `${baseEndpoint}?status=${encodeURIComponent(status)}`
            : baseEndpoint;

        const res = await apiFetch(url, {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return [];
        return Array.isArray(data) ? data : (data.orders || []);
    } catch {
        return [];
    }
}

export async function dbAdminUpdateOrderStatus(
    orderId: string,
    newStatus: string,
    reason?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const session = getStoredSession();
        const isManager = session?.user?.role === 'manager';
        const endpoint = isManager 
            ? `/api/v1/manager/orders/${orderId}/status` 
            : `/api/v1/admin/orders/${orderId}/status`;
        const res = await apiFetch(endpoint, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify({ newStatus, reason }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error || 'Failed to update order status' };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbFetchPostcodeSectors(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/platform/postcodes', {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return [];
        return data.postcodes || [];
    } catch {
        return [];
    }
}

export async function dbUpdatePostcodeSector(district: string, sector: string, updates: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/platform/postcodes/${district}-${sector}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(updates),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error?.message || 'Failed to update postcode sector' };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbSearchPostcodeDistricts(query: string): Promise<string[]> {
    if (!query || !query.trim()) return [];
    try {
        const res = await apiFetch(`/api/v1/platform/postcodes/search?q=${encodeURIComponent(query)}`, {
            method: 'GET',
            headers: authHeaders(),
        });
        if (res.ok) {
            const json = await res.json();
            const data = json.success ? json.data : json;
            if (Array.isArray(data.districts)) {
                return data.districts;
            }
        }
    } catch (e) {
        console.error('Error searching postcode districts:', e);
    }
    return [];
}


export async function dbFetchSlots(params?: { postcode?: string; plant_id?: string }): Promise<any[]> {
    try {
        const searchParams = new URLSearchParams();
        if (params?.postcode) searchParams.set('postcode', params.postcode);
        if (params?.plant_id) searchParams.set('plant_id', params.plant_id);
        const query = searchParams.toString() ? `?${searchParams.toString()}` : '';
        const res = await apiFetch(`/api/v1/platform/slots${query}`, {
            method: 'GET',
            headers: authHeaders(),
        });
        const json = await res.json();
        const data = json.success ? json.data : json;
        if (!res.ok || data.error) return [];
        return Array.isArray(data) ? data : (data.slots || []);
    } catch {
        return [];
    }
}

export async function dbCreateSlot(slotData: any): Promise<{ success: boolean; data?: any; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/platform/slots', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(slotData)
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            return { success: false, error: json.error?.message || json.error || 'Failed to create slot' };
        }
        return { success: true, data: json.data };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbUpdateSlot(slotId: string, updates: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/platform/slots/${slotId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(updates)
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            return { success: false, error: json.error?.message || json.error || 'Failed to update slot' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}

export async function dbDeleteSlot(slotId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/platform/slots/${slotId}`, {
            method: 'DELETE',
            headers: authHeaders()
        });
        const json = await res.json();
        if (!res.ok || !json.success) {
            return { success: false, error: json.error?.message || json.error || 'Failed to delete slot' };
        }
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message || 'Network error' };
    }
}


// ─── Driver API ───────────────────────────────────────────────────────────────

export async function dbDriverFetchAssignments(): Promise<{ driver: any; assigned: any[]; completed: any[]; available_deliveries: any[] }> {
    try {
        const res = await apiFetch('/api/v1/driver/jobs', {
            method: 'GET',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { driver: null, assigned: [], completed: [], available_deliveries: [] };
        return { driver: data.driver, assigned: data.assigned || [], completed: data.completed || [], available_deliveries: data.available_deliveries || [] };
    } catch {
        return { driver: null, assigned: [], completed: [], available_deliveries: [] };
    }
}

export async function dbDriverUpdateAvailability(availability: 'available' | 'busy' | 'offline'): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/driver/availability', {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ isAvailable: availability === 'available' }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverMarkArrived(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/arrive`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverSendOtp(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/otp/send`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverConfirmPickup(
    orderId: string,
    otp: string,
    photoUrls?: string[] | string,
    pieceCount?: number
): Promise<{ success: boolean; error?: string }> {
    try {
        const photos = Array.isArray(photoUrls)
            ? photoUrls
            : photoUrls
            ? [photoUrls]
            : [];
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/pickup/confirm`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ otp, qrTagId: `qr_${orderId}`, bagCount: 1, pieceCount, photoUrls: photos }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverRejectJob(orderId: string, reason: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/reject`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverAcceptDelivery(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/delivery/accept`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverRejectDelivery(orderId: string, reason: string): Promise<{ success: boolean; error?: string; reassignedDriverId?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/delivery/reject`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ reason }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true, reassignedDriverId: data.reassignedDriverId };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverConfirmPackageHandover(orderId: string, packageQr: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/handover/confirm`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ packageQr }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverStartDelivery(orderId: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/delivery/start`, {
            method: 'POST',
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbDriverConfirmDelivery(
    orderId: string,
    otp: string,
    notes?: string,
    photoUrls?: string[],
    signatureUrl?: string
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/driver/jobs/${orderId}/delivery/confirm`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                otp,
                notes: notes || '',
                photoUrls: photoUrls || [],
                signatureUrl: signatureUrl || ''
            }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── Processor API ────────────────────────────────────────────────────────────

export async function dbProcessorFetchJobs(): Promise<{ processor: any; assigned: any[]; queue: any[]; completed: any[] }> {
    try {
        const res = await apiFetch('/api/v1/processor/jobs', {
            method: 'GET',
            headers: authHeaders()
        });
        const data = await res.json();
        if (!res.ok || data.error) return { processor: null, assigned: [], queue: [], completed: [] };
        return {
            processor: data.processor,
            assigned: data.assigned || [],
            queue: data.queue || [],
            completed: data.completed || []
        };
    } catch {
        return { processor: null, assigned: [], queue: [], completed: [] };
    }
}

export async function dbProcessorUpdateAvailability(availability: 'available' | 'busy' | 'offline'): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/processor/availability', {
            method: 'PUT',
            headers: authHeaders(),
            body: JSON.stringify({ availability }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbProcessorIntakeOrder(
    orderId: string,
    actualWeightKg: number,
    photoUrls: string[],
    bagCondition: string,
    restrictedItems: string[],
    processingAction?: string
): Promise<{ success: boolean; error?: string; additionalCharge?: any; newStatus?: string; packageObj?: any }> {
    try {
        const res = await apiFetch(`/api/v1/processor/jobs/${encodeURIComponent(orderId)}/intake`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                actualWeightKg,
                photoUrls,
                bagCondition,
                restrictedItems,
                processingAction: processingAction || 'washing'
            }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return {
            success: true,
            additionalCharge: data.additionalCharge,
            newStatus: data.newStatus,
            packageObj: data.packageObj
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbProcessorUpdateStage(
    orderId: string,
    qrCode: string,
    nextStage: 'washing' | 'drying' | 'folding' | 'qc_ready'
): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/processor/jobs/${orderId}/stage`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                qrCode,
                nextStage
            }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbProcessorQualityCheck(
    orderId: string,
    status: 'passed' | 'rewash',
    notes: string,
    reason?: string
): Promise<{ success: boolean; error?: string; status?: string; reassigned?: boolean }> {
    try {
        const res = await apiFetch(`/api/v1/processor/jobs/${orderId}/qc`, {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({
                status,
                notes,
                reason
            }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return {
            success: true,
            status: data.status,
            reassigned: data.reassigned
        };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

// ─── Admin CRM & Real Data Helpers ───────────────────────────────────────────

export async function dbAdminFetchCustomers(search?: string, status?: string): Promise<{ customers: any[]; flags: any[]; notes: any[] }> {
    try {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (status && status !== 'all') params.append('status', status);
        const res = await apiFetch(`/api/v1/admin/customers?${params.toString()}`, {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { customers: [], flags: [], notes: [] };
        return {
            customers: data.customers || [],
            flags: data.flags || [],
            notes: data.notes || []
        };
    } catch {
        return { customers: [], flags: [], notes: [] };
    }
}

export async function dbAdminAddCustomerFlag(flagData: any): Promise<{ success: boolean; flag?: any; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/customers', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ action: 'flag', flagData }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true, flag: data.flag };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbAdminAddCustomerNote(customerId: string, note: string): Promise<{ success: boolean; note?: any; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/customers', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ action: 'note', customerId, note }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true, note: data.note };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbAdminUpdateCustomerStatus(customerId: string, status: string): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/customers', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify({ action: 'status', customerId, status }),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbAdminFetchServices(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/admin/services', {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return [];
        return data.services || [];
    } catch {
        return [];
    }
}

export async function dbAdminCreateService(serviceData: any): Promise<{ success: boolean; service?: any; error?: string }> {
    try {
        const res = await apiFetch('/api/v1/admin/services', {
            method: 'POST',
            headers: authHeaders(),
            body: JSON.stringify(serviceData),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true, service: data.service };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbAdminUpdateService(serviceId: string, serviceData: any): Promise<{ success: boolean; error?: string }> {
    try {
        const res = await apiFetch(`/api/v1/admin/services/${serviceId}`, {
            method: 'PATCH',
            headers: authHeaders(),
            body: JSON.stringify(serviceData),
        });
        const data = await res.json();
        if (!res.ok || data.error) return { success: false, error: data.error };
        return { success: true };
    } catch (e: any) {
        return { success: false, error: e.message };
    }
}

export async function dbAdminFetchFinance(): Promise<any> {
    try {
        const res = await apiFetch('/api/v1/admin/finance', {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function dbAdminFetchReports(range = '7_days'): Promise<any> {
    try {
        const res = await apiFetch(`/api/v1/admin/reports?range=${range}`, {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return null;
        return data;
    } catch {
        return null;
    }
}

export async function dbAdminFetchAuditLogs(): Promise<any[]> {
    try {
        const res = await apiFetch('/api/v1/admin/audit-logs', {
            headers: authHeaders(),
        });
        const data = await res.json();
        if (!res.ok || data.error) return [];
        return data.logs || [];
    } catch {
        return [];
    }
}


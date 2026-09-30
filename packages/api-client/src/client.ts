import { Order, UserProfile, UserAddress, UserPreferences, ServiceItem } from '@laundelle/types';
import { getAuthToken } from '@laundelle/auth';

declare const process: any;

export interface ApiClientOptions {
  baseUrl?: string;
  getToken?: () => string | null;
}

export class LaundelleApiClient {
  private baseUrl: string;
  private getToken: () => string | null;

  constructor(options: ApiClientOptions = {}) {
    this.baseUrl = options.baseUrl || (typeof process !== 'undefined' ? process.env?.NEXT_PUBLIC_API_URL || '' : '');
    this.baseUrl = this.baseUrl.replace(/\/$/, '');
    this.getToken = options.getToken || getAuthToken;
  }

  private async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    const token = this.getToken();

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string> || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    const json = await response.json().catch(() => ({}));
    if (!response.ok) {
      const errorMsg = json?.error?.message || json?.error || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return json.success && json.data !== undefined ? json.data : json;
  }

  // Auth Endpoints
  public auth = {
    login: (credentials: { email: string; password: string }) =>
      this.request('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(credentials) }),
    register: (userData: any) =>
      this.request('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(userData) }),
    logout: () =>
      this.request('/api/v1/auth/logout', { method: 'POST' }),
  };

  // Orders
  public orders = {
    get: (orderId?: string) =>
      this.request(orderId ? `/api/v1/orders/${orderId}` : '/api/v1/orders'),
    create: (orderData: Partial<Order>) =>
      this.request('/api/v1/orders', { method: 'POST', body: JSON.stringify(orderData) }),
    update: (orderId: string, updates: any) =>
      this.request(`/api/v1/orders/${orderId}`, { method: 'PATCH', body: JSON.stringify(updates) }),
    cancel: (orderId: string, reason?: string) =>
      this.request(`/api/v1/orders/${orderId}/cancel`, { method: 'POST', body: JSON.stringify({ reason }) }),
    reschedule: (orderId: string, date: string, slot: string) =>
      this.request(`/api/v1/orders/${orderId}/reschedule`, { method: 'POST', body: JSON.stringify({ date, slot }) }),
  };

  // Customer
  public customer = {
    getProfile: (userId?: string) =>
      this.request(`/api/v1/users/profile${userId ? `?userId=${userId}` : ''}`),
    updateProfile: (profileData: Partial<UserProfile>) =>
      this.request('/api/v1/users/profile', { method: 'PUT', body: JSON.stringify(profileData) }),
    updatePreferences: (prefs: UserPreferences) =>
      this.request('/api/v1/users/preferences', { method: 'PUT', body: JSON.stringify(prefs) }),
    createAddress: (address: UserAddress) =>
      this.request('/api/v1/users/addresses', { method: 'POST', body: JSON.stringify(address) }),
    getServices: () =>
      this.request<ServiceItem[]>('/api/v1/platform/services'),
    checkCoverage: (postcode: string) =>
      this.request(`/api/v1/plants/coverage?postcode=${encodeURIComponent(postcode)}`),
  };

  // Driver
  public driver = {
    getJobs: () =>
      this.request('/api/v1/driver/assignments'),
    updateAvailability: (availability: 'available' | 'busy' | 'offline') =>
      this.request('/api/v1/driver/availability', { method: 'POST', body: JSON.stringify({ availability }) }),
    markArrived: (orderId: string) =>
      this.request('/api/v1/driver/arrived', { method: 'POST', body: JSON.stringify({ orderId }) }),
    sendOtp: (orderId: string) =>
      this.request('/api/v1/driver/send-otp', { method: 'POST', body: JSON.stringify({ orderId }) }),
    confirmPickup: (orderId: string, pin: string, bagQr: string, notes?: string) =>
      this.request('/api/v1/driver/confirm-pickup', { method: 'POST', body: JSON.stringify({ orderId, pin, bagQr, notes }) }),
    startDelivery: (orderId: string) =>
      this.request('/api/v1/driver/start-delivery', { method: 'POST', body: JSON.stringify({ orderId }) }),
    confirmDelivery: (orderId: string, pin: string, notes?: string) =>
      this.request('/api/v1/driver/confirm-delivery', { method: 'POST', body: JSON.stringify({ orderId, pin, notes }) }),
  };

  // Processor
  public processor = {
    getJobs: () =>
      this.request('/api/v1/processor/jobs'),
    updateAvailability: (availability: 'available' | 'busy' | 'offline') =>
      this.request('/api/v1/processor/availability', { method: 'POST', body: JSON.stringify({ availability }) }),
    intakeOrder: (orderId: string, weightKg: number, photos?: string[]) =>
      this.request('/api/v1/processor/intake', { method: 'POST', body: JSON.stringify({ orderId, weightKg, photos }) }),
    updateStage: (orderId: string, stage: string, machineId?: string) =>
      this.request('/api/v1/processor/stage', { method: 'POST', body: JSON.stringify({ orderId, stage, machineId }) }),
    qualityCheck: (orderId: string, passed: boolean, notes?: string, rewashReason?: string) =>
      this.request('/api/v1/processor/quality-check', { method: 'POST', body: JSON.stringify({ orderId, passed, notes, rewashReason }) }),
  };

  // Manager
  public manager = {
    getDashboard: () =>
      this.request('/api/v1/manager/dashboard'),
    getOrders: (status?: string) =>
      this.request(`/api/v1/manager/orders${status ? `?status=${status}` : ''}`),
    getDrivers: () =>
      this.request('/api/v1/manager/staff?role=driver'),
    getProcessors: () =>
      this.request('/api/v1/manager/staff?role=processor'),
    assignDriver: (orderId: string, driverId: string | null) =>
      this.request('/api/v1/manager/assign-driver', { method: 'POST', body: JSON.stringify({ orderId, driverId }) }),
    assignProcessor: (orderId: string, processorId: string | null) =>
      this.request('/api/v1/manager/assign-processor', { method: 'POST', body: JSON.stringify({ orderId, processorId }) }),
    orderOverride: (orderId: string, action: string, data?: any) =>
      this.request('/api/v1/manager/order-override', { method: 'POST', body: JSON.stringify({ orderId, action, data }) }),
    getIncidents: (filters?: any) =>
      this.request('/api/v1/manager/incidents'),
  };

  // Admin
  public admin = {
    getMetrics: () =>
      this.request('/api/v1/admin/dashboard'),
    getUsers: () =>
      this.request('/api/v1/admin/users'),
    getCustomers: (search?: string) =>
      this.request(`/api/v1/admin/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
    getOrders: (status?: string) =>
      this.request(`/api/v1/admin/orders${status ? `?status=${status}` : ''}`),
    updateOrderStatus: (orderId: string, status: string, notes?: string) =>
      this.request(`/api/v1/admin/orders/${orderId}/status`, { method: 'PATCH', body: JSON.stringify({ status, notes }) }),
    getPlants: () =>
      this.request('/api/v1/admin/plants'),
    getStaff: () =>
      this.request('/api/v1/admin/staff'),
    getFinance: () =>
      this.request('/api/v1/admin/finance'),
    getReports: (range = '7_days') =>
      this.request(`/api/v1/admin/reports?range=${range}`),
    getAuditLogs: () =>
      this.request('/api/v1/admin/audit-logs'),
  };
}

// Default global instance
export const api = new LaundelleApiClient();

export type AdminRole = 'super_admin' | 'admin' | 'manager' | 'driver' | 'processor';

export type AdminViewTab =
  | 'dashboard'
  | 'orders'
  | 'customers'
  | 'drivers'
  | 'processors'
  | 'staff'
  | 'services'
  | 'areas'
  | 'finance'
  | 'complaints'
  | 'reports'
  | 'settings'
  | 'qr_scan'
  | 'qc'
  | 'history'
  | 'profile';

export interface BusinessLocation {
  id: string;
  name: string;
  code: string;
  city: string;
  district: string;
  country: string;
  timezone: string;
  address: string;
  phone: string;
  email: string;
  status: 'active' | 'inactive' | 'pending';
}

export interface Facility {
  id: string;
  locationId: string;
  locationName: string;
  name: string;
  code: string;
  address: string;
  postcode: string;
  phone: string;
  status: string;
  dailyCapacityOrders: number;
  dailyCapacityKg: number;
  currentOrdersToday: number;
  currentKgToday: number;
}

export interface PostcodeSector {
  id: string;
  locationId: string;
  district: string; // e.g. "PR1"
  sector: string; // e.g. "PR1 2"
  isActive: boolean;
}

export interface ServiceAreaRule {
  id: string;
  postcodeSectorId: string;
  minimumOrderValue: number;
  minimumWeight: number;
  collectionFee: number;
  deliveryFee: number;
  sameDayAvailable: boolean;
  availableDays: string[];
  dailyCapacityOrders: number;
  dailyCapacityKg: number;
  isActive: boolean;
}

export interface AdminService {
  id: string;
  name: string;
  slug: string;
  description: string;
  category: 'wash_fold' | 'dry_cleaning' | 'ironing' | 'bedding' | 'shoes' | 'express';
  categoryLabel: string;
  imageUrl: string;
  basePrice: number;
  pricePerKg: number;
  minimumOrderValue: number;
  minimumCharge: number;
  estimatedTurnaroundHours: number;
  isActive: boolean;
  sortOrder: number;
  addonsCount: number;
}

export interface ServiceAddon {
  id: string;
  serviceId: string;
  name: string;
  description: string;
  addonType: string;
  price: number;
  isFree: boolean;
  isRequired: boolean;
  isActive: boolean;
}

export interface PricingRule {
  id: string;
  serviceId: string;
  serviceName: string;
  locationId?: string;
  facilityId?: string;
  postcodeSectorId?: string;
  minWeight?: number;
  maxWeight?: number;
  basePrice: number;
  pricePerKg: number;
  collectionFee: number;
  deliveryFee: number;
  expressSurcharge: number;
  minimumCharge: number;
  effectiveFrom: string;
  effectiveUntil?: string;
  isActive: boolean;
}

export interface BookingSlot {
  id: string;
  locationId: string;
  facilityId?: string;
  postcodeSectorId?: string;
  serviceId?: string;
  slotType: 'collection' | 'delivery';
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string;
  endTime: string;
  maxOrders: number;
  maxKg: number;
  bookedOrders: number;
  bookedKg: number;
  isActive: boolean;
  isExceptional: boolean;
  slotDate?: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  employeeNumber: string;
  fullName: string;
  email: string;
  phone: string;
  role: AdminRole;
  roleLabel: string;
  status: 'active' | 'inactive' | 'on_leave' | 'suspended' | 'terminated';
  hireDate: string;
  primaryLocation: string;
  assignedSectors?: string[];
  avatarUrl?: string;
  activeJobsCount: number;
}

export interface QRBag {
  id: string;
  qrCode: string;
  bagNumber: string;
  status: 'available' | 'assigned' | 'in_use' | 'returned' | 'lost' | 'damaged' | 'retired' | 'quarantined';
  condition: 'new' | 'good' | 'fair' | 'damaged';
  currentOrderId?: string;
  currentCustomerName?: string;
  lastScannedAt?: string;
  createdAt: string;
}

export interface CollectionRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  address: string;
  postcode: string;
  driverId: string;
  driverName: string;
  bagCountExpected: number;
  bagCountCollected: number;
  collectionStatus: 'scheduled' | 'arrived' | 'collected' | 'failed';
  collectionPhotoUrls: string[];
  customerSignatureUrl?: string;
  collectionLatitude?: number;
  collectionLongitude?: number;
  collectedAt?: string;
  failureReason?: string;
}

export interface FacilityIntakeRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  facilityId: string;
  facilityName: string;
  bagsExpected: number;
  bagsScanned: number;
  actualWeightKg: number;
  intakePhotos: string[];
  bagCondition: string;
  preExistingDamage?: string;
  restrictedItemsFound: string[];
  intakeNotes?: string;
  receivedByStaffName: string;
  receivedAt: string;
  isMismatch: boolean;
}

export interface OrderProcessingRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  bagQrCode: string;
  machineId?: string;
  machineCode?: string;
  processorName: string;
  stage: 'washing' | 'drying' | 'folding' | 'steaming';
  startedAt: string;
  completedAt?: string;
  cycleName?: string;
  notes?: string;
}

export interface QualityControlRecord {
  id: string;
  orderId: string;
  orderNumber: string;
  customerName: string;
  processorName: string;
  status: 'passed' | 'failed' | 'rewash_required';
  issuesFound?: string;
  rewashRequired: boolean;
  notes?: string;
  checkedAt: string;
}

export interface Machine {
  id: string;
  facilityId: string;
  facilityName: string;
  machineCode: string;
  name: string;
  machineType: 'Washer' | 'Dryer' | 'Steam Press' | 'Automatic Folder';
  manufacturer: string;
  model: string;
  capacityKg: number;
  status: 'available' | 'running' | 'cleaning' | 'fault' | 'maintenance';
  currentOrderId?: string;
  currentBagQr?: string;
  qrCode: string;
  lastMaintenanceDate: string;
}


export interface CustomerCRM {
  id: string; // matches profile id
  publicId?: string;
  customerId?: string;
  fullName: string;
  email: string;
  phone: string;
  postcode: string;
  avatarUrl: string;
  status: 'new' | 'regular' | 'high_value' | 'vip' | 'inactive' | 'blocked';
  totalOrders: number;
  lifetimeSpend: number;
  averageOrderValue: number;
  lastOrderDate: string;
  repeatRate: number;
  preferredService: string;
  preferredDetergent: string;
  preferredSoftener: string;
  flagsCount: number;
  incidentsCount: number;
  internalNotesCount: number;
}

export interface CustomerFlag {
  id: string;
  customerId: string;
  customerName: string;
  flagType: 'Chargeback' | 'Fraud Concern' | 'Repeated No-Show' | 'Abusive Behavior' | 'Risk Review';
  reason: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'active' | 'under_review' | 'resolved';
  createdByStaffName: string;
  createdAt: string;
}

export interface CustomerNote {
  id: string;
  customerId: string;
  note: string;
  authorName: string;
  authorRole: string;
  isPinned: boolean;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  reason: string;
  refundType: 'Full' | 'Partial' | 'Credit Note';
  stripeRefundId: string;
  processedByStaffName: string;
  createdAt: string;
}

export interface StoreCreditRecord {
  id: string;
  customerId: string;
  customerName: string;
  amount: number;
  currency: string;
  creditType: 'Goodwill' | 'Compensation' | 'Promotional';
  reason: string;
  expiresAt: string;
  status: 'active' | 'used' | 'expired';
  createdByStaffName: string;
  createdAt: string;
}

export interface FinancialAdjustment {
  id: string;
  customerId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  adjustmentType: 'Price Override' | 'Weight Surcharge' | 'Fee Waiver' | 'Manual Adjustment';
  amount: number;
  reason: string;
  performedByStaffName: string;
  createdAt: string;
}

export interface ComplaintRecord {
  id: string;
  supportTicketId: string;
  ticketNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  orderId: string;
  orderNumber: string;
  issueCategory: string;
  subject: string;
  description: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  status: 'Open' | 'In Review' | 'Waiting for Customer' | 'Resolved' | 'Closed';
  assignedStaffName?: string;
  refundRequired: boolean;
  rewashRequired: boolean;
  creditRequired: boolean;
  evidence: {
    collectionPhotoUrl?: string;
    intakePhotoUrl?: string;
    actualWeightKg?: number;
    bagQrCode?: string;
    processingMachineCode?: string;
    qcNotes?: string;
    deliveryPhotoUrl?: string;
    customerUploadedPhotos?: string[];
  };
  createdAt: string;
}

export interface SystemAlert {
  id: string;
  alertType:
  | 'failed_payment'
  | 'failed_notification'
  | 'qr_mismatch'
  | 'missing_bag'
  | 'overdue_collection'
  | 'overdue_delivery'
  | 'machine_fault'
  | 'capacity_warning'
  | 'capacity_exceeded'
  | 'delayed_driver'
  | 'low_inventory'
  | 'critical_inventory'
  | 'approval_outstanding'
  | 'failed_quality_control'
  | 'pickup_failed'
  | 'delivery_failed'
  | 'additional_charge_rejected'
  | 'sla_at_risk'
  | 'sla_breached'
  | 'cod_discrepancy';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  relatedOrderNumber?: string;
  relatedCustomerName?: string;
  locationName?: string;
  status: 'unresolved' | 'acknowledged' | 'resolved';
  assignedStaffName?: string;
  createdAt: string;
}

export interface AuditLogRecord {
  id: string;
  actorName: string;
  actorRole: string;
  action: string;
  entityType: string;
  entityId: string;
  oldValues?: any;
  newValues?: any;
  reason?: string;
  ipAddress: string;
  createdAt: string;
}

export interface OperationalMetrics {
  todayOrdersTotal: number;
  todayOrdersTrendPercent: number;
  todayRevenue: number;
  todayRevenueTrendPercent: number;
  todayKgProcessed: number;
  todayKgTrendPercent: number;
  collectionsPending: number;
  collectionsCompleted: number;
  deliveriesPending: number;
  deliveriesCompleted: number;
  activeDriversAvailable: number;
  activeDriversAssigned: number;
  facilityOrdersBooked: number;
  facilityOrdersMax: number;
  facilityKgBooked: number;
  facilityKgMax: number;
  openExceptionsCount?: number;
  slaAtRiskCount?: number;
  slaBreachedCount?: number;
  codDiscrepanciesCount?: number;
}

export type IncidentType =
  | 'lost_item'
  | 'damaged_item'
  | 'wrong_item'
  | 'missing_item'
  | 'customer_complaint'
  | 'delivery_dispute'
  | 'payment_dispute'
  | 'other';

export type IncidentPriority = 'low' | 'medium' | 'high' | 'urgent';

export type IncidentStatus =
  | 'reported'
  | 'investigating'
  | 'resolved_refund'
  | 'resolved_credit'
  | 'resolved_rewash'
  | 'resolved_replacement'
  | 'resolved_dismissed';

export interface IncidentRecord {
  id: string;
  publicId?: string;
  incidentId?: string;
  incidentNumber: string;
  plant_id: string;
  orderId?: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  driverId?: string;
  driverName?: string;
  reportedByRole: 'customer' | 'driver' | 'processor' | 'manager';
  reportedById: string;
  reportedByName: string;
  type: IncidentType;
  priority: IncidentPriority;
  status: IncidentStatus;
  title: string;
  description: string;
  itemDetails?: {
    name?: string;
    brand?: string;
    color?: string;
    category?: string;
    estimatedValue?: number;
    photoUrls?: string[];
    preExistingDamage?: boolean;
  };
  investigationNotes?: Array<{
    actorId: string;
    actorName: string;
    actorRole: string;
    note: string;
    timestamp: string;
  }>;
  resolution?: {
    type: 'refund' | 'credit' | 'rewash' | 'replacement' | 'dismissed' | 'manual';
    amount?: number;
    creditVoucherCode?: string;
    explanation: string;
    resolvedBy: string;
    resolvedByName: string;
    resolvedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

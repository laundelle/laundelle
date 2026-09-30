import crypto from 'crypto';
import { BadRequestError } from './api';
import { OrderStatus } from '@laundelle/types';

/**
 * Standard UK Postcode Normalization
 * Formats UK alphanumeric postcodes into standard UK format (e.g. "SW1A 1AA", "PR1 1AA", "W1D 4EQ").
 */
export function normalizeUkPostcode(raw: any): string {
    if (!raw || typeof raw !== 'string') {
        if (raw !== null && raw !== undefined && typeof raw === 'number') {
            raw = String(raw);
        } else {
            return '';
        }
    }
    const cleaned = raw.trim().toUpperCase().replace(/\s+/g, '');
    // UK postcodes are typically 5 to 7 alphanumeric characters (outward: 2-4 chars, inward: 3 chars)
    if (cleaned.length >= 5 && cleaned.length <= 8) {
        const inward = cleaned.slice(-3);
        const outward = cleaned.slice(0, -3);
        // Valid inward starts with number followed by 2 letters
        if (/^[0-9][A-Z]{2}$/.test(inward)) {
            return `${outward} ${inward}`;
        }
    }
    return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

/**
 * Extract district (e.g. "SW1A" or "PR1") and sector (e.g. "SW1A 1" or "PR1 2") from a UK postcode.
 */
export function parseUkPostcode(raw: string | undefined | null): {
    full: string;
    outward: string;
    sector: string;
} | null {
    const normalized = normalizeUkPostcode(raw);
    if (!normalized) return null;

    const parts = normalized.split(' ');
    if (parts.length === 2) {
        const outward = parts[0];
        const inward = parts[1];
        const sector = `${outward} ${inward.charAt(0)}`;
        return { full: normalized, outward, sector };
    }

    return { full: normalized, outward: normalized, sector: normalized };
}

/**
 * Match an order's UK postcode against a list of assigned driver postcodes / sectors / districts.
 * Supports exact postcode ("SW1A 1AA"), sector ("SW1A 1"), or district ("SW1A").
 */
export function matchesPostcode(orderPostcodeRaw: string, driverPostcodes: string[] = []): boolean {
    if (!orderPostcodeRaw || !driverPostcodes || driverPostcodes.length === 0) return false;

    const parsed = parseUkPostcode(orderPostcodeRaw);
    if (!parsed) return false;

    const normalizedDriverCodes = driverPostcodes.map(pc => normalizeUkPostcode(pc));

    return normalizedDriverCodes.some(driverCode => {
        if (!driverCode) return false;
        // Exact match
        if (driverCode === parsed.full) return true;
        // Sector match (e.g. Driver covers "SW1A 1" and order is "SW1A 1AA")
        if (driverCode === parsed.sector) return true;
        // Outward / District match (e.g. Driver covers "SW1A" or "PR1" and order is "SW1A 1AA")
        if (driverCode === parsed.outward) return true;
        // Driver assigned "SW1A 1AA" and order specified outward "SW1A"
        if (parsed.full === driverCode.split(' ')[0]) return true;
        return false;
    });
}

/**
 * Transition Rule Metadata definition
 */
export interface TransitionRule {
    allowedRoles: string[];
    trigger: string;
    requiresReason?: boolean;
    requiresEvidence?: boolean;
    notifyCustomer?: boolean;
    auditAction?: string;
}

/**
 * Valid order status transitions across the entire Laundelle lifecycle
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
    'pending_payment': ['booking_confirmed', 'cancelled'],
    'booking_confirmed': ['collection_scheduled', 'driver_assigned', 'pickup_in_progress', 'pickup_failed', 'cancelled'],
    'collection_scheduled': ['driver_assigned', 'pickup_in_progress', 'laundry_collected', 'picked_up', 'pickup_failed', 'booking_confirmed', 'cancelled'],
    'driver_assigned': ['pickup_in_progress', 'laundry_collected', 'picked_up', 'collection_scheduled', 'pickup_failed', 'booking_confirmed', 'cancelled'],
    'pickup_in_progress': ['laundry_collected', 'picked_up', 'pickup_failed', 'driver_assigned', 'collection_scheduled', 'cancelled'],
    'pickup_failed': ['collection_scheduled', 'driver_assigned', 'booking_confirmed', 'cancelled'],
    'laundry_collected': ['in_transit_to_plant', 'in_transit', 'received_at_facility', 'arrived_at_facility', 'sorting', 'washing'],
    'picked_up': ['in_transit_to_plant', 'in_transit', 'received_at_facility', 'arrived_at_facility', 'sorting', 'washing'],
    'in_transit_to_plant': ['received_at_facility', 'arrived_at_facility', 'sorting', 'washing'],
    'in_transit': ['in_transit_to_plant', 'received_at_facility', 'arrived_at_facility', 'sorting', 'washing'],
    'received_at_facility': ['awaiting_customer_approval', 'arrived_at_facility', 'sorting', 'washing', 'processing', 'processor_assigned'],
    'arrived_at_facility': ['received_at_facility', 'awaiting_customer_approval', 'sorting', 'washing', 'processing', 'processor_assigned'],
    'awaiting_customer_approval': ['received_at_facility', 'sorting', 'washing', 'processing', 'additional_charge_rejected', 'cancelled'],
    'additional_charge_rejected': ['received_at_facility', 'sorting', 'washing', 'processing', 'cancelled'],
    'processor_assigned': ['sorting', 'washing', 'processing'],
    'sorting': ['washing', 'drying', 'ironing', 'folding', 'qc_ready', 'quality_check', 'processing'],
    'washing': ['drying', 'ironing', 'folding', 'qc_ready', 'quality_check', 'processing'],
    'processing': ['drying', 'ironing', 'folding', 'qc_ready', 'quality_check', 'ready_for_delivery'],
    'drying': ['ironing', 'folding', 'qc_ready', 'quality_check'],
    'ironing': ['folding', 'qc_ready', 'quality_check'],
    'folding': ['qc_ready', 'quality_check', 'ready_for_delivery'],
    'qc_ready': ['ready_for_delivery', 'quality_check', 'washing', 'rewash_required', 'sorting', 'processing'],
    'quality_check': ['ready_for_delivery', 'qc_ready', 'washing', 'rewash_required', 'sorting', 'processing'],
    'rewash_required': ['washing', 'sorting', 'processing'],
    'ready_for_delivery': ['waiting_for_driver', 'delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery'],
    'waiting_for_driver': ['delivery_driver_assigned', 'package_collected_for_delivery', 'out_for_delivery'],
    'delivery_driver_assigned': ['waiting_for_driver', 'package_collected_for_delivery', 'out_for_delivery', 'ready_for_delivery'],
    'package_collected_for_delivery': ['out_for_delivery', 'delivery_attempted', 'delivery_failed', 'delivered'],
    'out_for_delivery': ['delivery_attempted', 'delivery_failed', 'delivered', 'ready_for_delivery', 'package_collected_for_delivery', 'delivery_driver_assigned'],
    'delivery_attempted': ['out_for_delivery', 'delivery_failed', 'ready_for_delivery', 'delivered'],
    'delivery_failed': ['ready_for_delivery', 'out_for_delivery', 'delivery_driver_assigned', 'delivered', 'cancelled'],
    'delivered': ['completed'],
    'completed': [],
    'cancelled': []
};

/**
 * Metadata rules for transitions
 */
export const TRANSITION_METADATA: Record<string, Partial<Record<string, TransitionRule>>> = {
    'pending_payment': {
        'booking_confirmed': { allowedRoles: ['system', 'admin'], trigger: 'Payment authorized via Stripe or COD confirmed', notifyCustomer: true, auditAction: 'payment_confirmed' },
        'cancelled': { allowedRoles: ['system', 'customer', 'admin'], trigger: 'Payment timed out or customer cancelled', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'booking_confirmed': {
        'collection_scheduled': { allowedRoles: ['system', 'manager', 'admin'], trigger: 'Collection route scheduled', notifyCustomer: true, auditAction: 'collection_scheduled' },
        'driver_assigned': { allowedRoles: ['system', 'manager', 'admin'], trigger: 'Driver assigned to order', notifyCustomer: true, auditAction: 'driver_assigned' },
        'pickup_in_progress': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver arrives at pickup location', notifyCustomer: true, auditAction: 'driver_arrived' },
        'pickup_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver marks pickup attempt failed', requiresReason: true, requiresEvidence: true, notifyCustomer: true, auditAction: 'pickup_failed' },
        'cancelled': { allowedRoles: ['customer', 'manager', 'admin', 'super_admin'], trigger: 'Order cancelled prior to collection', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'collection_scheduled': {
        'driver_assigned': { allowedRoles: ['system', 'manager', 'admin'], trigger: 'Driver assigned to pickup', auditAction: 'driver_assigned' },
        'pickup_in_progress': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver arrives at doorstep', notifyCustomer: true, auditAction: 'driver_arrived' },
        'laundry_collected': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup verified via PIN/photo and QR scanned', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'picked_up': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup verified and scanned', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'pickup_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup failed at door', requiresReason: true, notifyCustomer: true, auditAction: 'pickup_failed' },
        'cancelled': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Cancelled by customer or manager', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'driver_assigned': {
        'pickup_in_progress': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver arrived at location', notifyCustomer: true, auditAction: 'driver_arrived' },
        'laundry_collected': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup verified and scanned', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'picked_up': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup verified and scanned', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'pickup_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Pickup failed at door', requiresReason: true, notifyCustomer: true, auditAction: 'pickup_failed' },
        'cancelled': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Cancelled prior to pickup', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'pickup_in_progress': {
        'laundry_collected': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'PIN verified + Bag QR linked', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'picked_up': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'PIN verified + Bag QR linked', requiresEvidence: true, notifyCustomer: true, auditAction: 'laundry_collected' },
        'pickup_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Customer unavailable or access blocked', requiresReason: true, requiresEvidence: true, notifyCustomer: true, auditAction: 'pickup_failed' },
        'cancelled': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Cancelled at doorstep', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'pickup_failed': {
        'collection_scheduled': { allowedRoles: ['manager', 'admin'], trigger: 'Manager reschedules pickup slot', notifyCustomer: true, auditAction: 'pickup_rescheduled' },
        'driver_assigned': { allowedRoles: ['manager', 'admin'], trigger: 'Reassigned to driver for retry', auditAction: 'driver_reassigned' },
        'booking_confirmed': { allowedRoles: ['manager', 'admin'], trigger: 'Reset to booking confirmed for rescheduling', auditAction: 'pickup_reset' },
        'cancelled': { allowedRoles: ['manager', 'admin', 'super_admin'], trigger: 'Order cancelled after failed pickup', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'laundry_collected': {
        'in_transit_to_plant': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver en route to plant with cargo', auditAction: 'in_transit_to_plant' },
        'received_at_facility': { allowedRoles: ['driver', 'processor', 'manager', 'admin'], trigger: 'Driver unloads at facility intake dock', notifyCustomer: true, auditAction: 'received_at_facility' },
        'sorting': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Intake completed, garments sorted', auditAction: 'sorting_started' }
    },
    'in_transit_to_plant': {
        'received_at_facility': { allowedRoles: ['driver', 'processor', 'manager', 'admin'], trigger: 'Cargo checked into facility', notifyCustomer: true, auditAction: 'received_at_facility' }
    },
    'received_at_facility': {
        'awaiting_customer_approval': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Overweight detected; customer approval requested', requiresEvidence: true, notifyCustomer: true, auditAction: 'additional_charge_requested' },
        'sorting': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Garments sorted for wash cycles', auditAction: 'sorting_started' },
        'washing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Garments loaded into washer', notifyCustomer: true, auditAction: 'washing_started' }
    },
    'awaiting_customer_approval': {
        'received_at_facility': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Customer accepts additional charge', notifyCustomer: true, auditAction: 'additional_charge_accepted' },
        'washing': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Charge accepted; washing begins', notifyCustomer: true, auditAction: 'washing_started' },
        'additional_charge_rejected': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Customer rejects additional charge', notifyCustomer: true, auditAction: 'additional_charge_rejected' },
        'cancelled': { allowedRoles: ['customer', 'manager', 'admin'], trigger: 'Order cancelled due to charge disagreement', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'additional_charge_rejected': {
        'received_at_facility': { allowedRoles: ['manager', 'admin'], trigger: 'Manager approves processing at original weight or negotiated resolution', requiresReason: true, auditAction: 'manager_resolution_accepted' },
        'washing': { allowedRoles: ['manager', 'admin'], trigger: 'Manager resolves dispute and proceeds with washing', requiresReason: true, auditAction: 'manager_resolution_wash' },
        'cancelled': { allowedRoles: ['manager', 'admin'], trigger: 'Manager cancels order and returns garments', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'sorting': {
        'washing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Wash cycle started', notifyCustomer: true, auditAction: 'washing_started' }
    },
    'washing': {
        'drying': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Wash completed; moved to dryer', auditAction: 'drying_started' },
        'ironing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Moved to pressing / steaming', auditAction: 'ironing_started' },
        'folding': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Moved to folding', auditAction: 'folding_started' },
        'quality_check': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Moved directly to QC station', auditAction: 'qc_started' }
    },
    'drying': {
        'ironing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Dryer finished; steam press started', auditAction: 'ironing_started' },
        'folding': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Dryer finished; folding started', auditAction: 'folding_started' },
        'quality_check': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Moved to QC station', auditAction: 'qc_started' }
    },
    'ironing': {
        'folding': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Pressing finished; garment folding started', auditAction: 'folding_started' },
        'quality_check': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Moved to QC station', auditAction: 'qc_started' }
    },
    'folding': {
        'quality_check': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Folding complete; arriving at QC table', auditAction: 'qc_started' },
        'ready_for_delivery': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Packed and ready for outbound delivery', notifyCustomer: true, auditAction: 'ready_for_delivery' }
    },
    'quality_check': {
        'ready_for_delivery': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Passed all 9 QC inspection points', notifyCustomer: true, auditAction: 'qc_passed' },
        'rewash_required': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'QC inspection failed (stain or dampness)', requiresReason: true, auditAction: 'qc_failed_rewash' },
        'washing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Direct rewash cycle trigger', requiresReason: true, auditAction: 'qc_rewash_direct' }
    },
    'rewash_required': {
        'washing': { allowedRoles: ['processor', 'manager', 'admin'], trigger: 'Garments re-entered washing cycle', notifyCustomer: true, auditAction: 'rewash_started' }
    },
    'ready_for_delivery': {
        'delivery_driver_assigned': { allowedRoles: ['system', 'manager', 'admin'], trigger: 'Delivery driver assigned to package', auditAction: 'delivery_driver_assigned' },
        'package_collected_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver loads sealed bundle into van', auditAction: 'package_loaded' },
        'out_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver en route to customer delivery address', notifyCustomer: true, auditAction: 'out_for_delivery' }
    },
    'delivery_driver_assigned': {
        'package_collected_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver collects package from plant', auditAction: 'package_loaded' },
        'out_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver starts delivery route', notifyCustomer: true, auditAction: 'out_for_delivery' },
        'ready_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver rejects/unassigned delivery job', auditAction: 'delivery_driver_unassigned' }
    },
    'package_collected_for_delivery': {
        'out_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Driver starts transit to doorstep', notifyCustomer: true, auditAction: 'out_for_delivery' },
        'delivery_attempted': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery attempted at doorstep', requiresReason: true, auditAction: 'delivery_attempted' },
        'delivery_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery failed', requiresReason: true, requiresEvidence: true, notifyCustomer: true, auditAction: 'delivery_failed' },
        'delivered': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery completed (PIN or leave-at-door photo)', requiresEvidence: true, notifyCustomer: true, auditAction: 'order_delivered' }
    },
    'out_for_delivery': {
        'delivered': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Successful delivery verified', requiresEvidence: true, notifyCustomer: true, auditAction: 'order_delivered' },
        'delivery_attempted': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery attempted but customer not reachable', requiresReason: true, auditAction: 'delivery_attempted' },
        'delivery_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery attempt failed', requiresReason: true, requiresEvidence: true, notifyCustomer: true, auditAction: 'delivery_failed' },
        'ready_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Failed delivery returned to facility', auditAction: 'returned_to_facility' }
    },
    'delivery_attempted': {
        'out_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Re-attempting delivery today', auditAction: 'delivery_reattempt' },
        'delivery_failed': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Marked delivery failed for today', requiresReason: true, requiresEvidence: true, notifyCustomer: true, auditAction: 'delivery_failed' },
        'delivered': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivery verified on secondary attempt', requiresEvidence: true, notifyCustomer: true, auditAction: 'order_delivered' }
    },
    'delivery_failed': {
        'ready_for_delivery': { allowedRoles: ['manager', 'admin'], trigger: 'Returned to plant; ready for rescheduled delivery', notifyCustomer: true, auditAction: 'delivery_rescheduled' },
        'out_for_delivery': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Redelivery route initiated', notifyCustomer: true, auditAction: 'out_for_delivery' },
        'delivered': { allowedRoles: ['driver', 'manager', 'admin'], trigger: 'Delivered after resolution', requiresEvidence: true, notifyCustomer: true, auditAction: 'order_delivered' },
        'cancelled': { allowedRoles: ['manager', 'admin', 'super_admin'], trigger: 'Order cancelled after repeated delivery failures', requiresReason: true, notifyCustomer: true, auditAction: 'order_cancelled' }
    },
    'delivered': {
        'completed': { allowedRoles: ['system', 'manager', 'admin'], trigger: 'Order archived and finalized', auditAction: 'order_completed' }
    }
};

/**
 * Returns true if the status transition is allowed in the Laundelle state machine.
 */
export function isValidTransition(currentStatus: string, targetStatus: string): boolean {
    if (currentStatus === targetStatus) return true;
    return !!(ALLOWED_TRANSITIONS[currentStatus] && ALLOWED_TRANSITIONS[currentStatus].includes(targetStatus));
}

/**
 * Validates whether a state transition is legal according to the Laundelle state machine.
 * Enforces role restrictions, mandatory reasons, and mandatory evidence when provided.
 */
export function assertValidTransition(
    currentStatus: string,
    targetStatus: string,
    role?: string | null,
    options?: { reason?: string; photoUrl?: string }
): void {
    if (currentStatus === targetStatus) return; // Idempotent

    const allowed = ALLOWED_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(targetStatus)) {
        throw new BadRequestError(
            `Illegal status transition from '${currentStatus}' to '${targetStatus}'.`
        );
    }

    if (role) {
        const normalizedRole = role.toLowerCase().trim();
        // Super admin and admin have unrestricted authority on valid transitions
        if (normalizedRole !== 'super_admin' && normalizedRole !== 'admin') {
            const rule = TRANSITION_METADATA[currentStatus]?.[targetStatus];
            if (rule && rule.allowedRoles && !rule.allowedRoles.includes(normalizedRole)) {
                throw new BadRequestError(
                    `Unauthorized status transition: Role '${normalizedRole}' cannot move order from '${currentStatus}' to '${targetStatus}'.`
                );
            }
            if (rule?.requiresReason && (!options?.reason || !options.reason.trim())) {
                throw new BadRequestError(
                    `Transition from '${currentStatus}' to '${targetStatus}' strictly requires an explanation / reason.`
                );
            }
        }
    }
}

/**
 * Generate cryptographically secure numeric OTPs.
 */
export function generateSecureOtp(length: number = 6): string {
    if (length === 4) {
        return crypto.randomInt(1000, 10000).toString();
    }
    return crypto.randomInt(100000, 1000000).toString();
}

/**
 * Validates OTP against expiration and attempt limits.
 */
export function validateOtpAttempt(
    submittedOtp: string,
    expectedOtp: string | null | undefined,
    expiresAt?: string | null,
    attempts: number = 0,
    maxAttempts: number = 5
): { valid: boolean; error?: string } {
    if (attempts >= maxAttempts) {
        return { valid: false, error: 'Too many incorrect attempts. This OTP is locked. Please request a new one.' };
    }

    if (!expectedOtp) {
        return { valid: false, error: 'No active OTP found or OTP already verified.' };
    }

    if (expiresAt && new Date(expiresAt).getTime() < Date.now()) {
        return { valid: false, error: 'OTP has expired. Please request a new one.' };
    }

    if (submittedOtp.trim() !== expectedOtp.trim()) {
        const remaining = maxAttempts - (attempts + 1);
        return {
            valid: false,
            error: remaining > 0 
                ? `Invalid OTP. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.` 
                : 'Invalid OTP. Attempt limit reached; OTP is now locked.'
        };
    }

    return { valid: true };
}

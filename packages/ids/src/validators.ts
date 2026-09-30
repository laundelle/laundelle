import { ID_PREFIXES, IdPrefix } from './prefixes';
import { ID_ALPHABET } from './generators';

const validChars = new Set(ID_ALPHABET.split(''));

/**
 * Validates whether an identifier conforms to the Laundelle Canonical ID standard:
 * <PREFIX>-<ALPHANUMERIC>
 */
export function isValidCanonicalId(id: unknown, expectedPrefix?: IdPrefix): boolean {
  if (typeof id !== 'string') return false;
  const parts = id.trim().split('-');
  if (parts.length !== 2) return false;

  const [prefix, randomPart] = parts;
  if (!prefix || !randomPart) return false;

  if (expectedPrefix) {
    if (prefix !== expectedPrefix) return false;
  } else {
    const knownPrefixes = Object.values(ID_PREFIXES) as string[];
    if (!knownPrefixes.includes(prefix)) return false;
  }

  // Validate characters against alphabet
  if (randomPart.length < 4 || randomPart.length > 32) return false;
  for (let i = 0; i < randomPart.length; i++) {
    if (!validChars.has(randomPart[i].toUpperCase())) {
      return false;
    }
  }

  return true;
}

// Entity-Specific Validators
export const isCustomerId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.CUSTOMER);
export const isStaffId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.STAFF);
export const isOrderId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.ORDER);
export const isOrderItemId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.ORDER_ITEM);
export const isPlantId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.PLANT);
export const isPaymentId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.PAYMENT);
export const isSubscriptionId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.SUBSCRIPTION);
export const isInvoiceId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.INVOICE);
export const isRefundId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.REFUND);
export const isStoreCreditId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.STORE_CREDIT);
export const isBagId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.BAG);
export const isVehicleId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.VEHICLE);
export const isMachineId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.MACHINE);
export const isIncidentId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.INCIDENT);
export const isSupportTicketId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.SUPPORT_TICKET);
export const isEvidenceId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.EVIDENCE);
export const isAddressId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.ADDRESS);
export const isNotificationId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.NOTIFICATION);
export const isAlertId = (id: unknown) => isValidCanonicalId(id, ID_PREFIXES.ALERT);

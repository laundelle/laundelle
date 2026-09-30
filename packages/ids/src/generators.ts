import { ID_PREFIXES, IdPrefix } from './prefixes';
import { PREFIX_LENGTH_MAP } from './types';

declare const require: any;

/**
 * Crockford-inspired Base32 Alphabet (32 characters)
 * Excludes lookalikes: 0/O, 1/I/L
 * 5 bits of pure entropy per character.
 */
export const ID_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Cryptographically Secure Pseudo-Random Generator (CSPRNG)
 * Works seamlessly in Browser, Node.js (18+), and Edge runtimes.
 */
export function getSecureRandomString(length: number): string {
  const bytes = new Uint8Array(length);
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    // Fallback for older Node environments
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const nodeCrypto = typeof globalThis !== 'undefined' && (globalThis as any).crypto
      ? (globalThis as any).crypto
      : (typeof require !== 'undefined' ? require('crypto') : null);
    if (nodeCrypto?.getRandomValues) {
      nodeCrypto.getRandomValues(bytes);
    } else if (nodeCrypto?.randomBytes) {
      const randomBuffer = nodeCrypto.randomBytes(length);
      for (let i = 0; i < length; i++) {
        bytes[i] = randomBuffer[i];
      }
    }
  }

  let result = '';
  const alphabetLength = ID_ALPHABET.length; // 32
  for (let i = 0; i < length; i++) {
    // 32 is a power of 2 (2^5), so bitmask 0x1f produces zero bias
    result += ID_ALPHABET[bytes[i] & (alphabetLength - 1)];
  }
  return result;
}

/**
 * Strongly-typed Centralized ID Generator
 * Example output: generateId('ORD') -> "ORD-7K9A2P8M4X"
 */
export function generateId<P extends IdPrefix>(prefix: P, lengthOverride?: number): `${P}-${string}` {
  const length = lengthOverride || PREFIX_LENGTH_MAP[prefix] || 10;
  const randomPart = getSecureRandomString(length);
  return `${prefix}-${randomPart}` as `${P}-${string}`;
}

// Entity-Specific Convenience Generators
export const generateCustomerId = () => generateId(ID_PREFIXES.CUSTOMER);
export const generateStaffId = () => generateId(ID_PREFIXES.STAFF);
export const generateOrderId = () => generateId(ID_PREFIXES.ORDER);
export const generateOrderItemId = () => generateId(ID_PREFIXES.ORDER_ITEM);
export const generatePlantId = () => generateId(ID_PREFIXES.PLANT);
export const generatePaymentId = () => generateId(ID_PREFIXES.PAYMENT);
export const generateSubscriptionId = () => generateId(ID_PREFIXES.SUBSCRIPTION);
export const generateInvoiceId = () => generateId(ID_PREFIXES.INVOICE);
export const generateRefundId = () => generateId(ID_PREFIXES.REFUND);
export const generateStoreCreditId = () => generateId(ID_PREFIXES.STORE_CREDIT);
export const generateBagId = () => generateId(ID_PREFIXES.BAG);
export const generateVehicleId = () => generateId(ID_PREFIXES.VEHICLE);
export const generateMachineId = () => generateId(ID_PREFIXES.MACHINE);
export const generateMachineRunId = () => generateId(ID_PREFIXES.MACHINE_RUN);
export const generatePickupAttemptId = () => generateId(ID_PREFIXES.PICKUP_ATTEMPT);
export const generateDeliveryAttemptId = () => generateId(ID_PREFIXES.DELIVERY_ATTEMPT);
export const generateCodRecordId = () => generateId(ID_PREFIXES.COD_RECORD);
export const generateIncidentId = () => generateId(ID_PREFIXES.INCIDENT);
export const generateSupportTicketId = () => generateId(ID_PREFIXES.SUPPORT_TICKET);
export const generateEvidenceId = () => generateId(ID_PREFIXES.EVIDENCE);
export const generateAuditEventId = () => generateId(ID_PREFIXES.AUDIT_EVENT);
export const generateAddressId = () => generateId(ID_PREFIXES.ADDRESS);
export const generateNotificationId = () => generateId(ID_PREFIXES.NOTIFICATION);
export const generateAlertId = () => generateId(ID_PREFIXES.ALERT);
export const generateNoteId = () => generateId(ID_PREFIXES.NOTE);
export const generateFlagId = () => generateId(ID_PREFIXES.FLAG);
export const generateBookingSlotId = () => generateId(ID_PREFIXES.BOOKING_SLOT);
export const generateDeviceId = () => generateId(ID_PREFIXES.DEVICE);
export const generateOfflineOperationId = () => generateId(ID_PREFIXES.OFFLINE_OPERATION);
export const generateServiceId = () => generateId(ID_PREFIXES.SERVICE);
export const generateExceptionId = () => generateId(ID_PREFIXES.EXCEPTION);
export const generatePrivacyRequestId = () => generateId(ID_PREFIXES.PRIVACY_REQUEST);
export const generateInventoryItemId = () => generateId(ID_PREFIXES.INVENTORY_ITEM);
export const generateInventoryTransactionId = () => generateId(ID_PREFIXES.INVENTORY_TRANSACTION);
export const generateInventoryTransferId = () => generateId(ID_PREFIXES.INVENTORY_TRANSFER);

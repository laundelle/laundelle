import { isValidCanonicalId } from './validators';
import { ID_PREFIXES } from './prefixes';

/**
 * Normalizes input identifier string (cleans quotes, trim, etc.)
 */
export function sanitizeIdInput(input: unknown): string {
  if (!input) return '';
  let str = String(input).trim();
  try {
    if (str.startsWith('{') && str.endsWith('}')) {
      const parsed = JSON.parse(str);
      str = parsed.publicId || parsed.orderId || parsed.id || parsed.order_id || str;
    }
  } catch {}
  return str.replace(/^["']|["']$/g, '').trim();
}

/**
 * Builds a backward-compatible MongoDB query for resolving entities by canonical publicId,
 * legacy id, or internal database ID.
 */
export function buildEntityLookupQuery(identifier: string, entityType: 'order' | 'user' | 'plant' | 'vehicle' | 'machine' | 'incident' | 'ticket' | 'general' = 'general'): Record<string, any> {
  const clean = sanitizeIdInput(identifier);
  if (!clean) return { _id: '__non_existent_empty_id__' };

  // If already canonical public ID, match on publicId first, with fallback to legacy id
  if (clean.includes('-')) {
    const isCanonical = isValidCanonicalId(clean);
    if (isCanonical) {
      if (entityType === 'order') {
        return {
          $or: [
            { publicId: clean },
            { id: clean },
            { orderNumber: clean },
            { order_number: clean }
          ]
        };
      }
      if (entityType === 'incident') {
        return {
          $or: [
            { publicId: clean },
            { id: clean },
            { incidentNumber: clean }
          ]
        };
      }
      if (entityType === 'ticket') {
        return {
          $or: [
            { publicId: clean },
            { id: clean },
            { ticketId: clean }
          ]
        };
      }
      return {
        $or: [
          { publicId: clean },
          { id: clean }
        ]
      };
    }
  }

  // Handle Order specific lookups
  if (entityType === 'order') {
    return {
      $or: [
        { publicId: clean },
        { id: clean },
        { orderNumber: clean },
        { order_number: clean },
        { 'package.qr_code': clean },
        { 'qr_tracking.qrTagId': clean },
        { qr_code: clean }
      ]
    };
  }

  // Handle Incident specific lookups
  if (entityType === 'incident') {
    return {
      $or: [
        { publicId: clean },
        { id: clean },
        { incidentNumber: clean },
        { _id: clean }
      ]
    };
  }

  // Handle Ticket specific lookups
  if (entityType === 'ticket') {
    return {
      $or: [
        { publicId: clean },
        { id: clean },
        { ticketId: clean },
        { _id: clean }
      ]
    };
  }

  // Handle Plant specific lookups (supports code e.g. PR01 or PLT-...)
  if (entityType === 'plant') {
    return {
      $or: [
        { publicId: clean },
        { id: clean },
        { code: clean.toUpperCase() },
        { _id: clean }
      ]
    };
  }

  // Handle User specific lookups
  if (entityType === 'user') {
    return {
      $or: [
        { publicId: clean },
        { customerId: clean },
        { staffId: clean },
        { id: clean },
        { email: clean.toLowerCase() },
        { _id: clean }
      ]
    };
  }

  // General lookup query
  return {
    $or: [
      { publicId: clean },
      { id: clean },
      { _id: clean }
    ]
  };
}

/**
 * Resolves the canonical public ID from an entity document, with legacy fallbacks.
 */
export function getPublicId(entity: any, fallbackPrefix?: string): string {
  if (!entity) return '';
  if (entity.publicId) return entity.publicId;
  if (entity.id && isValidCanonicalId(entity.id)) return entity.id;

  // If entity has a legacy id, return it
  if (entity.id) return String(entity.id);
  if (entity.orderNumber) return String(entity.orderNumber);
  if (entity._id) return String(entity._id);

  return '';
}

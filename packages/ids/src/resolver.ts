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

declare const process: any;

function tryGetObjectId(id: string, customConverter?: (val: string) => any): any {
  if (customConverter) {
    try { return customConverter(id); } catch {}
  }
  if (typeof id === 'string' && id.length === 24 && /^[0-9a-fA-F]{24}$/.test(id)) {
    // In browser / client bundles, never attempt to load native MongoDB driver
    if (typeof window !== 'undefined') {
      return null;
    }
    try {
      // Use dynamic runtime resolution so bundlers (Webpack / Next.js / Vite) do not statically trace and bundle 'mongodb' into client builds
      const runtimeRequire =
        typeof (globalThis as any).__non_webpack_require__ === 'function'
          ? (globalThis as any).__non_webpack_require__
          : typeof eval === 'function'
            ? eval('require')
            : null;

      if (runtimeRequire) {
        try {
          const mongodb = runtimeRequire('mongodb');
          const OId = mongodb.ObjectId || mongodb.default?.ObjectId;
          if (OId) return new OId(id);
        } catch {}

        try {
          const path = runtimeRequire('path');
          if (typeof process !== 'undefined' && process.cwd) {
            const resolved = runtimeRequire(path.resolve(process.cwd(), 'apps/backend/node_modules/mongodb'));
            const OId = resolved.ObjectId || resolved.default?.ObjectId;
            if (OId) return new OId(id);
          }
        } catch {}
      }
    } catch {}
  }
  return null;
}

/**
 * Builds a backward-compatible MongoDB query for resolving entities by canonical publicId,
 * legacy id, or internal database ID. Safely converts 24-character hexadecimal identifiers
 * to BSON ObjectId in server environments to bridge native and string storage.
 */
export function buildEntityLookupQuery(
  identifier: string,
  entityType: 'order' | 'user' | 'plant' | 'vehicle' | 'machine' | 'incident' | 'ticket' | 'general' = 'general',
  objectIdConverter?: (val: string) => any
): Record<string, any> {
  const clean = sanitizeIdInput(identifier);
  if (!clean) return { _id: '__non_existent_empty_id__' };

  const objectId = tryGetObjectId(clean, objectIdConverter);

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
            { order_number: clean },
            { 'package.qr_code': clean },
            { 'qr_tracking.qrTagId': clean },
            { qr_code: clean }
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
      if (entityType === 'plant') {
        return {
          $or: [
            { publicId: clean },
            { plantId: clean },
            { id: clean },
            { code: clean.toUpperCase() }
          ]
        };
      }
      if (entityType === 'user') {
        return {
          $or: [
            { publicId: clean },
            { customerId: clean },
            { staffId: clean },
            { id: clean },
            { auth0UserId: clean },
            { auth0_sub: clean }
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
    const conditions: any[] = [
      { publicId: clean },
      { id: clean },
      { orderNumber: clean },
      { order_number: clean },
      { _id: clean },
      { 'package.qr_code': clean },
      { 'qr_tracking.qrTagId': clean },
      { qr_code: clean }
    ];
    if (objectId) {
      conditions.push({ _id: objectId });
    }
    return { $or: conditions };
  }

  // Handle Incident specific lookups
  if (entityType === 'incident') {
    const conditions: any[] = [
      { publicId: clean },
      { id: clean },
      { incidentNumber: clean },
      { _id: clean }
    ];
    if (objectId) {
      conditions.push({ _id: objectId });
    }
    return { $or: conditions };
  }

  // Handle Ticket specific lookups
  if (entityType === 'ticket') {
    const conditions: any[] = [
      { publicId: clean },
      { id: clean },
      { ticketId: clean },
      { _id: clean }
    ];
    if (objectId) {
      conditions.push({ _id: objectId });
    }
    return { $or: conditions };
  }

  // Handle Plant specific lookups (supports code e.g. PR01 or PLT-...)
  if (entityType === 'plant') {
    const conditions: any[] = [
      { publicId: clean },
      { plantId: clean },
      { id: clean },
      { code: clean.toUpperCase() },
      { _id: clean }
    ];
    if (objectId) {
      conditions.push({ _id: objectId });
    }
    return { $or: conditions };
  }

  // Handle User specific lookups
  if (entityType === 'user') {
    const conditions: any[] = [
      { publicId: clean },
      { customerId: clean },
      { staffId: clean },
      { id: clean },
      { auth0UserId: clean },
      { auth0_sub: clean },
      { _id: clean }
    ];
    if (clean.includes('@')) {
      conditions.push({ email: clean.toLowerCase().trim() });
    }
    if (objectId) {
      conditions.push({ _id: objectId });
    }
    return { $or: conditions };
  }

  // General lookup query
  const conditions: any[] = [
    { publicId: clean },
    { id: clean },
    { _id: clean }
  ];
  if (objectId) {
    conditions.push({ _id: objectId });
  }
  return { $or: conditions };
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

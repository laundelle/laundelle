import { getDb } from '@/lib/mongodb';
import { FileRecord, FileType } from '@laundelle/types';
import { BadRequestError, ForbiddenError, NotFoundError } from '@/lib/api';
import crypto from 'crypto';
import { generateEvidenceId } from '@laundelle/ids';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const SIGNED_TOKEN_SECRET = process.env.JWT_SECRET || 'laundelle_file_signing_secret_2026';

export interface StoreFileParams {
  orderId?: string;
  entityType?: 'order' | 'incident' | 'machine' | 'user' | string;
  entityId?: string;
  fileType: FileType;
  mimeType: string;
  size: number;
  bufferOrBase64?: Buffer | string;
  storageKey?: string;
  url?: string;
  uploadedBy: string;
  uploadedByRole?: string;
  metadata?: any;
}

export class FileStorageService {
  /**
   * Computes SHA-256 checksum of raw file buffer.
   */
  static computeChecksum(buffer: Buffer | string): string {
    const buf = typeof buffer === 'string' ? Buffer.from(buffer, 'base64') : buffer;
    return crypto.createHash('sha256').update(buf).digest('hex');
  }

  /**
   * Generates a safe, randomized storage key preventing directory traversal or path injection.
   */
  static generateStorageKey(fileType: FileType, entityId: string, mimeType: string): string {
    const ext = mimeType.split('/')[1] || 'bin';
    const safeExt = ext.replace(/[^a-zA-Z0-9]/g, '');
    const randomHex = crypto.randomBytes(8).toString('hex');
    const datePrefix = new Date().toISOString().split('T')[0];
    return `${fileType}/${datePrefix}/${entityId || 'general'}_${randomHex}.${safeExt}`;
  }

  /**
   * Stores file metadata in MongoDB, validating MIME, size, and deduplication.
   */
  static async registerFile(params: StoreFileParams): Promise<FileRecord> {
    const {
      orderId,
      entityType = 'order',
      entityId,
      fileType,
      mimeType,
      size,
      bufferOrBase64,
      uploadedBy,
      uploadedByRole = 'user',
      metadata
    } = params;

    // 1. Validate MIME
    const normalizedMime = (mimeType || '').toLowerCase().trim();
    if (!ALLOWED_MIME_TYPES.includes(normalizedMime)) {
      throw new BadRequestError(`Invalid file format '${mimeType}'. Allowed formats: JPEG, PNG, WebP, PDF.`);
    }

    // 2. Validate Size
    if (size > MAX_FILE_SIZE) {
      throw new BadRequestError(`File exceeds maximum permissible size of 5MB (Provided: ${(size / 1024 / 1024).toFixed(2)}MB).`);
    }

    // 3. Compute Checksum
    const checksum = bufferOrBase64
      ? this.computeChecksum(bufferOrBase64)
      : crypto.createHash('sha256').update(`${orderId}_${fileType}_${Date.now()}`).digest('hex');

    const db = await getDb();

    // 4. Duplicate Check (prevent uploading identical file for the same entity)
    const existing = await db.collection('files').findOne({
      checksum,
      entityId: entityId || orderId,
      status: 'ACTIVE'
    });
    if (existing) {
      return existing as unknown as FileRecord;
    }

    // 5. Generate secure key and record
    const fileId = generateEvidenceId();
    const storageKey = params.storageKey || this.generateStorageKey(fileType, entityId || orderId || 'anon', normalizedMime);
    const now = new Date().toISOString();

    // Default retention: 180 days for operational files, configurable
    const retentionUntil = new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString();

    const record: FileRecord = {
      id: fileId,
      publicId: fileId,
      evidenceId: fileId,
      fileId,
      orderId,
      entityType,
      entityId: entityId || orderId,
      fileType,
      storageKey,
      url: params.url || `/api/v1/files/${fileId}`,
      mimeType: normalizedMime,
      size,
      checksum,
      checksumSha256: checksum,
      uploadedBy,
      uploadedByRole,
      uploadedAt: now,
      retentionUntil,
      status: 'ACTIVE',
      metadata: metadata || {}
    };

    await db.collection('files').insertOne(record as any);

    return record;
  }

  /**
   * Convenience helper for uploading/saving files with flexible parameter signatures.
   */
  static async saveFile(params: {
    fileName?: string;
    mimeType: string;
    sizeBytes?: number;
    size?: number;
    buffer?: Buffer;
    bufferOrBase64?: Buffer | string;
    uploadedByUserId?: string;
    uploadedBy?: string;
    uploadedByRole?: string;
    orderId?: string;
    entityId?: string;
    entityType?: string;
    fileType?: FileType;
    accessControl?: string;
    metadata?: any;
  }): Promise<FileRecord> {
    return this.registerFile({
      fileType: params.fileType || 'customer_attachment',
      mimeType: params.mimeType,
      size: params.sizeBytes ?? params.size ?? 0,
      bufferOrBase64: params.buffer ?? params.bufferOrBase64,
      uploadedBy: params.uploadedByUserId ?? params.uploadedBy ?? 'system',
      uploadedByRole: params.uploadedByRole || 'customer',
      orderId: params.orderId,
      entityId: params.entityId,
      entityType: params.entityType,
      metadata: { ...params.metadata, accessControl: params.accessControl, fileName: params.fileName }
    });
  }

  /**
   * Generates a short-lived signed access token for secure, authenticated file downloads.
   * Supports both (fileId, ttlSeconds) and (fileId, userId, ttlSeconds) signatures.
   */
  static generateSignedToken(fileId: string, userIdOrTtl: string | number = 'anonymous', ttlSeconds = 300): string {
    let userId = 'anonymous';
    let ttl = ttlSeconds;
    if (typeof userIdOrTtl === 'number') {
      ttl = userIdOrTtl;
    } else {
      userId = userIdOrTtl;
    }
    const expiresAt = Math.floor(Date.now() / 1000) + ttl;
    const payload = `${fileId}:${userId}:${expiresAt}`;
    const signature = crypto.createHmac('sha256', SIGNED_TOKEN_SECRET).update(payload).digest('hex');
    return `${Buffer.from(payload).toString('base64url')}.${signature}`;
  }

  /**
   * Verifies a short-lived signed access token.
   * Supports both verifySignedToken(token) and verifySignedToken(fileId, token).
   */
  static verifySignedToken(fileIdOrToken: string, tokenArg?: string): { valid: boolean; fileId?: string; userId?: string } {
    const token = tokenArg || fileIdOrToken;
    const expectedFileId = tokenArg ? fileIdOrToken : undefined;
    try {
      const parts = token.split('.');
      if (parts.length !== 2) return { valid: false };

      const [encodedPayload, signature] = parts;
      const payload = Buffer.from(encodedPayload, 'base64url').toString('utf8');
      const expectedSig = crypto.createHmac('sha256', SIGNED_TOKEN_SECRET).update(payload).digest('hex');

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return { valid: false };
      }

      const [fileId, userId, expiresAtStr] = payload.split(':');
      if (expectedFileId && fileId !== expectedFileId) {
        return { valid: false };
      }
      const expiresAt = parseInt(expiresAtStr, 10);
      if (Math.floor(Date.now() / 1000) > expiresAt) {
        return { valid: false }; // Expired
      }

      return { valid: true, fileId, userId };
    } catch {
      return { valid: false };
    }
  }

  /**
   * Retrieves a file record with strict RBAC & IDOR validation.
   */
  static async getFile(fileId: string, requester: { id: string; role: string; plantId?: string }): Promise<FileRecord> {
    const db = await getDb();
    const file = await db.collection('files').findOne({ $or: [{ publicId: fileId }, { fileId }, { id: fileId }] });
    if (!file) throw new NotFoundError('File not found or has been purged.');

    const role = (requester.role || 'customer').toLowerCase();

    // Admin & Super Admin have full access
    if (['admin', 'super_admin'].includes(role)) {
      return file as unknown as FileRecord;
    }

    // Customer: check order ownership
    if (role === 'customer') {
      if (file.orderId) {
        const order = await db.collection('orders').findOne({ id: file.orderId });
        if (order && String(order.customer_id) !== String(requester.id)) {
          throw new ForbiddenError('Access Denied: You do not own this order evidence.');
        }
      } else if (file.uploadedBy !== requester.id) {
        throw new ForbiddenError('Access Denied: Unauthorized file access.');
      }
    }

    // Driver: check assignment
    if (role === 'driver') {
      if (file.orderId) {
        const order = await db.collection('orders').findOne({ id: file.orderId });
        if (order && String(order.assigned_driver_id) !== String(requester.id)) {
          throw new ForbiddenError('Access Denied: You are not assigned to this delivery.');
        }
      }
    }

    // Plant Manager: check plant boundary
    if (role === 'manager') {
      if (file.orderId && requester.plantId) {
        const order = await db.collection('orders').findOne({ id: file.orderId });
        if (order && order.plant_id && String(order.plant_id) !== String(requester.plantId)) {
          throw new ForbiddenError('Access Denied: Order belongs to a different plant.');
        }
      }
    }

    return file as unknown as FileRecord;
  }
}

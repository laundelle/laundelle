import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import dotenv from 'dotenv';
import { imageSize } from 'image-size';

// Load environment variables from .env files
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'backend', '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'apps', 'customer', '.env') });

export interface ImageReference {
  filePath: string;
  lineNumber: number;
  matchText: string;
}

export interface ManifestAsset {
  originalPath: string; // Relative to monorepo root
  fileName: string;
  extension: string;
  fileSizeBytes: number;
  checksumSha256: string;
  width: number;
  height: number;
  actualType: string;
  applications: string[];
  discoveredReferences: ImageReference[];
  proposedPublicId: string;
  isDuplicateOf?: string; // If another asset has the exact same SHA-256 hash
  excluded: boolean;
  exclusionReason?: string | null;
  uploadStatus: 'pending' | 'uploaded' | 'skipped' | 'failed' | 'excluded';
  verificationStatus: 'pending' | 'verified' | 'failed' | 'excluded';
  localDeletionStatus: 'pending' | 'deleted' | 'retained' | 'excluded';
  cloudinarySecureUrl?: string | null;
  cloudinaryPublicId?: string | null;
  deliveredFormat?: 'webp' | 'svg' | 'original';
  lastError?: string | null;
}

export interface MigrationManifest {
  generatedAt: string;
  updatedAt: string;
  summary: {
    totalDiscoveredFiles: number;
    uniqueFilesByHash: number;
    duplicateFilesCount: number;
    totalStorageSizeBytes: number;
    totalStorageSizeMB: number;
    eligibleForCloudinary: number;
    excludedFromCloudinary: number;
    referencedFiles: number;
    unreferencedFiles: number;
  };
  assets: ManifestAsset[];
}

const MANIFEST_PATH = path.resolve(process.cwd(), 'scripts', 'cloudinary-migration-manifest.json');

const RELEVANT_IMAGE_EXTENSIONS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.avif',
  '.gif',
  '.svg',
  '.ico',
  '.bmp',
  '.tif',
  '.tiff',
]);

const SCAN_DIRS = [
  'public',
  path.join('apps', 'customer', 'public'),
  path.join('apps', 'operations', 'public'),
  path.join('apps', 'admin', 'public'),
  path.join('apps', 'backend', 'public'),
  'packages',
];

const CODE_SCAN_DIRS = ['apps', 'packages', 'public'];

const IGNORED_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.turbo',
  'dist',
  'build',
  'graphify-out',
  '.gemini',
]);

function computeSha256(filePath: string): string {
  const fileBuffer = fs.readFileSync(filePath);
  return crypto.createHash('sha256').update(fileBuffer).digest('hex');
}

function getImageDimensions(filePath: string): { width: number; height: number; type: string } {
  try {
    const buffer = fs.readFileSync(filePath);
    const dimensions = imageSize(buffer);
    return {
      width: dimensions.width || 0,
      height: dimensions.height || 0,
      type: dimensions.type || path.extname(filePath).replace('.', ''),
    };
  } catch {
    return {
      width: 0,
      height: 0,
      type: path.extname(filePath).replace('.', ''),
    };
  }
}

function sanitizePublicId(name: string): string {
  return name
    .toLowerCase()
    .replace(/\.[^/.]+$/, '') // remove extension
    .replace(/[&_+]/g, '-')
    .replace(/[^a-z0-9\-/]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function determinePublicId(relPath: string, fileName: string): string {
  const norm = relPath.replace(/\\/g, '/');
  const baseName = sanitizePublicId(fileName);

  if (norm.includes('/Images/')) {
    return `laundelle/services/${baseName}`;
  }
  if (norm.includes('gallery-')) {
    return `laundelle/gallery/${baseName}`;
  }
  if (norm.includes('auth-hero')) {
    return `laundelle/auth/${baseName}`;
  }
  if (norm.includes('logo') || norm.includes('Logo')) {
    return `laundelle/branding/${baseName}`;
  }
  if (norm.includes('hero')) {
    return `laundelle/hero/${baseName}`;
  }
  if (norm.includes('driver') || norm.includes('postcode')) {
    return `laundelle/illustrations/${baseName}`;
  }
  if (norm.includes('/assets/')) {
    return `laundelle/assets/${baseName}`;
  }
  return `laundelle/shared/${baseName}`;
}

function isExcludedAsset(relPath: string, fileName: string): { excluded: boolean; reason: string | null } {
  const lower = fileName.toLowerCase();
  const ext = path.extname(lower);

  // Favicons & browser touch icons must remain in public/ for browser and PWA standards
  if (
    lower === 'favicon.ico' ||
    lower.startsWith('favicon-') ||
    lower.startsWith('apple-touch-icon') ||
    lower.startsWith('android-chrome') ||
    lower.endsWith('.webmanifest') ||
    lower === 'manifest.json'
  ) {
    return {
      excluded: true,
      reason: 'Browser icon or PWA manifest must be served directly from local root for platform standards.',
    };
  }

  // Next.js static social graph card
  if (lower === 'og-image.png') {
    return {
      excluded: true,
      reason: 'Retained locally as default OpenGraph meta preview image fallback.',
    };
  }

  return { excluded: false, reason: null };
}

function collectImageFiles(baseDir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(baseDir)) return results;

  function traverse(current: string) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          traverse(path.join(current, entry.name));
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (RELEVANT_IMAGE_EXTENSIONS.has(ext)) {
          results.push(path.join(current, entry.name));
        }
      }
    }
  }

  traverse(baseDir);
  return results;
}

function findReferencesInCodebase(imageFileName: string): ImageReference[] {
  const references: ImageReference[] = [];
  const searchPatterns = [
    imageFileName,
    encodeURIComponent(imageFileName),
    imageFileName.replace(/ /g, '%20'),
    path.parse(imageFileName).name,
  ];

  function searchInDir(dirPath: string) {
    if (!fs.existsSync(dirPath)) return;
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);
      if (entry.isDirectory()) {
        if (!IGNORED_DIRS.has(entry.name)) {
          searchInDir(fullPath);
        }
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (['.ts', '.tsx', '.js', '.jsx', '.css', '.json', '.html'].includes(ext)) {
          try {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            lines.forEach((line, idx) => {
              for (const pat of searchPatterns) {
                if (line.includes(pat) && !fullPath.includes('cloudinary-migration-manifest')) {
                  references.push({
                    filePath: path.relative(process.cwd(), fullPath).replace(/\\/g, '/'),
                    lineNumber: idx + 1,
                    matchText: line.trim().slice(0, 160),
                  });
                  break;
                }
              }
            });
          } catch {
            // ignore binary/unreadable
          }
        }
      }
    }
  }

  for (const dir of CODE_SCAN_DIRS) {
    searchInDir(path.resolve(process.cwd(), dir));
  }

  // Deduplicate references
  const uniqueRefs: ImageReference[] = [];
  const seen = new Set<string>();
  for (const ref of references) {
    const key = `${ref.filePath}:${ref.lineNumber}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRefs.push(ref);
    }
  }

  return uniqueRefs;
}

export function performAudit(): MigrationManifest {
  console.log('🔍 Starting LAUNDELLE monorepo static image discovery audit...');

  const allDiscoveredPaths: string[] = [];
  for (const dir of SCAN_DIRS) {
    const fullDir = path.resolve(process.cwd(), dir);
    const files = collectImageFiles(fullDir);
    allDiscoveredPaths.push(...files);
  }

  // Deduplicate file paths
  const uniquePaths = Array.from(new Set(allDiscoveredPaths));
  console.log(`📂 Found ${uniquePaths.length} static image file instances across candidate directories.`);

  // Load existing manifest if present for resume capability
  let existingManifest: MigrationManifest | null = null;
  if (fs.existsSync(MANIFEST_PATH)) {
    try {
      existingManifest = JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'));
    } catch {
      // ignore
    }
  }

  const existingMap = new Map<string, ManifestAsset>();
  if (existingManifest && existingManifest.assets) {
    for (const a of existingManifest.assets) {
      existingMap.set(a.originalPath, a);
    }
  }

  const hashMap = new Map<string, string>(); // sha256 -> first originalPath
  const assets: ManifestAsset[] = [];

  let totalBytes = 0;
  let duplicatesCount = 0;
  let eligibleCount = 0;
  let excludedCount = 0;
  let referencedCount = 0;
  let unreferencedCount = 0;

  for (const filePath of uniquePaths) {
    const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, '/');
    const fileName = path.basename(filePath);
    const ext = path.extname(filePath).toLowerCase();
    const stats = fs.statSync(filePath);
    const sizeBytes = stats.size;
    totalBytes += sizeBytes;

    const hash = computeSha256(filePath);
    let isDuplicateOf: string | undefined = undefined;
    if (hashMap.has(hash)) {
      isDuplicateOf = hashMap.get(hash);
      duplicatesCount++;
    } else {
      hashMap.set(hash, relPath);
    }

    const { width, height, type: actualType } = getImageDimensions(filePath);
    const exclusion = isExcludedAsset(relPath, fileName);
    if (exclusion.excluded) {
      excludedCount++;
    } else {
      eligibleCount++;
    }

    const references = findReferencesInCodebase(fileName);
    if (references.length > 0) {
      referencedCount++;
    } else {
      unreferencedCount++;
    }

    const apps = Array.from(
      new Set(
        references
          .map((r) => {
            if (r.filePath.startsWith('apps/customer')) return 'customer';
            if (r.filePath.startsWith('apps/operations')) return 'operations';
            if (r.filePath.startsWith('apps/admin')) return 'admin';
            if (r.filePath.startsWith('apps/backend')) return 'backend';
            return 'shared';
          })
          .concat(relPath.includes('customer') ? ['customer'] : [])
          .concat(relPath.includes('operations') ? ['operations'] : [])
          .concat(relPath.includes('admin') ? ['admin'] : [])
      )
    );

    const proposedId = determinePublicId(relPath, fileName);

    // Merge with existing record if already uploaded, or inherit from primary if duplicate
    let prev = existingMap.get(relPath);
    if ((!prev || prev.uploadStatus !== 'uploaded') && isDuplicateOf) {
      const primaryPrev = existingMap.get(isDuplicateOf);
      if (primaryPrev && primaryPrev.uploadStatus === 'uploaded') {
        prev = {
          ...(prev || {}),
          uploadStatus: primaryPrev.uploadStatus,
          verificationStatus: primaryPrev.verificationStatus,
          cloudinarySecureUrl: primaryPrev.cloudinarySecureUrl,
          cloudinaryPublicId: primaryPrev.cloudinaryPublicId,
        } as any;
      }
    }

    const asset: ManifestAsset = {
      originalPath: relPath,
      fileName,
      extension: ext,
      fileSizeBytes: sizeBytes,
      checksumSha256: hash,
      width,
      height,
      actualType,
      applications: apps.length > 0 ? apps : ['root-public'],
      discoveredReferences: references,
      proposedPublicId: proposedId,
      isDuplicateOf,
      excluded: exclusion.excluded,
      exclusionReason: exclusion.reason,
      uploadStatus: exclusion.excluded ? 'excluded' : prev?.uploadStatus || 'pending',
      verificationStatus: exclusion.excluded ? 'excluded' : prev?.verificationStatus || 'pending',
      localDeletionStatus: exclusion.excluded ? 'excluded' : prev?.localDeletionStatus || 'pending',
      cloudinarySecureUrl: prev?.cloudinarySecureUrl || null,
      cloudinaryPublicId: prev?.cloudinaryPublicId || null,
      deliveredFormat: ext === '.svg' ? 'svg' : 'webp',
      lastError: prev?.lastError || null,
    };

    assets.push(asset);
  }

  const manifest: MigrationManifest = {
    generatedAt: existingManifest?.generatedAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    summary: {
      totalDiscoveredFiles: assets.length,
      uniqueFilesByHash: hashMap.size,
      duplicateFilesCount: duplicatesCount,
      totalStorageSizeBytes: totalBytes,
      totalStorageSizeMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      eligibleForCloudinary: eligibleCount,
      excludedFromCloudinary: excludedCount,
      referencedFiles: referencedCount,
      unreferencedFiles: unreferencedCount,
    },
    assets,
  };

  // Ensure scripts directory exists and write manifest
  fs.mkdirSync(path.dirname(MANIFEST_PATH), { recursive: true });
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`💾 Saved inventory manifest to ${MANIFEST_PATH}`);

  return manifest;
}

export function printAuditReport(manifest: MigrationManifest) {
  const { summary, assets } = manifest;

  console.log('\n=============================================================================');
  console.log('              LAUNDELLE CLOUDINARY IMAGE MIGRATION AUDIT REPORT               ');
  console.log('=============================================================================\n');

  console.log(`📊 SUMMARY METRICS:`);
  console.log(`• Total Discovered Image Files : ${summary.totalDiscoveredFiles}`);
  console.log(`• Unique Files (by SHA-256)    : ${summary.uniqueFilesByHash}`);
  console.log(`• Duplicate Identical Files    : ${summary.duplicateFilesCount}`);
  console.log(`• Total Monorepo Storage Size  : ${summary.totalStorageSizeMB} MB (${summary.totalStorageSizeBytes.toLocaleString()} bytes)`);
  console.log(`• Eligible for Cloudinary      : ${summary.eligibleForCloudinary}`);
  console.log(`• Excluded (Browser/PWA Icons) : ${summary.excludedFromCloudinary}`);
  console.log(`• Referenced in Active Code    : ${summary.referencedFiles}`);
  console.log(`• Unreferenced (Orphan Assets) : ${summary.unreferencedFiles}`);

  console.log('\n-----------------------------------------------------------------------------');
  console.log('🔒 EXCLUDED LOCAL ASSETS (Will remain local in public/):');
  console.log('-----------------------------------------------------------------------------');
  const excluded = assets.filter((a) => a.excluded);
  for (const a of excluded) {
    console.log(`  - [EXCLUDED] ${a.originalPath} (${Math.round(a.fileSizeBytes / 1024)} KB) -> Reason: ${a.exclusionReason}`);
  }

  console.log('\n-----------------------------------------------------------------------------');
  console.log('✨ ELIGIBLE STATIC IMAGES FOR CLOUDINARY MIGRATION:');
  console.log('-----------------------------------------------------------------------------');
  const eligible = assets.filter((a) => !a.excluded);
  for (const a of eligible) {
    const dupNotice = a.isDuplicateOf ? ` [DUPLICATE of ${a.isDuplicateOf}]` : '';
    const refCount = a.discoveredReferences.length;
    console.log(
      `  - ${a.fileName.padEnd(35)} | ${`${a.width}x${a.height}`.padEnd(11)} | ${(Math.round(a.fileSizeBytes / 1024) + ' KB').padStart(8)} | Refs: ${refCount}${dupNotice}\n    Target Public ID: ${a.proposedPublicId}`
    );
  }

  console.log('\n-----------------------------------------------------------------------------');
  console.log('⚠️ UNREFERENCED / ORPHAN ASSETS IN MONOREPO:');
  console.log('-----------------------------------------------------------------------------');
  const orphans = assets.filter((a) => !a.excluded && a.discoveredReferences.length === 0);
  if (orphans.length === 0) {
    console.log('  None. All eligible assets have active code references.');
  } else {
    for (const o of orphans) {
      console.log(`  - ${o.originalPath} (${Math.round(o.fileSizeBytes / 1024)} KB)`);
    }
  }

  console.log('\n=============================================================================\n');
}

export async function uploadAssets(manifest: MigrationManifest) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('\n❌ ERROR: Cloudinary environment variables are missing!');
    console.error('Please configure the following in your .env file:');
    console.error('  CLOUDINARY_CLOUD_NAME=');
    console.error('  CLOUDINARY_API_KEY=');
    console.error('  CLOUDINARY_API_SECRET=');
    console.error('\nRun with --dry-run or configure credentials to proceed with upload.\n');
    return false;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });

  console.log(`\n🚀 Connected to Cloudinary cloud: ${cloudName}`);
  console.log(`Starting idempotent uploads with retry and backoff...\n`);

  const eligible = manifest.assets.filter((a) => !a.excluded && a.uploadStatus !== 'uploaded');
  console.log(`Pending uploads: ${eligible.length} of ${manifest.assets.length}`);

  let successCount = 0;
  let failCount = 0;

  for (const asset of eligible) {
    const fullPath = path.resolve(process.cwd(), asset.originalPath);
    if (!fs.existsSync(fullPath)) {
      console.warn(`⚠️ Source file not found: ${fullPath}`);
      asset.uploadStatus = 'failed';
      asset.lastError = 'Source file missing locally';
      continue;
    }

    // If this is an exact duplicate of another asset that was already uploaded, reuse its URL
    if (asset.isDuplicateOf) {
      const primary = manifest.assets.find(
        (a) => a.originalPath === asset.isDuplicateOf && a.uploadStatus === 'uploaded' && a.cloudinarySecureUrl
      );
      if (primary) {
        asset.cloudinarySecureUrl = primary.cloudinarySecureUrl;
        asset.cloudinaryPublicId = primary.cloudinaryPublicId;
        asset.uploadStatus = 'uploaded';
        asset.verificationStatus = primary.verificationStatus;
        asset.lastError = null;
        console.log(`   ⚡ Reused verified Cloudinary URL from identical asset: ${asset.isDuplicateOf}`);
        successCount++;
        continue;
      }
    }

    console.log(`📤 Uploading: ${asset.fileName} -> ${asset.proposedPublicId}...`);

    let attempts = 0;
    const maxAttempts = 3;
    let uploaded = false;

    while (attempts < maxAttempts && !uploaded) {
      attempts++;
      try {
        const result: UploadApiResponse = await new Promise((resolve, reject) => {
          cloudinary.uploader.upload(
            fullPath,
            {
              public_id: asset.proposedPublicId,
              overwrite: true,
              resource_type: 'image',
              tags: ['laundelle', 'monorepo-migration'],
              format: asset.extension === '.svg' ? 'svg' : undefined,
            },
            (err, res) => {
              if (err) return reject(err);
              if (!res) return reject(new Error('No response from Cloudinary'));
              resolve(res);
            }
          );
        });

        asset.cloudinarySecureUrl = result.secure_url;
        asset.cloudinaryPublicId = result.public_id;
        asset.uploadStatus = 'uploaded';
        asset.lastError = null;
        uploaded = true;
        successCount++;
        console.log(`   ✅ Success! URL: ${result.secure_url}`);
      } catch (err: any) {
        console.warn(`   ⚠️ Attempt ${attempts} failed: ${err.message}`);
        if (attempts >= maxAttempts) {
          asset.uploadStatus = 'failed';
          asset.lastError = err.message;
          failCount++;
        } else {
          // Exponential backoff
          await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempts)));
        }
      }
    }

    // Save manifest incrementally
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  }

  console.log(`\n🎉 Upload pass completed: ${successCount} uploaded, ${failCount} failed.`);
  return failCount === 0;
}

export async function verifyAssets(manifest: MigrationManifest) {
  console.log('\n🔎 Verifying uploaded Cloudinary assets via HTTP HEAD requests...');

  const uploadedAssets = manifest.assets.filter((a) => a.uploadStatus === 'uploaded' && a.cloudinarySecureUrl);
  if (uploadedAssets.length === 0) {
    console.log('No uploaded assets to verify in manifest.');
    return;
  }

  let verifiedCount = 0;
  let failedCount = 0;

  for (const asset of uploadedAssets) {
    try {
      const url = asset.cloudinarySecureUrl!;
      const resp = await fetch(url, { method: 'HEAD' });
      if (resp.ok) {
        asset.verificationStatus = 'verified';
        asset.lastError = null;
        verifiedCount++;
        console.log(`   ✓ Verified [${resp.status}]: ${asset.proposedPublicId}`);
      } else {
        asset.verificationStatus = 'failed';
        asset.lastError = `HTTP ${resp.status} on verification`;
        failedCount++;
        console.warn(`   ✗ Verification failed [${resp.status}]: ${url}`);
      }
    } catch (err: any) {
      asset.verificationStatus = 'failed';
      asset.lastError = err.message;
      failedCount++;
      console.warn(`   ✗ Verification error: ${err.message}`);
    }
  }

  manifest.updatedAt = new Date().toISOString();
  fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`\n✅ Verification completed: ${verifiedCount} verified, ${failedCount} failed.`);
}

export function deleteLocalAssets(manifest: MigrationManifest, isDryRun: boolean = true) {
  console.log(`\n🗑️ Local Deletion Routine (DryRun: ${isDryRun})...`);

  const candidates = manifest.assets.filter(
    (a) => !a.excluded && a.uploadStatus === 'uploaded' && a.verificationStatus === 'verified'
  );

  console.log(`Found ${candidates.length} verified candidate assets for local deletion.`);

  for (const asset of candidates) {
    const fullPath = path.resolve(process.cwd(), asset.originalPath);
    if (!fs.existsSync(fullPath)) {
      console.log(`   - Already removed: ${asset.originalPath}`);
      asset.localDeletionStatus = 'deleted';
      continue;
    }

    if (isDryRun) {
      console.log(`   [DRY RUN] Would delete: ${asset.originalPath}`);
    } else {
      fs.unlinkSync(fullPath);
      asset.localDeletionStatus = 'deleted';
      console.log(`   [DELETED] Removed: ${asset.originalPath}`);
    }
  }

  if (!isDryRun) {
    manifest.updatedAt = new Date().toISOString();
    fs.writeFileSync(MANIFEST_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  }
}

async function main() {
  const args = process.argv.slice(2);
  const isUpload = args.includes('--upload');
  const isVerify = args.includes('--verify');
  const isDeleteLocal = args.includes('--delete-local');
  const isReport = args.includes('--report');
  const isResume = args.includes('--resume');
  const isDryRun = args.includes('--dry-run') || (!isUpload && !isVerify && !isDeleteLocal);

  console.log('═════════════════════════════════════════════════════════════════════════════');
  console.log('   LAUNDELLE — Cloudinary Image Migration & Optimisation Engine             ');
  console.log('═════════════════════════════════════════════════════════════════════════════');

  const manifest = performAudit();
  printAuditReport(manifest);

  if (isUpload) {
    await uploadAssets(manifest);
  }

  if (isVerify) {
    await verifyAssets(manifest);
  }

  if (isDeleteLocal) {
    deleteLocalAssets(manifest, isDryRun);
  }

  if (isDryRun && !isUpload && !isVerify && !isDeleteLocal) {
    console.log('ℹ️ Dry-run mode completed. No files were modified, uploaded, or deleted.');
    console.log('To perform uploads, add Cloudinary credentials to .env and run:');
    console.log('  pnpm run migrate:images --upload\n');
  }
}

main().catch((err) => {
  console.error('Fatal error during migration execution:', err);
  process.exit(1);
});

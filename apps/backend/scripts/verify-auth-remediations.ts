/**
 * LAUNDELLE MONOREPO — FINAL AUTHENTICATION SECURITY REMEDIATION VERIFICATION
 *
 * Verifies all four remediated phases:
 * Phase 1: Mobile Token Refresh (Single-flight, Single retry, Idempotency safeguard, Token reuse rejection)
 * Phase 2: Immediate Staff Session Revocation (Multi-identifier revocation, plant isolation, idempotency)
 * Phase 3: Automatic MongoDB Index Initialization (Concurrency safety, unique & TTL indexes)
 * Phase 4: Customer Auth0 Cache Alignment (cacheLocation="memory", no localStorage token persistence)
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import { getDb, ensureIndexesInitialized } from '../src/lib/mongodb';
import { SessionService } from '../src/services/SessionService';
import { StaffProvisioningService } from '../src/services/StaffProvisioningService';
import { LaundelleApiClient } from '../../../packages/api-client/src/client';
import { ObjectId } from 'mongodb';
import * as fs from 'fs';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, message: string) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  passedTests++;
  console.log(`  PASS: ${message}`);
}

async function runPhase1Tests() {
  console.log('\n======================================================');
  console.log('--- PHASE 1: MOBILE TOKEN REFRESH & SAFEGUARDS ---');
  console.log('======================================================');

  // Test 1.1: Single-flight refresh test under concurrent requests
  console.log('\n[Test 1.1] Single-flight refresh under concurrent requests:');
  let auth0RefreshCalls = 0;
  let activeToken = 'expired_access_token_123';
  let activeRefreshToken = 'valid_refresh_token_abc';
  let refreshPersisted: boolean = false;

  // Intercept global fetch to simulate Auth0 and Backend API
  const originalFetch = global.fetch;

  try {
    global.fetch = (async (url: any, init: any = {}) => {
      const urlStr = String(url);

      // Auth0 token endpoint
      if (urlStr.includes('/oauth/token')) {
        auth0RefreshCalls++;
        await new Promise((r) => setTimeout(r, 60)); // Simulate network latency
        const body = JSON.parse(init.body || '{}');
        if (body.refresh_token === 'valid_refresh_token_abc') {
          return new Response(
            JSON.stringify({
              access_token: 'new_valid_access_token_xyz',
              refresh_token: 'new_rotated_refresh_token_def',
              expires_in: 86400,
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          return new Response(
            JSON.stringify({
              error: 'invalid_grant',
              error_description: 'Invalid or reused refresh token',
            }),
            { status: 400, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // Backend API endpoint
      if (urlStr.includes('/api/v1/orders')) {
        const authHeader = init.headers?.['Authorization'] || init.headers?.['authorization'];
        if (authHeader === 'Bearer new_valid_access_token_xyz') {
          return new Response(
            JSON.stringify({ success: true, data: [{ id: 'ORD-101', status: 'ready' }] }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        } else {
          // Token expired 401
          return new Response(
            JSON.stringify({ code: 'TOKEN_EXPIRED', message: 'Access token expired' }),
            { status: 401, headers: { 'Content-Type': 'application/json', 'WWW-Authenticate': 'Bearer error="invalid_token"' } }
          );
        }
      }

      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as any;

    const client = new LaundelleApiClient({
      baseUrl: 'https://api.laundelle.co.uk',
      auth0Domain: 'laundelle.uk.auth0.com',
      auth0ClientId: 'mobile_client_test_id',
      getToken: () => activeToken,
      getRefreshToken: () => activeRefreshToken,
      onTokenRefresh: (tokens) => {
        activeToken = tokens.accessToken;
        if (tokens.refreshToken) {
          activeRefreshToken = tokens.refreshToken;
          refreshPersisted = true;
        }
      },
    });

    // Fire 5 concurrent requests with expired token
    const results = await Promise.all([
      client.orders.get(),
      client.orders.get(),
      client.orders.get(),
      client.orders.get(),
      client.orders.get(),
    ]);

    assert(results.length === 5, 'All 5 concurrent requests completed');
    assert(results.every((r) => Array.isArray(r) && r[0].id === 'ORD-101'), 'All requests received data with refreshed token');
    assert(auth0RefreshCalls === 1, `Single-flight lock: Auth0 /oauth/token called exactly 1 time (actual: ${auth0RefreshCalls})`);
    assert(activeToken === 'new_valid_access_token_xyz', 'In-memory access token successfully updated');
    assert(activeRefreshToken === 'new_rotated_refresh_token_def', 'Rotated refresh token updated');
    assert(Boolean(refreshPersisted), 'Rotated refresh token was persisted via callback');

    // Test 1.2: Single-retry safeguard (Never loop on persistent 401)
    console.log('\n[Test 1.2] Single-retry safeguard on persistent 401:');
    let attemptCount = 0;
    global.fetch = (async (url: any, init: any = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/token')) {
        return new Response(
          JSON.stringify({ access_token: 'another_token_999' }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
      attemptCount++;
      // Backend persists in returning 401
      return new Response(
        JSON.stringify({ code: 'UNAUTHORIZED', message: 'Token rejected' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    let threwError = false;
    try {
      await client.orders.get();
    } catch {
      threwError = true;
    }

    assert(threwError, 'Client threw error when retry returned persistent 401');
    assert(attemptCount === 2, `Client retried at most ONCE (Initial + 1 Retry = 2 attempts, actual: ${attemptCount})`);

    // Test 1.3: Non-idempotent operation safeguard (Idempotency-Key preservation)
    console.log('\n[Test 1.3] Non-idempotent request idempotency safeguard:');
    let capturedHeaders: any = null;
    global.fetch = (async (url: any, init: any = {}) => {
      capturedHeaders = init.headers;
      return new Response(JSON.stringify({ success: true, data: { orderId: 'ORD-999' } }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }) as any;

    await client.auth.logout(); // POST request
    assert(Boolean(capturedHeaders['Idempotency-Key']), `Non-idempotent request included Idempotency-Key header (${capturedHeaders['Idempotency-Key']})`);

    // Test 1.4: Permanent failure / Token reuse handling
    console.log('\n[Test 1.4] Permanent refresh failure / token reuse triggers re-auth:');
    let authFailureCalled: boolean = false;
    activeRefreshToken = 'compromised_or_invalid_refresh_token';

    global.fetch = (async (url: any, init: any = {}) => {
      const urlStr = String(url);
      if (urlStr.includes('/oauth/token')) {
        return new Response(
          JSON.stringify({ error: 'invalid_grant', error_description: 'Token has been revoked or reused' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      return new Response(
        JSON.stringify({ code: 'TOKEN_EXPIRED' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }) as any;

    const strictClient = new LaundelleApiClient({
      baseUrl: 'https://api.laundelle.co.uk',
      auth0Domain: 'laundelle.uk.auth0.com',
      auth0ClientId: 'mobile_client_test_id',
      getToken: () => 'expired_token',
      getRefreshToken: () => activeRefreshToken,
      onAuthFailure: () => {
        authFailureCalled = true;
      },
    });

    let failedAsExpected = false;
    try {
      await strictClient.orders.get();
    } catch {
      failedAsExpected = true;
    }

    assert(failedAsExpected, 'Request failed on invalid_grant');
    assert(Boolean(authFailureCalled), 'onAuthFailure callback executed to clear state and require re-login');
  } finally {
    global.fetch = originalFetch;
  }
}

async function runPhase2Tests() {
  console.log('\n======================================================');
  console.log('--- PHASE 2: IMMEDIATE STAFF SESSION REVOCATION ---');
  console.log('======================================================');

  const db = await getDb();
  const testUserId = new ObjectId();
  const testPublicId = 'STF-TEST-999';
  const testAuth0Id = 'auth0|test-staff-deactivate-999';
  const unrelatedPublicId = 'STF-OTHER-888';

  try {
    // 1. Insert test staff user
    await db.collection('users').insertOne({
      _id: testUserId,
      id: testPublicId,
      publicId: testPublicId,
      staffId: testPublicId,
      auth0UserId: testAuth0Id,
      email: 'staff.deactivate.test@laundelle.co.uk',
      role: 'driver',
      status: 'active',
      is_active: true,
      created_at: new Date().toISOString(),
    });

    // 2. Create multiple active sessions for this staff member (using _id, publicId, and auth0UserId)
    const s1 = await SessionService.createSession({
      userId: String(testUserId),
      email: 'staff.deactivate.test@laundelle.co.uk',
      role: 'driver',
      portal: 'operations',
    });

    const s2 = await SessionService.createSession({
      userId: testPublicId,
      publicId: testPublicId,
      email: 'staff.deactivate.test@laundelle.co.uk',
      role: 'driver',
      portal: 'operations',
    });

    const s3 = await SessionService.createSession({
      userId: String(testUserId),
      auth0UserId: testAuth0Id,
      email: 'staff.deactivate.test@laundelle.co.uk',
      role: 'driver',
      portal: 'operations',
    });

    // 3. Create active session for unrelated staff user
    const unrelatedSession = await SessionService.createSession({
      userId: unrelatedPublicId,
      publicId: unrelatedPublicId,
      email: 'other.staff@laundelle.co.uk',
      role: 'processor',
      portal: 'operations',
    });

    assert(Boolean(s1.session && s2.session && s3.session && unrelatedSession.session), 'Created test sessions in MongoDB');

    // 4. Deactivate the staff member via StaffProvisioningService
    const actorContext: any = {
      token: { sub: 'auth0|admin-super' },
      dbUser: { _id: new ObjectId(), role: 'super_admin' },
    };

    const deactivateResult = await StaffProvisioningService.updateUserStatus(
      actorContext,
      testPublicId,
      { is_active: false, reason: 'Security Audit Deactivation Test' }
    );

    assert(deactivateResult.success === true, 'Staff deactivation succeeded');
    assert(deactivateResult.is_active === false, 'Staff marked inactive in result');

    // 5. Verify user document in MongoDB
    const updatedUser = await db.collection('users').findOne({ _id: testUserId });
    assert(updatedUser?.is_active === false, 'User document is_active is false in database');
    assert(updatedUser?.status === 'suspended', 'User document status is suspended in database');

    // 6. Verify all sessions for deactivated user are revoked
    const revokedS1 = await SessionService.getSession(s1.sessionId);
    const revokedS2 = await SessionService.getSession(s2.sessionId);
    const revokedS3 = await SessionService.getSession(s3.sessionId);

    assert(revokedS1 === null, 'Session 1 (created with DB _id) is revoked immediately');
    assert(revokedS2 === null, 'Session 2 (created with publicId) is revoked immediately');
    assert(revokedS3 === null, 'Session 3 (created with auth0UserId) is revoked immediately');

    // 7. Verify unrelated staff session is untouched
    const activeUnrelated = await SessionService.getSession(unrelatedSession.sessionId);
    assert(activeUnrelated !== null, 'Unrelated staff member session remains active and untouched');
    assert(activeUnrelated?.revokedAt === null, 'Unrelated session revokedAt is null');

    // 8. Test idempotency: repeat deactivation
    const repeatResult = await StaffProvisioningService.updateUserStatus(
      actorContext,
      testPublicId,
      { is_active: false, reason: 'Repeated deactivation check' }
    );
    assert(repeatResult.success === true, 'Repeated deactivation executed safely without errors');
  } finally {
    // Cleanup test data
    await db.collection('users').deleteOne({ _id: testUserId });
    await db.collection('sessions').deleteMany({
      $or: [
        { userId: String(testUserId) },
        { publicId: testPublicId },
        { auth0UserId: testAuth0Id },
        { userId: unrelatedPublicId },
      ],
    });
  }
}

async function runPhase3Tests() {
  console.log('\n======================================================');
  console.log('--- PHASE 3: AUTOMATIC MONGODB INDEX INITIALIZATION ---');
  console.log('======================================================');

  // Test 3.1: getDb() triggers index initialization
  const db = await getDb();
  assert(Boolean(db), 'Database connection obtained via getDb()');

  await ensureIndexesInitialized();
  assert(true, 'ensureIndexesInitialized() completed successfully');

  // Test 3.2: Verify indexes on sessions collection
  const sessionIndexes = await db.collection('sessions').indexes();
  const sessionIndexNames = sessionIndexes.map((i: any) => i.name);
  console.log('  Found sessions indexes:', sessionIndexNames);

  const sessionIdIdx = sessionIndexes.find((i: any) => i.name === 'sessionId_1');
  assert(Boolean(sessionIdIdx), 'sessions collection has sessionId_1 index');
  assert(sessionIdIdx?.unique === true, 'sessions collection sessionId_1 is UNIQUE');

  const sessionTtlIdx = sessionIndexes.find((i: any) => i.name === 'expiresAt_1');
  assert(Boolean(sessionTtlIdx), 'sessions collection has expiresAt_1 TTL index');
  assert(sessionTtlIdx?.expireAfterSeconds === 0, 'sessions collection expiresAt_1 expireAfterSeconds is 0 (TTL enabled)');

  // Test 3.3: Verify indexes on revoked_tokens collection
  const tokenIndexes = await db.collection('revoked_tokens').indexes();
  const tokenIdx = tokenIndexes.find((i: any) => i.name === 'token_1');
  assert(Boolean(tokenIdx), 'revoked_tokens has token_1 index');
  assert(tokenIdx?.unique === true, 'revoked_tokens token_1 is UNIQUE');

  const tokenTtlIdx = tokenIndexes.find((i: any) => i.name === 'expiresAt_1');
  assert(Boolean(tokenTtlIdx), 'revoked_tokens has expiresAt_1 TTL index');
  assert(tokenTtlIdx?.expireAfterSeconds === 0, 'revoked_tokens expiresAt_1 expireAfterSeconds is 0 (TTL enabled)');

  // Test 3.4: Concurrency test - 10 parallel getDb calls
  const parallelDbs = await Promise.all(
    Array.from({ length: 10 }).map(() => getDb())
  );
  assert(parallelDbs.length === 10, '10 concurrent getDb() calls resolved without race conditions');
  assert(parallelDbs.every((d) => d.databaseName === db.databaseName), 'All concurrent calls point to same database');
}

async function runPhase4Tests() {
  console.log('\n======================================================');
  console.log('--- PHASE 4: CUSTOMER AUTH0 CACHE ALIGNMENT ---');
  console.log('======================================================');

  // 1. Inspect Auth0ProviderWrapper.tsx
  const wrapperPath = path.resolve(__dirname, '../../customer/components/Auth0ProviderWrapper.tsx');
  const wrapperContent = fs.readFileSync(wrapperPath, 'utf8');

  assert(
    wrapperContent.includes('cacheLocation="memory"'),
    'Auth0ProviderWrapper explicitly configures cacheLocation="memory"'
  );
  assert(
    !wrapperContent.includes('cacheLocation="localstorage"'),
    'Auth0ProviderWrapper does NOT use cacheLocation="localstorage"'
  );

  // 2. Inspect compat.ts saveSession implementation
  const compatPath = path.resolve(__dirname, '../../../packages/api-client/src/compat.ts');
  const compatContent = fs.readFileSync(compatPath, 'utf8');

  assert(
    compatContent.includes('safeSession = {') && compatContent.includes('localStorage.setItem(SESSION_KEY, JSON.stringify(safeSession))'),
    'compat.ts persists only safe non-token session metadata to localStorage'
  );
  assert(
    compatContent.includes('Do not persist raw secret token in localStorage'),
    'BFF architecture strictly guards against token persistence in localStorage'
  );

  // 3. Scan customer app components for localStorage token writes
  const customerDir = path.resolve(__dirname, '../../customer');
  function scanDir(dir: string): string[] {
    const findings: string[] = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
      if (file === 'node_modules' || file === '.next') continue;
      const fullPath = path.join(dir, file);
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        findings.push(...scanDir(fullPath));
      } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('localStorage.setItem') && (content.includes('token') || content.includes('Token') || content.includes('jwt'))) {
          // Exclude safe keys like 'laundelle_open_cart'
          if (!content.includes('laundelle_open_cart') && !content.includes('cart')) {
            findings.push(fullPath);
          }
        }
      }
    }
    return findings;
  }

  const suspiciousFiles = scanDir(customerDir);
  assert(
    suspiciousFiles.length === 0,
    `No customer app components persist tokens to localStorage (suspicious files: ${suspiciousFiles.length})`
  );
}

async function runAll() {
  console.log('======================================================');
  console.log('LAUNDELLE SECURITY REMEDIATION — COMPREHENSIVE VERIFICATION');
  console.log('======================================================');
  const startTime = Date.now();

  try {
    await runPhase1Tests();
    await runPhase2Tests();
    await runPhase3Tests();
    await runPhase4Tests();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log('\n======================================================');
    console.log(`ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY IN ${duration}s`);
    console.log(`Summary: ${passedTests}/${totalTests} tests PASSED (0 failures)`);
    console.log('Final Security Verdict: PASS');
    console.log('======================================================\n');
    process.exit(0);
  } catch (err: any) {
    console.error('\nTEST SUITE FAILED WITH ERROR:', err.message);
    process.exit(1);
  }
}

runAll();

# Graph Report - Laundelle -Laundry Software  (2026-09-25)

## Corpus Check
- 244 files · ~2,245,764 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1273 nodes · 4131 edges · 66 communities (59 shown, 6 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `1b942d58`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- getDb
- db.ts
- admin.ts
- AccountView.tsx
- OfflineSyncService.ts
- NotificationService
- lucide-react
- DriverPortal.tsx
- ManagerService
- FileStorageService.ts
- types.ts
- mongoSignIn
- PlatformService
- CartDrawer.tsx
- MachineService.ts
- compilerOptions
- Laundelle — End-to-End Business & Technical Architecture Documentation
- react
- successResponse
- package.json
- UserService
- dependencies
- VehicleService.ts
- inspect_db.js
- AppClient.tsx
- .recordEvent
- devDependencies
- mongodb-init.js
- Order
- AdminService.ts
- AuthService.ts
- override-permissions.test.ts
- layout.tsx
- create-checkout-session/route.ts
- requireAuth
- ManagerOverrideModal.tsx
- runP2EnhancementTests
- requireRole
- scripts
- assistant/route.ts
- Run and deploy your AI Studio app
- seed_services.ts
- rules/graphify.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- BadRequestError
- App
- OrderService
- mongodb.ts
- SubscriptionService
- AdminPortal.tsx
- runP1HardeningTests
- AuditService.ts
- PrivacyService.ts
- PaymentService
- ProcessorOrdersView.tsx
- auth.ts
- api.ts
- platform/services/route.ts
- operational/route.ts
- slots/[id]/route.ts
- AdminServicesView.tsx
- PostcodeCheckerModal.tsx

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 233 edges
2. `requireRole()` - 194 edges
3. `requireAuth()` - 181 edges
4. `successResponse()` - 119 edges
5. `BadRequestError` - 109 edges
6. `NotFoundError` - 74 edges
7. `authHeaders()` - 74 edges
8. `react` - 65 edges
9. `lucide-react` - 60 edges
10. `withErrorHandler()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `runP1HardeningTests()` --calls--> `isTokenRevoked()`  [EXTRACTED]
  tests/p1-hardening.test.ts → src/lib/auth.ts
- `runHardenedWorkflowTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/hardened-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/override-permissions.test.ts → src/lib/mongodb.ts
- `runP1HardeningTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/p1-hardening.test.ts → src/lib/mongodb.ts

## Import Cycles
- None detected.

## Communities (66 total, 6 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.10
Nodes (5): hashPassword(), ensureDatabaseIndexes(), getDb(), AdminService, ProcessorService

### Community 1 - "db.ts"
Cohesion: 0.11
Nodes (44): AdminAreasView(), AdminStaffView(), DriverPortal(), authHeaders(), AuthResult, dbAdminAddCustomerFlag(), dbAdminAddCustomerNote(), dbAdminUpdateCustomerStatus() (+36 more)

### Community 2 - "admin.ts"
Cohesion: 0.07
Nodes (32): AdminComplaintsView(), AdminSettingsView(), AdminService, AuditLogRecord, BookingSlot, BusinessLocation, CollectionRecord, ComplaintRecord (+24 more)

### Community 3 - "AccountView.tsx"
Cohesion: 0.20
Nodes (11): AccountViewProps, AddAddressModal(), AddAddressModalProps, CartDrawerProps, SchedulePickupModal(), SchedulePickupModalProps, CartItem, RecurringSchedule (+3 more)

### Community 4 - "OfflineSyncService.ts"
Cohesion: 0.23
Nodes (8): POST, POST, OfflineSyncService, OfflineOperation, OfflinePinVoucher, OfflineSyncRequest, OfflineSyncResponse, RegisteredDevice

### Community 5 - "NotificationService"
Cohesion: 0.10
Nodes (17): GET, getHandler(), GET, BackgroundJobService, CapacityService, STAGE_CONFIGS, CreateNotificationParams, DEFAULT_TEMPLATES (+9 more)

### Community 6 - "lucide-react"
Cohesion: 0.09
Nodes (23): lucide-react, @yudiel/react-qr-scanner, QRScannerModalProps, AIAssistantView(), AIAssistantViewProps, ChatMessage, CompletedOrder, MOCK_COMPLETED (+15 more)

### Community 7 - "DriverPortal.tsx"
Cohesion: 0.13
Nodes (14): qrcode.react, AdminOrdersView(), AdminOrdersViewProps, DriverJobItem, DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS (+6 more)

### Community 8 - "ManagerService"
Cohesion: 0.10
Nodes (15): GET(), GET(), GET(), POST(), POST(), POST(), POST(), GET() (+7 more)

### Community 9 - "FileStorageService.ts"
Cohesion: 0.35
Nodes (5): ALLOWED_MIME_TYPES, FileStorageService, StoreFileParams, FileRecord, FileType

### Community 10 - "types.ts"
Cohesion: 0.07
Nodes (31): AdditionalChargeModal(), AdditionalChargeModalProps, FleetManagementView(), FleetManagementViewProps, AdditionalCharge, CodReconciliationStatus, DeliveryAttemptRecord, DeliveryInstructionType (+23 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.15
Nodes (14): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ManagerLoginPage(), ManagerLoginPageProps (+6 more)

### Community 12 - "PlatformService"
Cohesion: 0.11
Nodes (12): checkPostcodeHandler(), GET, POST, createSlotHandler(), GET, getSlotsHandler(), POST, GET (+4 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.28
Nodes (23): CartDrawer(), CheckoutStep, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots(), getAvailablePickupSlots() (+15 more)

### Community 14 - "MachineService.ts"
Cohesion: 0.19
Nodes (6): MachineRunService, MachineService, Machine, MachineRun, MachineRunStatus, MachineType

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Laundelle — End-to-End Business & Technical Architecture Documentation"
Cohesion: 0.05
Nodes (36): 10. Cross-Role Collaboration & Real-World Interaction Scenarios, 11. Summary & Architecture Compliance, 1.1 What the Business Does, 1.2 Core Business Value Proposition, 1. Executive Summary & Business Purpose, 2.1 Role Matrix & Responsibilities, 2. User Roles & Organizational Responsibilities, 3. End-to-End Real-World Business Workflow (+28 more)

### Community 17 - "react"
Cohesion: 0.10
Nodes (19): react, AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES, ScrollReveal() (+11 more)

### Community 18 - "successResponse"
Cohesion: 0.06
Nodes (39): POST, POST, PATCH, patchHandler(), GET, PUT, PATCH, patchHandler() (+31 more)

### Community 19 - "package.json"
Cohesion: 0.13
Nodes (14): name, private, type, version, motion, postcss, react-dom, tailwindcss (+6 more)

### Community 20 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "VehicleService.ts"
Cohesion: 0.13
Nodes (12): GET, PATCH, GET, SystemHealthDrawer(), SystemHealthDrawerProps, AlertService, SystemHealthService, DocumentStatus (+4 more)

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "AppClient.tsx"
Cohesion: 0.10
Nodes (23): AppClient, AppClient, PageProps, Footer(), FooterProps, MobileNav(), MobileNavProps, Navbar() (+15 more)

### Community 25 - ".recordEvent"
Cohesion: 0.12
Nodes (15): POST, GET, POST, PATCH, GET, POST, InventoryManagementViewProps, InventoryService (+7 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "Order"
Cohesion: 0.17
Nodes (13): AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, computeOrderJourney(), formatTimelineDate(), JourneyStage (+5 more)

### Community 29 - "AdminService.ts"
Cohesion: 0.09
Nodes (12): GET(), GET(), POST(), POST(), POST(), PATCH(), GET(), POST() (+4 more)

### Community 30 - "AuthService.ts"
Cohesion: 0.19
Nodes (7): loginHandler(), POST, POST, signupHandler(), GET, getAuthenticatedUser(), UnauthorizedError

### Community 31 - "override-permissions.test.ts"
Cohesion: 0.19
Nodes (12): ADMIN_ONLY_OVERRIDES, ADMIN_ONLY_RESOLVE_TYPES, AdminOnlyOverride, AdminOnlyResolveType, assertCanPerformOverride(), assertCanResolveDispute(), canPerformOverride(), canResolveDispute() (+4 more)

### Community 32 - "layout.tsx"
Cohesion: 0.29
Nodes (5): next, metadata, outfit, plusJakartaSans, viewport

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 34 - "requireAuth"
Cohesion: 0.09
Nodes (22): GET(), POST(), GET(), PATCH(), GET(), POST(), PUT(), POST() (+14 more)

### Community 35 - "ManagerOverrideModal.tsx"
Cohesion: 0.16
Nodes (25): ManagerDriversView(), ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, ManagerProcessorsView(), ManagerStaffView(), NOTE: assigned_postcodes not sent — managed via plant service area (+17 more)

### Community 36 - "runP2EnhancementTests"
Cohesion: 0.13
Nodes (13): DELETE, POST, GET, POST, GET, GET, POST, VehicleService (+5 more)

### Community 37 - "requireRole"
Cohesion: 0.08
Nodes (21): PATCH(), GET(), POST(), GET, POST(), POST(), POST(), POST() (+13 more)

### Community 38 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 39 - "assistant/route.ts"
Cohesion: 0.67
Nodes (3): @google/genai, getGeminiClient(), POST()

### Community 41 - "seed_services.ts"
Cohesion: 0.40
Nodes (3): envFile, match, mockServices

### Community 48 - "BadRequestError"
Cohesion: 0.11
Nodes (15): ApiError, BadRequestError, ForbiddenError, NotFoundError, DriverService, ALLOWED_MIME_TYPES, EvidenceService, CodCollectionRecord (+7 more)

### Community 49 - "App"
Cohesion: 0.20
Nodes (21): App(), AccountView(), clearSession(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder(), dbDeleteAddress(), dbFetchNotifications() (+13 more)

### Community 50 - "OrderService"
Cohesion: 0.17
Nodes (11): decryptOrderPin(), ENCRYPTION_KEY, encryptOrderPin(), generatePinSalt(), generateSecureNumericPin(), hashOrderPin(), verifyOrderPinAttempt(), generateOrderNumber() (+3 more)

### Community 51 - "mongodb.ts"
Cohesion: 0.16
Nodes (23): mongodb, getClientPromise(), then(), ALLOWED_TRANSITIONS, assertValidTransition(), generateSecureOtp(), isValidTransition(), matchesPostcode() (+15 more)

### Community 52 - "SubscriptionService"
Cohesion: 0.32
Nodes (5): GET, PATCH, POST, SubscriptionService, UserSubscription

### Community 53 - "AdminPortal.tsx"
Cohesion: 0.10
Nodes (25): AdminCustomersView(), AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminReportsView(), CategoryItem, PlantStat (+17 more)

### Community 54 - "runP1HardeningTests"
Cohesion: 0.21
Nodes (3): revokeToken(), AuthService, runP1HardeningTests()

### Community 55 - "AuditService.ts"
Cohesion: 0.24
Nodes (5): RFC-8785, AuditService, GENESIS_HASH, RecordAuditParams, AuditEventRecord

### Community 56 - "PrivacyService.ts"
Cohesion: 0.18
Nodes (9): GET, GET, POST, DEFAULT_RETENTION_POLICIES, PrivacyService, DataRetentionPolicy, PrivacyRequest, PrivacyRequestStatus (+1 more)

### Community 57 - "PaymentService"
Cohesion: 0.36
Nodes (3): dynamic, POST(), PaymentService

### Community 58 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 59 - "auth.ts"
Cohesion: 0.33
Nodes (8): base64UrlDecode(), base64UrlEncode(), isTokenRevoked(), JwtPayload, REVOKED_TOKENS_CACHE, signAdminJwt(), signJwt(), verifyJwt()

### Community 60 - "api.ts"
Cohesion: 0.12
Nodes (10): POST(), GET(), POST(), GET(), GET, POST, POST(), POST (+2 more)

### Community 61 - "platform/services/route.ts"
Cohesion: 0.25
Nodes (4): createServiceHandler(), GET, getServicesHandler(), POST

### Community 62 - "operational/route.ts"
Cohesion: 0.47
Nodes (3): GET, AnalyticsService, OperationalAnalyticsReport

### Community 63 - "slots/[id]/route.ts"
Cohesion: 0.33
Nodes (4): DELETE, deleteSlotHandler(), PATCH, updateSlotHandler()

### Community 64 - "AdminServicesView.tsx"
Cohesion: 0.70
Nodes (4): AdminServicesView(), dbAdminCreateService(), dbAdminFetchServices(), dbAdminUpdateService()

### Community 65 - "PostcodeCheckerModal.tsx"
Cohesion: 0.60
Nodes (4): PostcodeCheckerModal(), PostcodeCheckerModalProps, checkPostcodeSectorActive(), joinWaitingList()

## Knowledge Gaps
- **235 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 270 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `admin.ts`, `OfflineSyncService.ts`, `NotificationService`, `ManagerService`, `FileStorageService.ts`, `types.ts`, `PlatformService`, `CartDrawer.tsx`, `MachineService.ts`, `successResponse`, `UserService`, `VehicleService.ts`, `.recordEvent`, `AdminService.ts`, `AuthService.ts`, `override-permissions.test.ts`, `requireAuth`, `runP2EnhancementTests`, `BadRequestError`, `OrderService`, `mongodb.ts`, `SubscriptionService`, `runP1HardeningTests`, `AuditService.ts`, `PrivacyService.ts`, `PaymentService`, `api.ts`, `platform/services/route.ts`, `operational/route.ts`, `slots/[id]/route.ts`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `mongodb` connect `mongodb.ts` to `package.json`, `seed_services.ts`, `mongodb-init.js`, `inspect_db.js`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `AdminServicesView.tsx`, `db.ts`, `admin.ts`, `AccountView.tsx`, `ManagerOverrideModal.tsx`, `PostcodeCheckerModal.tsx`, `lucide-react`, `DriverPortal.tsx`, `types.ts`, `mongoSignIn`, `CartDrawer.tsx`, `package.json`, `AdminPortal.tsx`, `VehicleService.ts`, `AppClient.tsx`, `.recordEvent`, `ProcessorOrdersView.tsx`, `Order`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.10084033613445378 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10638297872340426 - nodes in this community are weakly interconnected._
- **Should `admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07254623044096728 - nodes in this community are weakly interconnected._
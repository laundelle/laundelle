# Graph Report - Laundelle -Laundry Software  (2026-09-26)

## Corpus Check
- 244 files · ~2,246,027 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1273 nodes · 4129 edges · 64 communities (55 shown, 8 thin omitted)
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
- BadRequestError
- mongodb.ts
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
- p2-enhancement.test.ts
- inspect_db.js
- AppClient.tsx
- InventoryService.ts
- devDependencies
- mongodb-init.js
- Order
- AdminService.ts
- ServiceItem
- override-permissions.test.ts
- layout.tsx
- create-checkout-session/route.ts
- requireAuth
- ManagerOverrideModal.tsx
- withErrorHandler
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
- NotFoundError
- App
- .createOrder
- DriverService.ts
- .recordEvent
- AdminPortal.tsx
- runP1HardeningTests
- p1-hardening.test.ts
- PrivacyService.ts
- checkout-session/route.ts
- OperationalSearchService.ts
- auth.ts
- api.ts
- OrderService
- runP2EnhancementTests
- IncidentService

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
- `runP1HardeningTests()` --calls--> `revokeToken()`  [EXTRACTED]
  tests/p1-hardening.test.ts → src/lib/auth.ts
- `runP1HardeningTests()` --calls--> `isTokenRevoked()`  [EXTRACTED]
  tests/p1-hardening.test.ts → src/lib/auth.ts
- `runHardenedWorkflowTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/hardened-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/override-permissions.test.ts → src/lib/mongodb.ts

## Import Cycles
- None detected.

## Communities (64 total, 8 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.11
Nodes (3): ensureDatabaseIndexes(), getDb(), AdminService

### Community 1 - "db.ts"
Cohesion: 0.11
Nodes (42): AdminAreasView(), AdminOrdersView(), AdminServicesView(), AdminStaffView(), authHeaders(), AuthResult, dbAdminCreateService(), dbAdminFetchServices() (+34 more)

### Community 2 - "admin.ts"
Cohesion: 0.08
Nodes (31): AdminCustomersView(), AdminService, BookingSlot, BusinessLocation, CollectionRecord, CustomerCRM, CustomerFlag, CustomerNote (+23 more)

### Community 3 - "AccountView.tsx"
Cohesion: 0.22
Nodes (11): AccountView(), AccountViewProps, AddAddressModal(), AddAddressModalProps, CartDrawerProps, CartItem, RecurringSchedule, UserAddress (+3 more)

### Community 4 - "BadRequestError"
Cohesion: 0.18
Nodes (8): BadRequestError, ExceptionService, CodCollectionRecord, OperationalException, OperationalExceptionPriority, OperationalExceptionStatus, OperationalExceptionType, OrderItem

### Community 5 - "mongodb.ts"
Cohesion: 0.14
Nodes (17): mongodb, GET, getHandler(), GET, getHandler(), getClientPromise(), then(), CreateNotificationParams (+9 more)

### Community 6 - "lucide-react"
Cohesion: 0.07
Nodes (30): lucide-react, @yudiel/react-qr-scanner, FleetManagementView(), FleetManagementViewProps, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView() (+22 more)

### Community 7 - "DriverPortal.tsx"
Cohesion: 0.12
Nodes (19): qrcode.react, AdminOrdersViewProps, DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS (+11 more)

### Community 8 - "ManagerService"
Cohesion: 0.10
Nodes (15): GET(), GET(), GET(), POST(), POST(), POST(), POST(), GET() (+7 more)

### Community 9 - "FileStorageService.ts"
Cohesion: 0.20
Nodes (8): GET, getAuthenticatedUser(), UnauthorizedError, ALLOWED_MIME_TYPES, FileStorageService, StoreFileParams, FileRecord, FileType

### Community 10 - "types.ts"
Cohesion: 0.08
Nodes (29): AdditionalChargeModal(), AdditionalChargeModalProps, AdditionalCharge, CodReconciliationStatus, DeliveryAttemptRecord, DeliveryInstructionType, DocumentType, DriverAnalyticsReport (+21 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.15
Nodes (14): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ManagerLoginPage(), ManagerLoginPageProps (+6 more)

### Community 12 - "PlatformService"
Cohesion: 0.08
Nodes (17): checkPostcodeHandler(), GET, POST, createServiceHandler(), GET, getServicesHandler(), POST, updateSlotHandler() (+9 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.28
Nodes (23): CartDrawer(), CheckoutStep, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots(), getAvailablePickupSlots() (+15 more)

### Community 14 - "MachineService.ts"
Cohesion: 0.29
Nodes (3): MachineRunService, MachineRun, MachineRunStatus

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Laundelle — End-to-End Business & Technical Architecture Documentation"
Cohesion: 0.05
Nodes (36): 10. Cross-Role Collaboration & Real-World Interaction Scenarios, 11. Summary & Architecture Compliance, 1.1 What the Business Does, 1.2 Core Business Value Proposition, 1. Executive Summary & Business Purpose, 2.1 Role Matrix & Responsibilities, 2. User Roles & Organizational Responsibilities, 3. End-to-End Real-World Business Workflow (+28 more)

### Community 17 - "react"
Cohesion: 0.11
Nodes (17): react, AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES, ScrollReveal() (+9 more)

### Community 18 - "successResponse"
Cohesion: 0.06
Nodes (29): POST, POST, PATCH, patchHandler(), GET, PUT, PATCH, patchHandler() (+21 more)

### Community 19 - "package.json"
Cohesion: 0.13
Nodes (14): name, private, type, version, motion, postcss, react-dom, tailwindcss (+6 more)

### Community 20 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "p2-enhancement.test.ts"
Cohesion: 0.09
Nodes (18): POST, POST, GET, PATCH, GET, SystemHealthDrawer(), SystemHealthDrawerProps, AlertService (+10 more)

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "AppClient.tsx"
Cohesion: 0.11
Nodes (21): AppClient, AppClient, PageProps, Footer(), FooterProps, MobileNav(), MobileNavProps, Navbar() (+13 more)

### Community 25 - "InventoryService.ts"
Cohesion: 0.14
Nodes (15): POST, GET, POST, PATCH, GET, POST, InventoryManagementViewProps, InventoryService (+7 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "Order"
Cohesion: 0.14
Nodes (15): AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, computeOrderJourney(), formatTimelineDate(), JourneyStage (+7 more)

### Community 29 - "AdminService.ts"
Cohesion: 0.09
Nodes (12): GET(), GET(), POST(), POST(), POST(), PATCH(), GET(), POST() (+4 more)

### Community 30 - "ServiceItem"
Cohesion: 0.16
Nodes (11): AIAssistantView(), AIAssistantViewProps, ChatMessage, HomeViewProps, SchedulePickupModal(), SchedulePickupModalProps, DEFAULT_VARIANTS, ServiceCustomizeModal() (+3 more)

### Community 31 - "override-permissions.test.ts"
Cohesion: 0.29
Nodes (11): ADMIN_ONLY_OVERRIDES, ADMIN_ONLY_RESOLVE_TYPES, AdminOnlyOverride, AdminOnlyResolveType, assertCanPerformOverride(), assertCanResolveDispute(), canPerformOverride(), canResolveDispute() (+3 more)

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

### Community 36 - "withErrorHandler"
Cohesion: 0.14
Nodes (15): POST, GET, GET, POST, GET, GET, POST, withErrorHandler() (+7 more)

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

### Community 48 - "NotFoundError"
Cohesion: 0.14
Nodes (10): ApiError, ForbiddenError, NotFoundError, DriverService, ALLOWED_MIME_TYPES, EvidenceService, DeliveryFailureReason, EvidenceRecord (+2 more)

### Community 49 - "App"
Cohesion: 0.25
Nodes (18): App(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder(), dbDeleteAddress(), dbFetchNotifications(), dbFetchOrders(), dbFetchProfile() (+10 more)

### Community 50 - ".createOrder"
Cohesion: 0.41
Nodes (9): decryptOrderPin(), ENCRYPTION_KEY, encryptOrderPin(), generatePinSalt(), generateSecureNumericPin(), hashOrderPin(), verifyOrderPinAttempt(), generateOrderNumber() (+1 more)

### Community 51 - "DriverService.ts"
Cohesion: 0.23
Nodes (15): ALLOWED_TRANSITIONS, assertValidTransition(), generateSecureOtp(), isValidTransition(), matchesPostcode(), normalizeUkPostcode(), parseUkPostcode(), TRANSITION_METADATA (+7 more)

### Community 52 - ".recordEvent"
Cohesion: 0.32
Nodes (5): GET, PATCH, POST, SubscriptionService, UserSubscription

### Community 53 - "AdminPortal.tsx"
Cohesion: 0.08
Nodes (28): AdminComplaintsView(), AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminReportsView(), CategoryItem, PlantStat (+20 more)

### Community 54 - "runP1HardeningTests"
Cohesion: 0.18
Nodes (5): MachineService, Machine, MachineType, NotificationRecord, runP1HardeningTests()

### Community 55 - "p1-hardening.test.ts"
Cohesion: 0.14
Nodes (12): RFC-8785, GET, AuditService, GENESIS_HASH, RecordAuditParams, BackgroundJobService, CapacityService, STAGE_CONFIGS (+4 more)

### Community 56 - "PrivacyService.ts"
Cohesion: 0.18
Nodes (9): GET, GET, POST, DEFAULT_RETENTION_POLICIES, PrivacyService, DataRetentionPolicy, PrivacyRequest, PrivacyRequestStatus (+1 more)

### Community 57 - "checkout-session/route.ts"
Cohesion: 0.26
Nodes (5): dynamic, POST(), createCheckoutSessionHandler(), POST, PaymentService

### Community 58 - "OperationalSearchService.ts"
Cohesion: 0.24
Nodes (7): GET, GET, GET, OperationalSearchService, Customer360Profile, OperationalSearchResult, UniversalHistoryEvent

### Community 59 - "auth.ts"
Cohesion: 0.13
Nodes (15): loginHandler(), POST, POST, signupHandler(), base64UrlDecode(), base64UrlEncode(), hashPassword(), isTokenRevoked() (+7 more)

### Community 60 - "api.ts"
Cohesion: 0.12
Nodes (10): POST(), GET(), POST(), GET(), GET, POST, POST(), POST (+2 more)

### Community 62 - "runP2EnhancementTests"
Cohesion: 0.27
Nodes (5): GET, DELETE, AnalyticsService, OperationalAnalyticsReport, runP2EnhancementTests()

## Knowledge Gaps
- **235 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 270 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `admin.ts`, `BadRequestError`, `mongodb.ts`, `ManagerService`, `FileStorageService.ts`, `types.ts`, `PlatformService`, `CartDrawer.tsx`, `MachineService.ts`, `successResponse`, `UserService`, `p2-enhancement.test.ts`, `InventoryService.ts`, `AdminService.ts`, `override-permissions.test.ts`, `requireAuth`, `withErrorHandler`, `NotFoundError`, `.createOrder`, `DriverService.ts`, `.recordEvent`, `runP1HardeningTests`, `p1-hardening.test.ts`, `PrivacyService.ts`, `checkout-session/route.ts`, `OperationalSearchService.ts`, `auth.ts`, `api.ts`, `OrderService`, `runP2EnhancementTests`, `IncidentService`?**
  _High betweenness centrality (0.199) - this node is a cross-community bridge._
- **Why does `mongodb` connect `mongodb.ts` to `seed_services.ts`, `package.json`, `DriverService.ts`, `inspect_db.js`, `mongodb-init.js`?**
  _High betweenness centrality (0.067) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `admin.ts`, `AccountView.tsx`, `ManagerOverrideModal.tsx`, `lucide-react`, `DriverPortal.tsx`, `types.ts`, `mongoSignIn`, `CartDrawer.tsx`, `package.json`, `AdminPortal.tsx`, `p2-enhancement.test.ts`, `AppClient.tsx`, `InventoryService.ts`, `Order`, `ServiceItem`?**
  _High betweenness centrality (0.065) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.1111111111111111 - nodes in this community are weakly interconnected._
- **Should `admin.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08067226890756303 - nodes in this community are weakly interconnected._
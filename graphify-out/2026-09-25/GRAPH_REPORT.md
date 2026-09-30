# Graph Report - Laundelle -Laundry Software  (2026-09-23)

## Corpus Check
- 245 files · ~2,068,331 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1288 nodes · 4163 edges · 62 communities (54 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- getDb
- db.ts
- mockAdminData.ts
- AccountView.tsx
- mongodb.ts
- runP1HardeningTests
- lucide-react
- DriverPortal.tsx
- ManagerService
- FileStorageService.ts
- types.ts
- mongoSignIn
- api.ts
- CartDrawer.tsx
- MachineService.ts
- compilerOptions
- Laundelle — End-to-End Business & Technical Architecture Documentation
- react
- requireRole
- package.json
- UserService
- dependencies
- successResponse
- inspect_db.js
- AppClient.tsx
- runP2EnhancementTests
- devDependencies
- mongodb-init.js
- Order
- ManagerPortalView.tsx
- ManagerService.ts
- override-permissions.test.ts
- layout.tsx
- create-checkout-session/route.ts
- ProcessorService.ts
- ManagerOverrideModal.tsx
- VehicleService
- runHardenedWorkflowTests
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
- IncidentService.ts
- OrderService.ts
- hardened-workflow.test.ts
- OrderService
- AdminPortal.tsx
- ExceptionService.ts
- OperationalSearchService.ts
- PrivacyService.ts
- .createNotification
- ProcessorOrdersView.tsx
- SystemHealthDrawer.tsx
- tickets/route.ts
- AdminComplaintsView.tsx

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 231 edges
2. `requireRole()` - 193 edges
3. `requireAuth()` - 180 edges
4. `successResponse()` - 119 edges
5. `BadRequestError` - 109 edges
6. `NotFoundError` - 74 edges
7. `authHeaders()` - 72 edges
8. `react` - 65 edges
9. `lucide-react` - 60 edges
10. `withErrorHandler()` - 53 edges

## Surprising Connections (you probably didn't know these)
- `runHardenedWorkflowTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/hardened-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/override-permissions.test.ts → src/lib/mongodb.ts
- `runP1HardeningTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/p1-hardening.test.ts → src/lib/mongodb.ts
- `runP2EnhancementTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/p2-enhancement.test.ts → src/lib/mongodb.ts

## Import Cycles
- None detected.

## Communities (62 total, 7 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.13
Nodes (3): ensureDatabaseIndexes(), getDb(), AdminService

### Community 1 - "db.ts"
Cohesion: 0.11
Nodes (43): AdminAreasView(), AdminOrdersView(), AdminServicesView(), AdminStaffView(), SupportView(), authHeaders(), AuthResult, dbAdminCreateService() (+35 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.06
Nodes (46): MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BAGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_COLLECTION_RECORDS, MOCK_CUSTOMER_FLAGS, MOCK_CUSTOMER_NOTES (+38 more)

### Community 3 - "AccountView.tsx"
Cohesion: 0.24
Nodes (9): AccountViewProps, AddAddressModal(), AddAddressModalProps, SchedulePickupModal(), SchedulePickupModalProps, RecurringSchedule, UserAddress, UserPreferences (+1 more)

### Community 4 - "mongodb.ts"
Cohesion: 0.12
Nodes (16): RFC-8785, POST, getClientPromise(), then(), AlertService, AuditService, GENESIS_HASH, RecordAuditParams (+8 more)

### Community 5 - "runP1HardeningTests"
Cohesion: 0.10
Nodes (11): PATCH, isTokenRevoked(), revokeToken(), NotificationService, SUBSCRIPTION_PLANS, SubscriptionService, SubscriptionPlan, SubscriptionPlanId (+3 more)

### Community 6 - "lucide-react"
Cohesion: 0.09
Nodes (23): lucide-react, qrcode.react, @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayout() (+15 more)

### Community 7 - "DriverPortal.tsx"
Cohesion: 0.18
Nodes (14): DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS, PinInput() (+6 more)

### Community 8 - "ManagerService"
Cohesion: 0.09
Nodes (14): GET(), GET(), GET(), POST(), POST(), POST(), POST(), GET() (+6 more)

### Community 9 - "FileStorageService.ts"
Cohesion: 0.27
Nodes (5): ALLOWED_MIME_TYPES, FileStorageService, StoreFileParams, FileRecord, FileType

### Community 10 - "types.ts"
Cohesion: 0.06
Nodes (38): AnalyticsService, CapacityService, STAGE_CONFIGS, CreateNotificationParams, DEFAULT_TEMPLATES, DispatchNotificationEventParams, MANDATORY_EVENT_TYPES, DeliveryAttemptRecord (+30 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.15
Nodes (14): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ManagerLoginPage(), ManagerLoginPageProps (+6 more)

### Community 12 - "api.ts"
Cohesion: 0.06
Nodes (31): PATCH(), GET(), POST(), PATCH, patchHandler(), checkPostcodeHandler(), GET, POST (+23 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.25
Nodes (25): CartDrawer(), CartDrawerProps, CheckoutStep, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots() (+17 more)

### Community 14 - "MachineService.ts"
Cohesion: 0.16
Nodes (10): POST(), GET(), POST(), MachineRunService, MachineService, Machine, MachineRun, MachineRunStatus (+2 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Laundelle — End-to-End Business & Technical Architecture Documentation"
Cohesion: 0.05
Nodes (36): 10. Cross-Role Collaboration & Real-World Interaction Scenarios, 11. Summary & Architecture Compliance, 1.1 What the Business Does, 1.2 Core Business Value Proposition, 1. Executive Summary & Business Purpose, 2.1 Role Matrix & Responsibilities, 2. User Roles & Organizational Responsibilities, 3. End-to-End Real-World Business Workflow (+28 more)

### Community 17 - "react"
Cohesion: 0.06
Nodes (35): react, AIAssistantView(), AIAssistantViewProps, ChatMessage, AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider() (+27 more)

### Community 18 - "requireRole"
Cohesion: 0.06
Nodes (43): GET(), GET(), POST(), GET(), POST(), POST(), POST(), PATCH() (+35 more)

### Community 19 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "successResponse"
Cohesion: 0.08
Nodes (31): GET, GET, POST, GET, POST, GET, POST, POST (+23 more)

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "AppClient.tsx"
Cohesion: 0.09
Nodes (37): AppClient, AppClient, PageProps, App(), AccountView(), AdditionalChargeModal(), AdditionalChargeModalProps, Footer() (+29 more)

### Community 25 - "runP2EnhancementTests"
Cohesion: 0.18
Nodes (11): PATCH, InventoryManagementViewProps, InventoryService, InventoryCategory, InventoryItem, InventoryTransaction, InventoryTransactionType, InventoryTransfer (+3 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "Order"
Cohesion: 0.14
Nodes (15): AdminOrdersViewProps, AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, computeOrderJourney(), formatTimelineDate() (+7 more)

### Community 29 - "ManagerPortalView.tsx"
Cohesion: 0.32
Nodes (6): FleetManagementView(), FleetManagementViewProps, InventoryManagementView(), ManagerPortalView(), ManagerPortalViewProps, dbFetchManagerDashboard()

### Community 30 - "ManagerService.ts"
Cohesion: 0.11
Nodes (17): loginHandler(), POST, POST, signupHandler(), GET, ApiError, getAuthenticatedUser(), UnauthorizedError (+9 more)

### Community 31 - "override-permissions.test.ts"
Cohesion: 0.29
Nodes (11): ADMIN_ONLY_OVERRIDES, ADMIN_ONLY_RESOLVE_TYPES, AdminOnlyOverride, AdminOnlyResolveType, assertCanPerformOverride(), assertCanResolveDispute(), canPerformOverride(), canResolveDispute() (+3 more)

### Community 32 - "layout.tsx"
Cohesion: 0.29
Nodes (5): next, metadata, outfit, plusJakartaSans, viewport

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 34 - "ProcessorService.ts"
Cohesion: 0.14
Nodes (8): PUT(), POST(), POST(), GET(), POST(), GET(), ProcessorService, OrderItem

### Community 35 - "ManagerOverrideModal.tsx"
Cohesion: 0.18
Nodes (22): ManagerDriversView(), ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, ManagerProcessorsView(), ManagerStaffView(), StaffMember (+14 more)

### Community 36 - "VehicleService"
Cohesion: 0.19
Nodes (7): GET, GET, VehicleService, Vehicle, VehicleAssignment, VehicleDocument, VehicleMaintenanceRecord

### Community 37 - "runHardenedWorkflowTests"
Cohesion: 0.15
Nodes (9): GET(), POST(), POST(), CodService, SlaService, CodCollectionRecord, CodReconciliationStatus, OrderSla (+1 more)

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
Cohesion: 0.08
Nodes (21): PUT(), POST(), POST(), POST(), POST(), POST(), POST(), POST() (+13 more)

### Community 49 - "IncidentService.ts"
Cohesion: 0.17
Nodes (10): POST(), GET(), PATCH(), GET(), POST(), IncidentService, IncidentPriority, IncidentRecord (+2 more)

### Community 50 - "OrderService.ts"
Cohesion: 0.31
Nodes (12): mongodb, decryptOrderPin(), ENCRYPTION_KEY, encryptOrderPin(), generatePinSalt(), generateSecureNumericPin(), hashOrderPin(), verifyOrderPinAttempt() (+4 more)

### Community 51 - "hardened-workflow.test.ts"
Cohesion: 0.32
Nodes (12): ALLOWED_TRANSITIONS, assertValidTransition(), generateSecureOtp(), isValidTransition(), matchesPostcode(), normalizeUkPostcode(), parseUkPostcode(), TRANSITION_METADATA (+4 more)

### Community 52 - "OrderService"
Cohesion: 0.19
Nodes (3): PATCH(), POST(), OrderService

### Community 53 - "AdminPortal.tsx"
Cohesion: 0.11
Nodes (24): AdminCustomersView(), AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminReportsView(), CategoryItem, PlantStat (+16 more)

### Community 54 - "ExceptionService.ts"
Cohesion: 0.25
Nodes (7): POST(), GET(), ExceptionService, OperationalException, OperationalExceptionPriority, OperationalExceptionStatus, OperationalExceptionType

### Community 55 - "OperationalSearchService.ts"
Cohesion: 0.24
Nodes (7): GET, GET, GET, OperationalSearchService, Customer360Profile, OperationalSearchResult, UniversalHistoryEvent

### Community 56 - "PrivacyService.ts"
Cohesion: 0.25
Nodes (6): DEFAULT_RETENTION_POLICIES, PrivacyService, DataRetentionPolicy, PrivacyRequest, PrivacyRequestStatus, PrivacyRequestType

### Community 57 - ".createNotification"
Cohesion: 0.33
Nodes (3): dynamic, POST(), PaymentService

### Community 58 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 59 - "SystemHealthDrawer.tsx"
Cohesion: 0.33
Nodes (4): SystemHealthDrawer(), SystemHealthDrawerProps, SystemHealthReport, UnifiedAlert

### Community 61 - "AdminComplaintsView.tsx"
Cohesion: 0.50
Nodes (3): AdminComplaintsView(), MOCK_COMPLAINTS, ComplaintRecord

## Knowledge Gaps
- **235 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+230 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 268 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `mongodb.ts`, `runP1HardeningTests`, `ManagerService`, `FileStorageService.ts`, `types.ts`, `api.ts`, `CartDrawer.tsx`, `MachineService.ts`, `requireRole`, `UserService`, `successResponse`, `runP2EnhancementTests`, `ManagerService.ts`, `override-permissions.test.ts`, `ProcessorService.ts`, `VehicleService`, `runHardenedWorkflowTests`, `NotFoundError`, `IncidentService.ts`, `OrderService.ts`, `hardened-workflow.test.ts`, `OrderService`, `ExceptionService.ts`, `OperationalSearchService.ts`, `PrivacyService.ts`, `.createNotification`, `SystemHealthDrawer.tsx`, `tickets/route.ts`?**
  _High betweenness centrality (0.196) - this node is a cross-community bridge._
- **Why does `mongodb` connect `OrderService.ts` to `ProcessorService.ts`, `mongodb.ts`, `seed_services.ts`, `NotFoundError`, `package.json`, `hardened-workflow.test.ts`, `inspect_db.js`, `mongodb-init.js`?**
  _High betweenness centrality (0.064) - this node is a cross-community bridge._
- **Why does `requireRole()` connect `requireRole` to `ProcessorService.ts`, `runHardenedWorkflowTests`, `ManagerService`, `api.ts`, `MachineService.ts`, `NotFoundError`, `IncidentService.ts`, `OrderService`, `OperationalSearchService.ts`, `successResponse`, `ExceptionService.ts`, `runP2EnhancementTests`, `ManagerService.ts`?**
  _High betweenness centrality (0.060) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _235 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.1339031339031339 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.10823311748381129 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.061170212765957445 - nodes in this community are weakly interconnected._
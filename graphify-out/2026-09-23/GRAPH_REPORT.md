# Graph Report - Laundelle -Laundry Software  (2026-09-23)

## Corpus Check
- 216 files · ~2,048,430 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1147 nodes · 3544 edges · 48 communities (40 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 30 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- getDb
- db.ts
- mockAdminData.ts
- AccountView.tsx
- p1-hardening.test.ts
- runP1HardeningTests
- ProcessorLayout.tsx
- DriverPortal.tsx
- api.ts
- FileStorageService.ts
- types.ts
- mongoSignIn
- PlatformService
- CartDrawer.tsx
- MachineService.ts
- compilerOptions
- Laundelle — End-to-End Business & Technical Architecture Documentation
- react
- requireAuth
- package.json
- successResponse
- dependencies
- NotificationService
- inspect_db.js
- AppClient.tsx
- BeforeAfterSlider.tsx
- devDependencies
- mongodb-init.js
- lucide-react
- ManagerPortalView.tsx
- auth.ts
- ManagerService
- layout.tsx
- create-checkout-session/route.ts
- AdminPortal.tsx
- AdminReportsView.tsx
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
- AdminDashboard.tsx

## God Nodes (most connected - your core abstractions)
1. `getDb()` - 185 edges
2. `requireAuth()` - 166 edges
3. `requireRole()` - 162 edges
4. `successResponse()` - 79 edges
5. `BadRequestError` - 76 edges
6. `authHeaders()` - 72 edges
7. `react` - 62 edges
8. `NotFoundError` - 61 edges
9. `lucide-react` - 57 edges
10. `ForbiddenError` - 45 edges

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

## Communities (48 total, 7 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.11
Nodes (4): getSlotsHandler(), ensureDatabaseIndexes(), getDb(), AdminService

### Community 1 - "db.ts"
Cohesion: 0.10
Nodes (48): AdminAreasView(), AdminCustomersView(), AdminOrdersView(), AdminServicesView(), AdminStaffView(), DriverPortal(), authHeaders(), AuthResult (+40 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.06
Nodes (53): AdminTopbar(), AdminTopbarProps, MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_COLLECTION_RECORDS, MOCK_COMPLAINTS (+45 more)

### Community 3 - "AccountView.tsx"
Cohesion: 0.24
Nodes (9): AccountViewProps, AddAddressModal(), AddAddressModalProps, SchedulePickupModal(), SchedulePickupModalProps, RecurringSchedule, UserAddress, UserPreferences (+1 more)

### Community 4 - "p1-hardening.test.ts"
Cohesion: 0.13
Nodes (12): RFC-8785, AuditService, GENESIS_HASH, RecordAuditParams, BackgroundJobService, DEFAULT_RETENTION_POLICIES, PrivacyService, AuditEventRecord (+4 more)

### Community 5 - "runP1HardeningTests"
Cohesion: 0.20
Nodes (6): PATCH, AuthService, SubscriptionService, NotificationRecord, UserSubscription, runP1HardeningTests()

### Community 6 - "ProcessorLayout.tsx"
Cohesion: 0.07
Nodes (27): @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayout(), ProcessorLayoutProps, ProcessorViewTab (+19 more)

### Community 7 - "DriverPortal.tsx"
Cohesion: 0.20
Nodes (9): DriverJobItem, DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS, PinInput(), PinInputProps (+1 more)

### Community 8 - "api.ts"
Cohesion: 0.09
Nodes (16): GET(), GET, GET(), POST(), POST(), POST(), POST(), GET() (+8 more)

### Community 9 - "FileStorageService.ts"
Cohesion: 0.27
Nodes (5): ALLOWED_MIME_TYPES, FileStorageService, StoreFileParams, FileRecord, FileType

### Community 10 - "types.ts"
Cohesion: 0.08
Nodes (29): CapacityService, STAGE_CONFIGS, CreateNotificationParams, DEFAULT_TEMPLATES, DispatchNotificationEventParams, MANDATORY_EVENT_TYPES, SUBSCRIPTION_PLANS, CodReconciliationStatus (+21 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.15
Nodes (14): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ManagerLoginPage(), ManagerLoginPageProps (+6 more)

### Community 12 - "PlatformService"
Cohesion: 0.06
Nodes (26): PATCH(), GET(), POST(), checkPostcodeHandler(), GET, POST, PATCH, updatePostcodeHandler() (+18 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.25
Nodes (25): CartDrawer(), CartDrawerProps, CheckoutStep, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots() (+17 more)

### Community 14 - "MachineService.ts"
Cohesion: 0.31
Nodes (4): MachineService, Machine, MachineStatus, MachineType

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "Laundelle — End-to-End Business & Technical Architecture Documentation"
Cohesion: 0.05
Nodes (36): 10. Cross-Role Collaboration & Real-World Interaction Scenarios, 11. Summary & Architecture Compliance, 1.1 What the Business Does, 1.2 Core Business Value Proposition, 1. Executive Summary & Business Purpose, 2.1 Role Matrix & Responsibilities, 2. User Roles & Organizational Responsibilities, 3. End-to-End Real-World Business Workflow (+28 more)

### Community 17 - "react"
Cohesion: 0.07
Nodes (33): react, AIAssistantView(), AIAssistantViewProps, ChatMessage, AppDownloadBanner(), ScrollReveal(), ScrollRevealProps, HomeView() (+25 more)

### Community 18 - "requireAuth"
Cohesion: 0.05
Nodes (58): GET(), GET(), POST(), GET(), GET(), POST(), POST(), POST() (+50 more)

### Community 19 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "successResponse"
Cohesion: 0.04
Nodes (54): loginHandler(), POST, POST, signupHandler(), POST, GET, POST, POST (+46 more)

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "AppClient.tsx"
Cohesion: 0.10
Nodes (34): AppClient, AppClient, PageProps, App(), AccountView(), Footer(), FooterProps, SplashScreen() (+26 more)

### Community 25 - "BeforeAfterSlider.tsx"
Cohesion: 0.25
Nodes (5): BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "lucide-react"
Cohesion: 0.10
Nodes (23): lucide-react, qrcode.react, AdditionalChargeModal(), AdditionalChargeModalProps, AdminOrdersViewProps, AdminPortalProps, AdminSettingsView(), InvoiceReceiptModal() (+15 more)

### Community 29 - "ManagerPortalView.tsx"
Cohesion: 0.67
Nodes (3): ManagerPortalView(), ManagerPortalViewProps, dbFetchManagerDashboard()

### Community 30 - "auth.ts"
Cohesion: 0.22
Nodes (10): base64UrlDecode(), base64UrlEncode(), hashPassword(), isTokenRevoked(), JwtPayload, REVOKED_TOKENS_CACHE, revokeToken(), signAdminJwt() (+2 more)

### Community 31 - "ManagerService"
Cohesion: 0.12
Nodes (13): ADMIN_ONLY_OVERRIDES, ADMIN_ONLY_RESOLVE_TYPES, AdminOnlyOverride, AdminOnlyResolveType, assertCanPerformOverride(), assertCanResolveDispute(), canPerformOverride(), canResolveDispute() (+5 more)

### Community 32 - "layout.tsx"
Cohesion: 0.29
Nodes (5): next, metadata, outfit, plusJakartaSans, viewport

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 35 - "AdminPortal.tsx"
Cohesion: 0.13
Nodes (30): AdminComplaintsView(), AdminFinanceView(), AdminPortal(), ManagerDriversView(), ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS (+22 more)

### Community 37 - "AdminReportsView.tsx"
Cohesion: 0.33
Nodes (6): AdminReportsView(), CategoryItem, PlantStat, TrendPoint, TurnaroundBracket, dbAdminFetchReports()

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
Cohesion: 0.05
Nodes (56): mongodb, dynamic, POST(), ApiError, BadRequestError, ForbiddenError, NotFoundError, getClientPromise() (+48 more)

### Community 53 - "AdminDashboard.tsx"
Cohesion: 0.36
Nodes (6): AdminDashboard(), AdminDashboardProps, AdminSidebar(), AdminSidebarProps, AdminViewTab, dbFetchAdminDashboardMetrics()

## Knowledge Gaps
- **231 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+226 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 263 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `mockAdminData.ts`, `p1-hardening.test.ts`, `runP1HardeningTests`, `api.ts`, `FileStorageService.ts`, `types.ts`, `PlatformService`, `CartDrawer.tsx`, `MachineService.ts`, `BadRequestError`, `requireAuth`, `successResponse`, `NotificationService`, `auth.ts`, `ManagerService`?**
  _High betweenness centrality (0.164) - this node is a cross-community bridge._
- **Why does `mongodb` connect `BadRequestError` to `package.json`, `seed_services.ts`, `mongodb-init.js`, `inspect_db.js`?**
  _High betweenness centrality (0.076) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `mockAdminData.ts`, `AccountView.tsx`, `AdminPortal.tsx`, `AdminReportsView.tsx`, `ProcessorLayout.tsx`, `DriverPortal.tsx`, `mongoSignIn`, `CartDrawer.tsx`, `package.json`, `AdminDashboard.tsx`, `AppClient.tsx`, `BeforeAfterSlider.tsx`, `lucide-react`, `ManagerPortalView.tsx`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _231 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.11494252873563218 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.09506531204644413 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.055051421657592255 - nodes in this community are weakly interconnected._
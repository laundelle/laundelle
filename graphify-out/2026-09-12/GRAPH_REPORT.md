# Graph Report - Laundelle -Laundry Software  (2026-09-12)

## Corpus Check
- 153 files · ~1,705,296 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 739 nodes · 2057 edges · 48 communities (39 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- mockAdminData.ts
- NotFoundError
- OrderService
- requireRole
- react
- db.ts
- lucide-react
- auth.ts
- successResponse
- PlatformService
- UserService
- getDb
- DriverService.ts
- withErrorHandler
- getLocal
- compilerOptions
- slots/route.ts
- types.ts
- AppClient.tsx
- mongoSignIn
- package.json
- ServiceItem
- AdminDashboard.tsx
- BadRequestError
- waitlist/route.ts
- AdminOrdersView.tsx
- dependencies
- ApiError
- HomeView.tsx
- AdminOperationsView.tsx
- AdminComplaintsView.tsx
- ProcessorOrdersView.tsx
- devDependencies
- mongodb-init.js
- layout.tsx
- create-checkout-session/route.ts
- seed_services.ts
- AdminFinanceView.tsx
- PostcodeCheckerModal.tsx
- scripts
- assistant/route.ts
- Run and deploy your AI Studio app
- rules/graphify.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- postcss.config.mjs

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 106 edges
2. `requireAuth()` - 102 edges
3. `getDb()` - 95 edges
4. `react` - 55 edges
5. `successResponse()` - 55 edges
6. `lucide-react` - 51 edges
7. `authHeaders()` - 46 edges
8. `BadRequestError` - 34 edges
9. `NotFoundError` - 29 edges
10. `AdminService` - 28 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `normalizeUkPostcode()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/workflow.ts
- `runTests()` --calls--> `parseUkPostcode()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/workflow.ts
- `runTests()` --calls--> `matchesPostcode()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/workflow.ts
- `runTests()` --calls--> `assertValidTransition()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/workflow.ts

## Import Cycles
- None detected.

## Communities (48 total, 8 thin omitted)

### Community 0 - "mockAdminData.ts"
Cohesion: 0.08
Nodes (40): AdminCustomersView(), AdminServicesView(), MOCK_ADMIN_SERVICES, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_CUSTOMER_FLAGS, MOCK_CUSTOMER_NOTES, MOCK_CUSTOMERS_CRM (+32 more)

### Community 1 - "NotFoundError"
Cohesion: 0.13
Nodes (9): POST(), POST(), ForbiddenError, NotFoundError, validateOtpAttempt(), DriverService, getTwilioClient(), finish() (+1 more)

### Community 2 - "OrderService"
Cohesion: 0.13
Nodes (10): POST, resolveChargeHandler(), cancelOrderHandler(), POST, GET, getOrderByIdHandler(), generateOrderNumber(), getPlantForPostcode() (+2 more)

### Community 3 - "requireRole"
Cohesion: 0.06
Nodes (45): GET(), GET(), PATCH(), GET(), POST(), POST(), POST(), PATCH() (+37 more)

### Community 4 - "react"
Cohesion: 0.14
Nodes (17): react, AdminAlertsView(), AdminInventoryView(), AdminReportsView(), AdminSettingsView(), AdminTopbar(), AdminTopbarProps, ManagerPortalView() (+9 more)

### Community 5 - "db.ts"
Cohesion: 0.10
Nodes (44): AdminAreasView(), AdminPortal(), AdminStaffView(), DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, REFERENCE_COMPLETED_JOBS (+36 more)

### Community 6 - "lucide-react"
Cohesion: 0.11
Nodes (20): lucide-react, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayout(), ProcessorLayoutProps, ProcessorViewTab, ProcessorProfileView() (+12 more)

### Community 7 - "auth.ts"
Cohesion: 0.18
Nodes (12): loginHandler(), POST, POST, signupHandler(), UnauthorizedError, base64UrlDecode(), base64UrlEncode(), hashPassword() (+4 more)

### Community 8 - "successResponse"
Cohesion: 0.14
Nodes (14): GET, getHandler(), GET, getHandler(), POST, rescheduleOrderHandler(), createOrderHandler(), GET (+6 more)

### Community 9 - "PlatformService"
Cohesion: 0.12
Nodes (12): checkPostcodeHandler(), POST, PATCH, PATCH, updateServiceHandler(), createServiceHandler(), GET, getServicesHandler() (+4 more)

### Community 10 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 11 - "getDb"
Cohesion: 0.16
Nodes (3): getDb(), AdminService, NotificationService

### Community 12 - "DriverService.ts"
Cohesion: 0.42
Nodes (8): mongodb, ALLOWED_TRANSITIONS, assertValidTransition(), generateSecureOtp(), matchesPostcode(), normalizeUkPostcode(), parseUkPostcode(), CreateNotificationParams

### Community 13 - "withErrorHandler"
Cohesion: 0.28
Nodes (6): PATCH, patchHandler(), PATCH, patchHandler(), errorResponse(), withErrorHandler()

### Community 14 - "getLocal"
Cohesion: 0.19
Nodes (22): App(), AccountView(), CartDrawer(), clearSession(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder(), dbDeleteAddress() (+14 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "slots/route.ts"
Cohesion: 0.25
Nodes (4): createSlotHandler(), GET, getSlotsHandler(), POST

### Community 17 - "types.ts"
Cohesion: 0.11
Nodes (25): AccountViewProps, AddAddressModal(), AddAddressModalProps, AdminPortalProps, CartDrawerProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrdersView() (+17 more)

### Community 18 - "AppClient.tsx"
Cohesion: 0.09
Nodes (25): AppClient, AppClient, PageProps, AdditionalChargeModal(), AdditionalChargeModalProps, Footer(), FooterProps, MobileNav() (+17 more)

### Community 19 - "mongoSignIn"
Cohesion: 0.18
Nodes (12): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ProcessorLoginPage(), ProcessorLoginPageProps (+4 more)

### Community 20 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 21 - "ServiceItem"
Cohesion: 0.19
Nodes (9): AIAssistantView(), AIAssistantViewProps, ChatMessage, SchedulePickupModal(), SchedulePickupModalProps, DEFAULT_VARIANTS, ServiceCustomizeModal(), ServiceCustomizeModalProps (+1 more)

### Community 22 - "AdminDashboard.tsx"
Cohesion: 0.36
Nodes (6): AdminDashboard(), AdminDashboardProps, AdminSidebar(), AdminSidebarProps, AdminViewTab, dbFetchAdminDashboardMetrics()

### Community 23 - "BadRequestError"
Cohesion: 0.19
Nodes (5): dynamic, POST(), updatePostcodeHandler(), BadRequestError, PaymentService

### Community 24 - "waitlist/route.ts"
Cohesion: 0.29
Nodes (4): GET, getWaitlistHandler(), joinWaitlistHandler(), POST

### Community 25 - "AdminOrdersView.tsx"
Cohesion: 0.33
Nodes (5): qrcode.react, AdminOrdersView(), AdminOrdersViewProps, GenerateQRModal(), GenerateQRModalProps

### Community 26 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 28 - "HomeView.tsx"
Cohesion: 0.20
Nodes (8): AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES, HomeView(), HomeViewProps

### Community 29 - "AdminOperationsView.tsx"
Cohesion: 0.20
Nodes (9): @yudiel/react-qr-scanner, AdminOperationsView(), QRScannerModal(), QRScannerModalProps, MOCK_COLLECTION_RECORDS, MOCK_INTAKE_RECORDS, MOCK_MACHINES, MOCK_QC_RECORDS (+1 more)

### Community 31 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 32 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 34 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 35 - "layout.tsx"
Cohesion: 0.33
Nodes (4): next, metadata, outfit, plusJakartaSans

### Community 36 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 37 - "seed_services.ts"
Cohesion: 0.40
Nodes (3): envFile, match, mockServices

### Community 38 - "AdminFinanceView.tsx"
Cohesion: 0.40
Nodes (4): AdminFinanceView(), MOCK_FINANCIAL_ADJUSTMENTS, MOCK_REFUNDS, MOCK_STORE_CREDITS

### Community 39 - "PostcodeCheckerModal.tsx"
Cohesion: 0.60
Nodes (4): PostcodeCheckerModal(), PostcodeCheckerModalProps, checkPostcodeSectorActive(), joinWaitingList()

### Community 40 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 41 - "assistant/route.ts"
Cohesion: 0.67
Nodes (3): @google/genai, getGeminiClient(), POST()

## Knowledge Gaps
- **151 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+146 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 174 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `NotFoundError`, `OrderService`, `requireRole`, `auth.ts`, `PlatformService`, `UserService`, `DriverService.ts`, `withErrorHandler`, `slots/route.ts`, `BadRequestError`, `waitlist/route.ts`, `ApiError`?**
  _High betweenness centrality (0.119) - this node is a cross-community bridge._
- **Why does `mongodb` connect `DriverService.ts` to `mongodb-init.js`, `package.json`, `seed_services.ts`, `BadRequestError`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `mockAdminData.ts`, `db.ts`, `AdminFinanceView.tsx`, `PostcodeCheckerModal.tsx`, `lucide-react`, `types.ts`, `AppClient.tsx`, `mongoSignIn`, `package.json`, `ServiceItem`, `AdminDashboard.tsx`, `AdminOrdersView.tsx`, `HomeView.tsx`, `AdminOperationsView.tsx`, `AdminComplaintsView.tsx`, `ProcessorOrdersView.tsx`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _151 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08456659619450317 - nodes in this community are weakly interconnected._
- **Should `NotFoundError` be split into smaller, more focused modules?**
  _Cohesion score 0.13054187192118227 - nodes in this community are weakly interconnected._
- **Should `OrderService` be split into smaller, more focused modules?**
  _Cohesion score 0.13157894736842105 - nodes in this community are weakly interconnected._
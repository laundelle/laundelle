# Graph Report - Laundelle -Laundry Software  (2026-09-21)

## Corpus Check
- 176 files · ~1,798,287 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 878 nodes · 2582 edges · 46 communities (38 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- getDb
- db.ts
- mockAdminData.ts
- ServiceItem
- successResponse
- OrderService.ts
- ProcessorLayout.tsx
- DriverPortal.tsx
- AdminAreasView.tsx
- ProcessorOrdersView.tsx
- types.ts
- AppClient.tsx
- withErrorHandler
- CartDrawer.tsx
- ActiveTab
- compilerOptions
- lucide-react
- react
- requireRole
- package.json
- ProcessorService
- dependencies
- PostcodeCheckerModal.tsx
- inspect_db.js
- App
- ManagerProcessorsView.tsx
- devDependencies
- mongodb-init.js
- OrdersView.tsx
- ManagerOverrideModal.tsx
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
- read/route.ts
- tickets/route.ts

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 129 edges
2. `requireAuth()` - 127 edges
3. `getDb()` - 108 edges
4. `authHeaders()` - 69 edges
5. `react` - 59 edges
6. `lucide-react` - 56 edges
7. `successResponse()` - 55 edges
8. `BadRequestError` - 37 edges
9. `AdminService` - 34 edges
10. `ForbiddenError` - 31 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/override-permissions.test.ts → src/lib/mongodb.ts
- `OrdersViewProps` --references--> `Order`  [EXTRACTED]
  src/components/OrdersView.tsx → src/types.ts
- `runTests()` --calls--> `generateSecureNumericPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `generatePinSalt()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts

## Import Cycles
- None detected.

## Communities (46 total, 7 thin omitted)

### Community 0 - "getDb"
Cohesion: 0.08
Nodes (12): loginHandler(), POST, POST, signupHandler(), UnauthorizedError, base64UrlEncode(), hashPassword(), signJwt() (+4 more)

### Community 1 - "db.ts"
Cohesion: 0.11
Nodes (33): AdminOrdersView(), AdminPortal(), AdminServicesView(), authHeaders(), AuthResult, dbAdminCreateService(), dbAdminFetchCustomers(), dbAdminFetchOrders() (+25 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.05
Nodes (53): AdminComplaintsView(), AdminCustomersView(), AdminSettingsView(), MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BAGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS (+45 more)

### Community 3 - "ServiceItem"
Cohesion: 0.16
Nodes (11): AIAssistantView(), AIAssistantViewProps, ChatMessage, HomeViewProps, DEFAULT_VARIANTS, ServiceCustomizeModal(), ServiceCustomizeModalProps, SERVICE_NAME_TO_IMAGE (+3 more)

### Community 4 - "successResponse"
Cohesion: 0.08
Nodes (26): PATCH, patchHandler(), GET, getHandler(), POST, resolveChargeHandler(), createOrderHandler(), GET (+18 more)

### Community 5 - "OrderService.ts"
Cohesion: 0.06
Nodes (42): mongodb, dynamic, POST(), POST(), POST(), POST(), POST(), POST() (+34 more)

### Community 6 - "ProcessorLayout.tsx"
Cohesion: 0.10
Nodes (19): @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayout(), ProcessorLayoutProps, ProcessorViewTab (+11 more)

### Community 7 - "DriverPortal.tsx"
Cohesion: 0.19
Nodes (13): DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS, PinInput() (+5 more)

### Community 8 - "AdminAreasView.tsx"
Cohesion: 0.33
Nodes (10): AdminAreasView(), AdminStaffView(), dbCreatePlant(), dbCreateStaffMember(), dbFetchPlants(), dbFetchPostcodeSectors(), dbFetchSlots(), dbFetchStaff() (+2 more)

### Community 9 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 10 - "types.ts"
Cohesion: 0.17
Nodes (15): AccountViewProps, AddAddressModal(), AddAddressModalProps, AdditionalChargeModal(), AdditionalChargeModalProps, SchedulePickupModal(), SchedulePickupModalProps, AdditionalCharge (+7 more)

### Community 11 - "AppClient.tsx"
Cohesion: 0.10
Nodes (20): AppClient, AppClient, PageProps, AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage() (+12 more)

### Community 12 - "withErrorHandler"
Cohesion: 0.07
Nodes (25): PATCH(), GET(), POST(), checkPostcodeHandler(), POST, PATCH, updatePostcodeHandler(), PATCH (+17 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.25
Nodes (25): CartDrawer(), CartDrawerProps, CheckoutStep, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots() (+17 more)

### Community 14 - "ActiveTab"
Cohesion: 0.20
Nodes (10): Footer(), FooterProps, MobileNav(), MobileNavProps, Navbar(), NavbarProps, NotificationsView(), NotificationsViewProps (+2 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "lucide-react"
Cohesion: 0.14
Nodes (16): lucide-react, qrcode.react, AdminOrdersViewProps, AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps (+8 more)

### Community 17 - "react"
Cohesion: 0.25
Nodes (7): react, AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES

### Community 18 - "requireRole"
Cohesion: 0.06
Nodes (52): GET(), GET(), POST(), GET(), GET(), POST(), POST(), POST() (+44 more)

### Community 19 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "ProcessorService"
Cohesion: 0.17
Nodes (6): PUT(), POST(), GET(), POST(), GET(), ProcessorService

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "PostcodeCheckerModal.tsx"
Cohesion: 0.38
Nodes (6): HomeView(), PostcodeCheckerModal(), PostcodeCheckerModalProps, checkPostcodeCoverage(), checkPostcodeSectorActive(), joinWaitingList()

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "App"
Cohesion: 0.20
Nodes (21): App(), AccountView(), clearSession(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder(), dbDeleteAddress(), dbFetchNotifications() (+13 more)

### Community 25 - "ManagerProcessorsView.tsx"
Cohesion: 0.35
Nodes (9): ManagerProcessorsView(), ManagerStaffView(), StaffMember, dbFetchManagerOrders(), dbFetchManagerStaff(), dbManagerAssignProcessor(), dbManagerBatchReassignOrders(), dbManagerCreateStaff() (+1 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "OrdersView.tsx"
Cohesion: 0.38
Nodes (6): computeOrderJourney(), formatTimelineDate(), JourneyStage, OrdersView(), OrdersViewProps, OrderStatus

### Community 31 - "ManagerOverrideModal.tsx"
Cohesion: 0.11
Nodes (29): ManagerDriversView(), ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, ADMIN_ONLY_OVERRIDES, ADMIN_ONLY_RESOLVE_TYPES, AdminOnlyOverride (+21 more)

### Community 32 - "layout.tsx"
Cohesion: 0.33
Nodes (4): next, metadata, outfit, plusJakartaSans

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 35 - "AdminPortal.tsx"
Cohesion: 0.16
Nodes (15): AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminSidebar(), AdminSidebarProps, AdminTopbar(), AdminTopbarProps, ManagerPortalView() (+7 more)

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

### Community 51 - "read/route.ts"
Cohesion: 0.50
Nodes (3): PATCH, patchHandler(), errorResponse()

## Knowledge Gaps
- **186 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+181 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 212 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `successResponse`, `OrderService.ts`, `withErrorHandler`, `requireRole`, `read/route.ts`, `ProcessorService`, `tickets/route.ts`, `ManagerOverrideModal.tsx`?**
  _High betweenness centrality (0.139) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `mockAdminData.ts`, `ServiceItem`, `ProcessorLayout.tsx`, `DriverPortal.tsx`, `AdminAreasView.tsx`, `ProcessorOrdersView.tsx`, `types.ts`, `AppClient.tsx`, `CartDrawer.tsx`, `ActiveTab`, `lucide-react`, `package.json`, `PostcodeCheckerModal.tsx`, `ManagerProcessorsView.tsx`, `OrdersView.tsx`, `ManagerOverrideModal.tsx`, `AdminPortal.tsx`, `AdminReportsView.tsx`?**
  _High betweenness centrality (0.100) - this node is a cross-community bridge._
- **Why does `lucide-react` connect `lucide-react` to `db.ts`, `mockAdminData.ts`, `ServiceItem`, `ProcessorLayout.tsx`, `DriverPortal.tsx`, `AdminAreasView.tsx`, `ProcessorOrdersView.tsx`, `types.ts`, `AppClient.tsx`, `CartDrawer.tsx`, `ActiveTab`, `react`, `package.json`, `PostcodeCheckerModal.tsx`, `ManagerProcessorsView.tsx`, `OrdersView.tsx`, `ManagerOverrideModal.tsx`, `AdminPortal.tsx`, `AdminReportsView.tsx`?**
  _High betweenness centrality (0.090) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _186 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `getDb` be split into smaller, more focused modules?**
  _Cohesion score 0.07609427609427609 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11428571428571428 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0544464609800363 - nodes in this community are weakly interconnected._
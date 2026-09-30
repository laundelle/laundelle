# Graph Report - Laundelle -Laundry Software  (2026-09-13)

## Corpus Check
- 172 files · ~1,738,877 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 849 nodes · 2495 edges · 52 communities (43 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- requireAuth
- db.ts
- mockAdminData.ts
- ServiceItem
- successResponse
- OrderService.ts
- react
- getDb
- Order
- UserService
- AppClient.tsx
- mongoSignIn
- PlatformService
- CartDrawer.tsx
- auth.ts
- compilerOptions
- ManagerOverrideModal.tsx
- PostcodeCheckerModal.tsx
- api.ts
- package.json
- withErrorHandler
- dependencies
- HomeView.tsx
- AdditionalChargeModal.tsx
- types.ts
- ManagerDriversView.tsx
- devDependencies
- mongodb-init.js
- waitlist/route.ts
- DriverPortal.tsx
- ActiveTab
- AdminService.ts
- layout.tsx
- create-checkout-session/route.ts
- ProcessorService
- AdminPortal.tsx
- ProcessorOrdersView.tsx
- platform/services/[id]/route.ts
- scripts
- assistant/route.ts
- Run and deploy your AI Studio app
- seed_services.ts
- rules/graphify.md
- workflows/graphify.md
- next.config.ts
- next-env.d.ts
- postcss.config.mjs
- tickets/route.ts
- requireRole
- plants/route.ts
- OrdersView.tsx

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 131 edges
2. `requireAuth()` - 127 edges
3. `getDb()` - 109 edges
4. `authHeaders()` - 69 edges
5. `react` - 58 edges
6. `lucide-react` - 56 edges
7. `successResponse()` - 55 edges
8. `BadRequestError` - 34 edges
9. `AdminService` - 34 edges
10. `NotFoundError` - 29 edges

## Surprising Connections (you probably didn't know these)
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `OrdersViewProps` --references--> `Order`  [EXTRACTED]
  src/components/OrdersView.tsx → src/types.ts
- `runTests()` --calls--> `generateSecureNumericPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `generatePinSalt()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `hashOrderPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts

## Import Cycles
- None detected.

## Communities (52 total, 8 thin omitted)

### Community 0 - "requireAuth"
Cohesion: 0.11
Nodes (17): GET(), POST(), PATCH(), GET(), POST(), GET(), POST(), POST() (+9 more)

### Community 1 - "db.ts"
Cohesion: 0.12
Nodes (36): AdminAreasView(), AdminOrdersView(), AdminServicesView(), AdminStaffView(), authHeaders(), AuthResult, dbAdminCreateService(), dbAdminFetchServices() (+28 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.05
Nodes (53): AdminComplaintsView(), MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BAGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_COLLECTION_RECORDS, MOCK_COMPLAINTS (+45 more)

### Community 3 - "ServiceItem"
Cohesion: 0.15
Nodes (12): AIAssistantView(), AIAssistantViewProps, ChatMessage, SchedulePickupModal(), SchedulePickupModalProps, DEFAULT_VARIANTS, ServiceCustomizeModal(), ServiceCustomizeModalProps (+4 more)

### Community 4 - "successResponse"
Cohesion: 0.17
Nodes (11): POST, resolveChargeHandler(), GET, getOrderByIdHandler(), createOrderHandler(), GET, getOrdersHandler(), POST (+3 more)

### Community 5 - "OrderService.ts"
Cohesion: 0.06
Nodes (38): mongodb, dynamic, POST(), PATCH, patchHandler(), GET, getHandler(), GET (+30 more)

### Community 6 - "react"
Cohesion: 0.08
Nodes (27): lucide-react, qrcode.react, react, @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView() (+19 more)

### Community 7 - "getDb"
Cohesion: 0.11
Nodes (4): getDb(), AdminService, IncidentService, ManagerService

### Community 8 - "Order"
Cohesion: 0.19
Nodes (11): AdminOrdersViewProps, AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, RescheduleCancelModalProps, SupportView() (+3 more)

### Community 9 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 10 - "AppClient.tsx"
Cohesion: 0.14
Nodes (26): AppClient, AppClient, PageProps, App(), AccountView(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder() (+18 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.18
Nodes (12): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ProcessorLoginPage(), ProcessorLoginPageProps (+4 more)

### Community 12 - "PlatformService"
Cohesion: 0.14
Nodes (9): createServiceHandler(), GET, getServicesHandler(), POST, createSlotHandler(), GET, getSlotsHandler(), POST (+1 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.26
Nodes (24): CartDrawer(), CartDrawerProps, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots(), getAvailablePickupSlots() (+16 more)

### Community 14 - "auth.ts"
Cohesion: 0.18
Nodes (12): loginHandler(), POST, POST, signupHandler(), UnauthorizedError, base64UrlDecode(), base64UrlEncode(), hashPassword() (+4 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "ManagerOverrideModal.tsx"
Cohesion: 0.40
Nodes (9): ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, dbAddIncidentNote(), dbCreateManagerIncident(), dbFetchManagerIncidents(), dbFetchOrderAuditLogs() (+1 more)

### Community 17 - "PostcodeCheckerModal.tsx"
Cohesion: 0.60
Nodes (4): PostcodeCheckerModal(), PostcodeCheckerModalProps, checkPostcodeSectorActive(), joinWaitingList()

### Community 18 - "api.ts"
Cohesion: 0.12
Nodes (12): GET(), GET(), POST(), POST(), POST(), POST(), GET(), POST() (+4 more)

### Community 19 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "withErrorHandler"
Cohesion: 0.24
Nodes (6): PATCH, patchHandler(), checkPostcodeHandler(), POST, errorResponse(), withErrorHandler()

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "HomeView.tsx"
Cohesion: 0.20
Nodes (8): AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES, HomeView(), HomeViewProps

### Community 23 - "AdditionalChargeModal.tsx"
Cohesion: 0.67
Nodes (3): AdditionalChargeModal(), AdditionalChargeModalProps, AdditionalCharge

### Community 24 - "types.ts"
Cohesion: 0.24
Nodes (11): AccountViewProps, AddAddressModal(), AddAddressModalProps, OrderTimeline, RecurringSchedule, ServiceCustomisation, SupportTicket, UserAddress (+3 more)

### Community 25 - "ManagerDriversView.tsx"
Cohesion: 0.29
Nodes (13): ManagerDriversView(), ManagerProcessorsView(), ManagerStaffView(), StaffMember, dbFetchManagerOrders(), dbFetchManagerStaff(), dbManagerAssignDriver(), dbManagerAssignProcessor() (+5 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "waitlist/route.ts"
Cohesion: 0.29
Nodes (4): GET, getWaitlistHandler(), joinWaitlistHandler(), POST

### Community 29 - "DriverPortal.tsx"
Cohesion: 0.21
Nodes (13): DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS, clearSession() (+5 more)

### Community 30 - "ActiveTab"
Cohesion: 0.18
Nodes (11): Footer(), FooterProps, MobileNav(), MobileNavProps, Navbar(), NavbarProps, NotificationsView(), NotificationsViewProps (+3 more)

### Community 31 - "AdminService.ts"
Cohesion: 0.10
Nodes (10): GET(), GET(), GET(), POST(), POST(), POST(), PATCH(), GET() (+2 more)

### Community 32 - "layout.tsx"
Cohesion: 0.33
Nodes (4): next, metadata, outfit, plusJakartaSans

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 34 - "ProcessorService"
Cohesion: 0.14
Nodes (7): PUT(), POST(), POST(), GET(), POST(), GET(), ProcessorService

### Community 35 - "AdminPortal.tsx"
Cohesion: 0.10
Nodes (25): AdminCustomersView(), AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminReportsView(), AdminSettingsView(), AdminSidebar() (+17 more)

### Community 36 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 37 - "platform/services/[id]/route.ts"
Cohesion: 0.33
Nodes (3): PATCH(), PATCH, updateServiceHandler()

### Community 38 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 39 - "assistant/route.ts"
Cohesion: 0.67
Nodes (3): @google/genai, getGeminiClient(), POST()

### Community 41 - "seed_services.ts"
Cohesion: 0.40
Nodes (3): envFile, match, mockServices

### Community 49 - "requireRole"
Cohesion: 0.09
Nodes (19): PUT(), POST(), POST(), POST(), POST(), GET(), PATCH(), GET() (+11 more)

### Community 51 - "OrdersView.tsx"
Cohesion: 0.38
Nodes (6): computeOrderJourney(), formatTimelineDate(), JourneyStage, OrdersView(), OrdersViewProps, OrderStatus

## Knowledge Gaps
- **173 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+168 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 197 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `requireAuth`, `mockAdminData.ts`, `ProcessorService`, `successResponse`, `OrderService.ts`, `platform/services/[id]/route.ts`, `UserService`, `PlatformService`, `CartDrawer.tsx`, `auth.ts`, `tickets/route.ts`, `requireRole`, `api.ts`, `withErrorHandler`, `waitlist/route.ts`, `AdminService.ts`?**
  _High betweenness centrality (0.153) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `mockAdminData.ts`, `ServiceItem`, `Order`, `AppClient.tsx`, `mongoSignIn`, `CartDrawer.tsx`, `ManagerOverrideModal.tsx`, `PostcodeCheckerModal.tsx`, `package.json`, `HomeView.tsx`, `AdditionalChargeModal.tsx`, `types.ts`, `ManagerDriversView.tsx`, `DriverPortal.tsx`, `ActiveTab`, `AdminPortal.tsx`, `ProcessorOrdersView.tsx`, `OrdersView.tsx`?**
  _High betweenness centrality (0.088) - this node is a cross-community bridge._
- **Why does `mongodb` connect `OrderService.ts` to `package.json`, `seed_services.ts`, `mongodb-init.js`?**
  _High betweenness centrality (0.085) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _173 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `requireAuth` be split into smaller, more focused modules?**
  _Cohesion score 0.10837438423645321 - nodes in this community are weakly interconnected._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.11923076923076924 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05388471177944862 - nodes in this community are weakly interconnected._
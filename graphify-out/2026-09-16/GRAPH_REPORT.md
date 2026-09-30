# Graph Report - Laundelle -Laundry Software  (2026-09-16)

## Corpus Check
- 174 files · ~1,747,188 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 862 nodes · 2524 edges · 52 communities (44 shown, 7 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- withErrorHandler
- db.ts
- mockAdminData.ts
- ServiceItem
- successResponse
- getDb
- react
- auth.ts
- lucide-react
- UserService
- types.ts
- mongoSignIn
- PlatformService
- CartDrawer.tsx
- ActiveTab
- compilerOptions
- AdminAreasView.tsx
- HomeView.tsx
- requireRole
- package.json
- ProcessorOrdersView.tsx
- dependencies
- waitlist/route.ts
- inspect_db.js
- App
- ManagerDriversView.tsx
- devDependencies
- mongodb-init.js
- AppClient.tsx
- DriverPortal.tsx
- admin.ts
- IncidentService.ts
- layout.tsx
- create-checkout-session/route.ts
- ManagerOverrideModal.tsx
- AdminPortal.tsx
- OrdersView.tsx
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
- AdminTopbar.tsx
- PostcodeCheckerModal.tsx
- check/route.ts
- AdminComplaintsView.tsx

## God Nodes (most connected - your core abstractions)
1. `requireRole()` - 131 edges
2. `requireAuth()` - 127 edges
3. `getDb()` - 110 edges
4. `authHeaders()` - 69 edges
5. `react` - 59 edges
6. `lucide-react` - 56 edges
7. `successResponse()` - 55 edges
8. `BadRequestError` - 37 edges
9. `AdminService` - 34 edges
10. `NotFoundError` - 30 edges

## Surprising Connections (you probably didn't know these)
- `OrdersViewProps` --references--> `Order`  [EXTRACTED]
  src/components/OrdersView.tsx → src/types.ts
- `AdminPortalProps` --references--> `Order`  [EXTRACTED]
  src/components/admin/AdminPortal.tsx → src/types.ts
- `runTests()` --calls--> `getDb()`  [EXTRACTED]
  tests/order-workflow.test.ts → src/lib/mongodb.ts
- `runTests()` --calls--> `generateSecureNumericPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `generatePinSalt()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts

## Import Cycles
- None detected.

## Communities (52 total, 7 thin omitted)

### Community 0 - "withErrorHandler"
Cohesion: 0.16
Nodes (11): PATCH, patchHandler(), PATCH, patchHandler(), GET, getHandler(), GET, getHandler() (+3 more)

### Community 1 - "db.ts"
Cohesion: 0.13
Nodes (29): AdminOrdersView(), AdminServicesView(), SupportView(), authHeaders(), AuthResult, dbAdminCreateService(), dbAdminFetchServices(), dbAdminUpdateCustomerStatus() (+21 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.08
Nodes (24): MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BAGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_COLLECTION_RECORDS, MOCK_CUSTOMER_FLAGS, MOCK_CUSTOMER_NOTES (+16 more)

### Community 3 - "ServiceItem"
Cohesion: 0.18
Nodes (10): AIAssistantView(), AIAssistantViewProps, ChatMessage, DEFAULT_VARIANTS, ServiceCustomizeModal(), ServiceCustomizeModalProps, SERVICE_NAME_TO_IMAGE, ServicesView() (+2 more)

### Community 4 - "successResponse"
Cohesion: 0.13
Nodes (15): POST, resolveChargeHandler(), cancelOrderHandler(), POST, POST, rescheduleOrderHandler(), GET, getOrderByIdHandler() (+7 more)

### Community 5 - "getDb"
Cohesion: 0.05
Nodes (39): mongodb, dynamic, POST(), PATCH, updatePostcodeHandler(), POST, ApiError, BadRequestError (+31 more)

### Community 6 - "react"
Cohesion: 0.11
Nodes (19): react, @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayoutProps, ProcessorViewTab (+11 more)

### Community 7 - "auth.ts"
Cohesion: 0.17
Nodes (11): loginHandler(), POST, POST, signupHandler(), UnauthorizedError, base64UrlDecode(), base64UrlEncode(), JwtPayload (+3 more)

### Community 8 - "lucide-react"
Cohesion: 0.17
Nodes (13): lucide-react, qrcode.react, AdminOrdersViewProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, RescheduleCancelModalProps (+5 more)

### Community 9 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 10 - "types.ts"
Cohesion: 0.15
Nodes (17): AccountViewProps, AddAddressModal(), AddAddressModalProps, AdditionalChargeModal(), AdditionalChargeModalProps, CartDrawerProps, SchedulePickupModal(), SchedulePickupModalProps (+9 more)

### Community 11 - "mongoSignIn"
Cohesion: 0.18
Nodes (12): AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage(), DriverLoginPageProps, ProcessorLoginPage(), ProcessorLoginPageProps (+4 more)

### Community 12 - "PlatformService"
Cohesion: 0.10
Nodes (13): PATCH, updateServiceHandler(), createServiceHandler(), GET, getServicesHandler(), POST, PATCH, updateSlotHandler() (+5 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.30
Nodes (22): CartDrawer(), RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots(), getAvailablePickupSlots(), getTodayYyyyMmDd() (+14 more)

### Community 14 - "ActiveTab"
Cohesion: 0.20
Nodes (10): Footer(), FooterProps, MobileNav(), MobileNavProps, Navbar(), NavbarProps, NotificationsView(), NotificationsViewProps (+2 more)

### Community 15 - "compilerOptions"
Cohesion: 0.11
Nodes (18): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+10 more)

### Community 16 - "AdminAreasView.tsx"
Cohesion: 0.33
Nodes (10): AdminAreasView(), AdminStaffView(), dbCreatePlant(), dbCreateStaffMember(), dbFetchPlants(), dbFetchPostcodeSectors(), dbFetchSlots(), dbFetchStaff() (+2 more)

### Community 17 - "HomeView.tsx"
Cohesion: 0.20
Nodes (8): AppDownloadBanner(), BeforeAfterCardProps, BeforeAfterItem, BeforeAfterSlider(), BeforeAfterSliderProps, DEFAULT_CASES, HomeView(), HomeViewProps

### Community 18 - "requireRole"
Cohesion: 0.05
Nodes (60): GET(), GET(), POST(), GET(), GET(), POST(), POST(), POST() (+52 more)

### Community 19 - "package.json"
Cohesion: 0.14
Nodes (13): name, private, version, motion, postcss, react-dom, tailwindcss, @tailwindcss/postcss (+5 more)

### Community 20 - "ProcessorOrdersView.tsx"
Cohesion: 0.27
Nodes (8): normalizeStatus(), ProcessorOrder, ProcessorOrdersView(), ProcessorOrdersViewProps, ProcessorStatus, statusIndex(), WORKFLOW, WorkflowProgress()

### Community 21 - "dependencies"
Cohesion: 0.17
Nodes (12): dependencies, @google/genai, lucide-react, mongodb, motion, next, qrcode.react, react (+4 more)

### Community 22 - "waitlist/route.ts"
Cohesion: 0.29
Nodes (4): GET, getWaitlistHandler(), joinWaitlistHandler(), POST

### Community 23 - "inspect_db.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 24 - "App"
Cohesion: 0.23
Nodes (19): App(), AccountView(), dbCancelOrder(), dbCreateAddress(), dbCreateOrder(), dbDeleteAddress(), dbFetchNotifications(), dbFetchOrders() (+11 more)

### Community 25 - "ManagerDriversView.tsx"
Cohesion: 0.29
Nodes (13): ManagerDriversView(), ManagerProcessorsView(), ManagerStaffView(), StaffMember, dbFetchManagerOrders(), dbFetchManagerStaff(), dbManagerAssignDriver(), dbManagerAssignProcessor() (+5 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "AppClient.tsx"
Cohesion: 0.14
Nodes (12): AppClient, AppClient, PageProps, ProcessorLayout(), SplashScreen(), SplashScreenProps, SubscriptionsView(), SubscriptionsViewProps (+4 more)

### Community 29 - "DriverPortal.tsx"
Cohesion: 0.17
Nodes (15): DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS, PinInput() (+7 more)

### Community 30 - "admin.ts"
Cohesion: 0.09
Nodes (21): AdminService, AuditLogRecord, BookingSlot, BusinessLocation, CustomerCRM, CustomerFlag, CustomerNote, Facility (+13 more)

### Community 31 - "IncidentService.ts"
Cohesion: 0.26
Nodes (5): IncidentService, IncidentPriority, IncidentRecord, IncidentStatus, IncidentType

### Community 32 - "layout.tsx"
Cohesion: 0.33
Nodes (4): next, metadata, outfit, plusJakartaSans

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 34 - "ManagerOverrideModal.tsx"
Cohesion: 0.40
Nodes (9): ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, dbAddIncidentNote(), dbCreateManagerIncident(), dbFetchManagerIncidents(), dbFetchOrderAuditLogs() (+1 more)

### Community 35 - "AdminPortal.tsx"
Cohesion: 0.13
Nodes (20): AdminCustomersView(), AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminPortalProps, AdminSettingsView(), AdminSidebar() (+12 more)

### Community 36 - "OrdersView.tsx"
Cohesion: 0.38
Nodes (6): computeOrderJourney(), formatTimelineDate(), JourneyStage, OrdersView(), OrdersViewProps, OrderStatus

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

### Community 48 - "AdminTopbar.tsx"
Cohesion: 0.50
Nodes (4): AdminTopbar(), AdminTopbarProps, MOCK_SYSTEM_ALERTS, AdminRole

### Community 49 - "PostcodeCheckerModal.tsx"
Cohesion: 0.60
Nodes (4): PostcodeCheckerModal(), PostcodeCheckerModalProps, checkPostcodeSectorActive(), joinWaitingList()

### Community 51 - "AdminComplaintsView.tsx"
Cohesion: 0.50
Nodes (3): AdminComplaintsView(), MOCK_COMPLAINTS, ComplaintRecord

## Knowledge Gaps
- **182 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+177 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 207 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **7 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `withErrorHandler`, `auth.ts`, `UserService`, `PlatformService`, `CartDrawer.tsx`, `requireRole`, `check/route.ts`, `waitlist/route.ts`, `IncidentService.ts`?**
  _High betweenness centrality (0.150) - this node is a cross-community bridge._
- **Why does `mongodb` connect `getDb` to `package.json`, `seed_services.ts`, `mongodb-init.js`, `inspect_db.js`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `ServiceItem`, `lucide-react`, `types.ts`, `mongoSignIn`, `CartDrawer.tsx`, `ActiveTab`, `AdminAreasView.tsx`, `HomeView.tsx`, `package.json`, `ProcessorOrdersView.tsx`, `ManagerDriversView.tsx`, `AppClient.tsx`, `DriverPortal.tsx`, `ManagerOverrideModal.tsx`, `AdminPortal.tsx`, `OrdersView.tsx`, `AdminReportsView.tsx`, `AdminTopbar.tsx`, `PostcodeCheckerModal.tsx`, `AdminComplaintsView.tsx`?**
  _High betweenness centrality (0.093) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _182 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12903225806451613 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.08 - nodes in this community are weakly interconnected._
- **Should `successResponse` be split into smaller, more focused modules?**
  _Cohesion score 0.12857142857142856 - nodes in this community are weakly interconnected._
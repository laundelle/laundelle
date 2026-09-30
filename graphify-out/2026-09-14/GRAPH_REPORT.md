# Graph Report - Laundelle -Laundry Software  (2026-09-14)

## Corpus Check
- 173 files · ~1,743,699 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 859 nodes · 2508 edges · 44 communities (35 shown, 8 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 29 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- withErrorHandler
- db.ts
- mockAdminData.ts
- ServiceItem
- successResponse
- OrderService.ts
- react
- getDb
- Order
- UserService
- types.ts
- AppClient.tsx
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
- check/route.ts
- ManagerOverrideModal.tsx
- devDependencies
- mongodb-init.js
- AdditionalChargeModal.tsx
- DriverPortal.tsx
- layout.tsx
- create-checkout-session/route.ts
- AdminPortal.tsx
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
- `runTests()` --calls--> `generateSecureNumericPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `generatePinSalt()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `hashOrderPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts
- `runTests()` --calls--> `encryptOrderPin()`  [EXTRACTED]
  test/test-order-pin.ts → src/lib/orderPin.ts

## Import Cycles
- None detected.

## Communities (44 total, 8 thin omitted)

### Community 0 - "withErrorHandler"
Cohesion: 0.16
Nodes (11): PATCH, patchHandler(), PATCH, patchHandler(), GET, getHandler(), GET, getHandler() (+3 more)

### Community 1 - "db.ts"
Cohesion: 0.12
Nodes (42): App(), AdminServicesView(), authHeaders(), AuthResult, dbAdminCreateService(), dbAdminFetchServices(), dbAdminUpdateCustomerStatus(), dbAdminUpdateService() (+34 more)

### Community 2 - "mockAdminData.ts"
Cohesion: 0.05
Nodes (57): AdminComplaintsView(), AdminCustomersView(), MOCK_ADMIN_SERVICES, MOCK_AUDIT_LOGS, MOCK_BAGS, MOCK_BOOKING_SLOTS, MOCK_BUSINESS_LOCATIONS, MOCK_COLLECTION_RECORDS (+49 more)

### Community 3 - "ServiceItem"
Cohesion: 0.15
Nodes (12): AIAssistantView(), AIAssistantViewProps, ChatMessage, SchedulePickupModal(), SchedulePickupModalProps, DEFAULT_VARIANTS, ServiceCustomizeModal(), ServiceCustomizeModalProps (+4 more)

### Community 4 - "successResponse"
Cohesion: 0.13
Nodes (15): POST, resolveChargeHandler(), cancelOrderHandler(), POST, POST, rescheduleOrderHandler(), GET, getOrderByIdHandler() (+7 more)

### Community 5 - "OrderService.ts"
Cohesion: 0.07
Nodes (33): mongodb, dynamic, POST(), POST(), POST(), ApiError, BadRequestError, ForbiddenError (+25 more)

### Community 6 - "react"
Cohesion: 0.11
Nodes (22): lucide-react, react, @yudiel/react-qr-scanner, QRScannerModalProps, CompletedOrder, MOCK_COMPLETED, ProcessorHistoryView(), ProcessorLayoutProps (+14 more)

### Community 7 - "getDb"
Cohesion: 0.08
Nodes (15): loginHandler(), POST, POST, signupHandler(), UnauthorizedError, base64UrlDecode(), base64UrlEncode(), hashPassword() (+7 more)

### Community 8 - "Order"
Cohesion: 0.14
Nodes (15): AdminOrdersViewProps, AdminPortalProps, InvoiceReceiptModal(), InvoiceReceiptModalProps, OrderPlacedAnimationModal(), OrderPlacedAnimationModalProps, computeOrderJourney(), formatTimelineDate() (+7 more)

### Community 9 - "UserService"
Cohesion: 0.12
Nodes (13): DELETE, deleteAddressHandler(), PATCH, updateAddressHandler(), addAddressHandler(), POST, PATCH, updatePreferencesHandler() (+5 more)

### Community 10 - "types.ts"
Cohesion: 0.24
Nodes (11): AccountViewProps, AddAddressModal(), AddAddressModalProps, OrderTimeline, RecurringSchedule, ServiceCustomisation, SupportTicket, UserAddress (+3 more)

### Community 11 - "AppClient.tsx"
Cohesion: 0.08
Nodes (29): AppClient, AppClient, PageProps, AdminLoginPage(), AdminLoginPageProps, CustomerAuthModal(), CustomerAuthModalProps, DriverLoginPage() (+21 more)

### Community 12 - "PlatformService"
Cohesion: 0.09
Nodes (15): PATCH, updatePostcodeHandler(), PATCH, updateServiceHandler(), createServiceHandler(), GET, getServicesHandler(), POST (+7 more)

### Community 13 - "CartDrawer.tsx"
Cohesion: 0.26
Nodes (24): CartDrawer(), CartDrawerProps, RescheduleCancelModal(), DEFAULT_SCHEDULE_CONFIG, formatDateToDdMmYyyy(), formatDateToYyyyMmDd(), getAvailableDeliverySlots(), getAvailablePickupSlots() (+16 more)

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
Nodes (59): GET(), GET(), POST(), GET(), GET(), POST(), POST(), POST() (+51 more)

### Community 19 - "package.json"
Cohesion: 0.13
Nodes (14): name, private, version, motion, postcss, qrcode.react, react-dom, tailwindcss (+6 more)

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

### Community 25 - "ManagerOverrideModal.tsx"
Cohesion: 0.17
Nodes (23): AdminOrdersView(), ManagerDriversView(), ManagerIncidentsView(), ManagerOverrideModal(), ManagerOverrideModalProps, TIME_SLOTS, ManagerProcessorsView(), ManagerStaffView() (+15 more)

### Community 26 - "devDependencies"
Cohesion: 0.25
Nodes (8): devDependencies, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom, typescript

### Community 27 - "mongodb-init.js"
Cohesion: 0.33
Nodes (4): envPath, fs, { MongoClient }, path

### Community 28 - "AdditionalChargeModal.tsx"
Cohesion: 0.67
Nodes (3): AdditionalChargeModal(), AdditionalChargeModalProps, AdditionalCharge

### Community 29 - "DriverPortal.tsx"
Cohesion: 0.16
Nodes (16): AccountView(), DriverJobItem, DriverPortal(), DriverPortalProps, DriverView, formatJobTimeSlot(), REFERENCE_COMPLETED_JOBS, REFERENCE_JOBS (+8 more)

### Community 32 - "layout.tsx"
Cohesion: 0.33
Nodes (4): next, metadata, outfit, plusJakartaSans

### Community 33 - "create-checkout-session/route.ts"
Cohesion: 0.50
Nodes (4): stripe, dynamic, getStripe(), POST()

### Community 35 - "AdminPortal.tsx"
Cohesion: 0.10
Nodes (25): AdminDashboard(), AdminDashboardProps, AdminFinanceView(), AdminPortal(), AdminReportsView(), CategoryItem, PlantStat, TrendPoint (+17 more)

### Community 38 - "scripts"
Cohesion: 0.50
Nodes (4): scripts, build, dev, start

### Community 39 - "assistant/route.ts"
Cohesion: 0.67
Nodes (3): @google/genai, getGeminiClient(), POST()

### Community 41 - "seed_services.ts"
Cohesion: 0.40
Nodes (3): envFile, match, mockServices

## Knowledge Gaps
- **181 isolated node(s):** `fs`, `path`, `{ MongoClient }`, `envPath`, `nextConfig` (+176 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 206 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `getDb()` connect `getDb` to `withErrorHandler`, `mockAdminData.ts`, `OrderService.ts`, `UserService`, `PlatformService`, `CartDrawer.tsx`, `tickets/route.ts`, `requireRole`, `waitlist/route.ts`, `check/route.ts`?**
  _High betweenness centrality (0.152) - this node is a cross-community bridge._
- **Why does `mongodb` connect `OrderService.ts` to `package.json`, `seed_services.ts`, `mongodb-init.js`, `inspect_db.js`?**
  _High betweenness centrality (0.097) - this node is a cross-community bridge._
- **Why does `react` connect `react` to `db.ts`, `mockAdminData.ts`, `AdminPortal.tsx`, `ServiceItem`, `Order`, `types.ts`, `AppClient.tsx`, `CartDrawer.tsx`, `ActiveTab`, `AdminAreasView.tsx`, `HomeView.tsx`, `package.json`, `ProcessorOrdersView.tsx`, `ManagerOverrideModal.tsx`, `AdditionalChargeModal.tsx`, `DriverPortal.tsx`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **What connects `fs`, `path`, `{ MongoClient }` to the rest of the system?**
  _181 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `db.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.12367864693446089 - nodes in this community are weakly interconnected._
- **Should `mockAdminData.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.05129561078794289 - nodes in this community are weakly interconnected._
- **Should `ServiceItem` be split into smaller, more focused modules?**
  _Cohesion score 0.14705882352941177 - nodes in this community are weakly interconnected._
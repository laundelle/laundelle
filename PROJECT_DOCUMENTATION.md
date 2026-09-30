# Laundelle — End-to-End Business & Technical Architecture Documentation

---

## 1. Executive Summary & Business Purpose

### 1.1 What the Business Does
**Laundelle** is a full-stack, on-demand premium laundry, dry cleaning, and garment care platform operating across the United Kingdom. It bridges the gap between digital convenience and commercial garment care by offering doorstep collection, specialized facility processing, and scheduled return delivery within guaranteed turnaround windows (24 hours express to 48 hours standard).

Unlike traditional drop-off dry cleaners or decentralized freelance gig platforms, Laundelle operates a **centralized, plant-and-fleet model**:
- Orders are collected from customer doorsteps by uniformed, tracked courier drivers.
- Garments are routed to specialized, company-managed commercial cleaning facilities (**Plants**).
- Items undergo multi-stage commercial processing (intake weight verification, sorting, wash/dry, steam pressing, automated folding, and a 9-point Quality Control check).
- Cleaned and sealed packages are delivered back to the customer's doorstep with cryptographic PIN verification.

### 1.2 Core Business Value Proposition
1. **Zero-Effort Laundry for Consumers & Businesses:** Eliminates the physical chore of washing, drying, ironing, and dry cleaner visits through scheduled 2-hour collection and delivery windows.
2. **Industrial Quality & Fabric Preservation:** Commercial-grade eco-friendly enzymes, fabric softeners, hypoallergenic fragrances, and temperature-controlled cycles protect garment longevity.
3. **Chain of Custody & Zero Loss Guarantee:** Every laundry bag and package is tagged with a unique QR code and tracked at every physical handover: Driver $\to$ Plant Intake $\to$ Machine Processing $\to$ QC Station $\to$ Delivery Fleet $\to$ Customer Handover.
4. **Fraud Prevention & Frictionless Verification:** Secure, non-repudiable 6-digit numeric PINs prevent misdelivered parcels, stolen bags, or fraudulent non-delivery claims.
5. **Multi-Plant Regional Scalability:** Intelligent geographic routing parses UK alphanumeric postcodes (outward code and inward sector) to dynamically assign orders to the optimal facility and driver fleet based on capacity and service radius.

---

## 2. User Roles & Organizational Responsibilities

Laundelle operates five distinct user roles with strict separation of duties, tailored user interfaces, and role-based access control (RBAC).

```
                      ┌──────────────────────────────────────────────┐
                      │                 SUPER ADMIN                  │
                      │   (Platform Owner, Full Governance, Config)  │
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │                    ADMIN                     │
                      │ (Customer CRM, Dynamic Pricing, Stripe, Logs)│
                      └──────────────────────┬───────────────────────┘
                                             │
                      ┌──────────────────────▼───────────────────────┐
                      │                PLANT MANAGER                 │
                      │  (Facility Ops, Shifts, Operational Overrides)│
                      └──────────────┬────────────────┬──────────────┘
                                     │                │
             ┌───────────────────────▼──────┐  ┌──────▼───────────────────────┐
             │            DRIVER            │  │          PROCESSOR           │
             │ (Doorstep Pickup & Delivery) │  │(Weigh-in, Wash, Dry, QC, Pack)│
             └──────────────┬───────────────┘  └──────────────┬───────────────┘
                            │                                 │
                            └────────────────┬────────────────┘
                                             │
                               ┌─────────────▼────────────┐
                               │         CUSTOMER         │
                               │  (Web/Mobile App User)   │
                               └──────────────────────────┘
```

### 2.1 Role Matrix & Responsibilities

| Role | Primary Workplace / Portal | Core Responsibilities & Business Objectives | Key Restrictions |
| :--- | :--- | :--- | :--- |
| **Customer** | Customer Web App / PWA (`/customer/home`) | • Browse catalog, configure custom garment preferences.<br>• Book pickup and delivery time windows.<br>• Pay via Stripe card, Apple Pay, Google Pay, or COD.<br>• View live order journey timeline and delivery driver coordinates.<br>• Reveal secure collection/delivery PIN to driver.<br>• Accept/reject additional weight charges.<br>• Subscribe to recurring weekly/monthly wash plans.<br>• Consult AI Garment Care Master for stain advice.<br>• File support tickets for damaged/missing garments. | • Cannot modify orders once processing begins.<br>• Cannot view internal facility notes or staff data.<br>• Cannot view internal system logs or pricing margins. |
| **Driver** | Mobile Driver Portal (`/driver/home`) | • View daily assigned pickup and delivery manifests.<br>• Sequence delivery routes by postcode and time slots.<br>• Scan physical bag QR codes upon collection.<br>• Verify customer identity via 6-digit doorstep PIN input.<br>• Capture collection & delivery photo proof and customer signature.<br>• Log collection issues (customer unavailable, access blocked).<br>• Transport collected loads safely back to assigned Plant. | • Read-only access to customer contact details (masked/redacted PINs).<br>• Cannot alter order billing, service items, or prices.<br>• Cannot override PIN verification without Manager/Admin intervention.<br>• Cannot access facility processing stations. |
| **Processor** (Facility Staff) | Facility Terminal / Tablet (`/processor/home`) | • Perform physical facility check-in and digital weigh-in.<br>• Inspect incoming garments for pre-existing tears or contraband.<br>• Initiate Additional Charge Requests for overweight bags.<br>• Manage industrial laundry pipeline (Washing, Drying, Ironing, Folding).<br>• Scan machine QR codes to bind loads to specific washers/dryers.<br>• Conduct 9-point Quality Control (QC) inspection.<br>• Trigger rewash loops for stained or damp garments.<br>• Bag and seal clean orders, print/attach final delivery QR tags. | • No access to customer financial data or payment details.<br>• Cannot view or override customer PINs.<br>• Cannot assign drivers or modify pickup/delivery slots.<br>• Cannot issue refunds or store credits. |
| **Plant Manager** | Manager Portal (`/manager/dashboard`) | • Oversee day-to-day operations and metrics of assigned Plant.<br>• Monitor plant capacity (daily order count and total weight in kg).<br>• Assign/reassign drivers to pickup runs and processors to queues.<br>• Manage staff shift attendance and availability status.<br>• Perform authorized operational overrides (reschedule slots, edit addresses, resend customer OTPs, unassign staff, advance pipeline stages).<br>• Log incident tickets (damaged item, missing piece, delay) and conduct investigations.<br>• Resolve operational disputes (trigger free rewash, manual resolution). | • Strictly prohibited from executing financial transactions (refunds, credits, price overrides).<br>• Cannot force-bypass customer PIN verification.<br>• Scope limited strictly to their assigned Plant and associated postcodes. |
| **Admin & Super Admin** | Central Admin Portal (`/admin/dashboard`) | • Comprehensive enterprise governance across all plants and regions.<br>• Customer CRM (flags, lifetime spend, VIP tiers, internal notes).<br>• Service catalog and dynamic pricing engine management.<br>• Logistics territory mapping (districts, sectors, capacities, slot rules).<br>• Financial auditing, Stripe reconciliation, manual invoice adjustments.<br>• Authorized for high-privilege emergency overrides (force PIN verification, rollback status, order cancellation, financial refunds).<br>• Full immutable audit log inspection and system health monitoring. | • Actions are recorded permanently in the immutable audit log with user ID, timestamp, and IP address. |

---

## 3. End-to-End Real-World Business Workflow

Here is the complete journey of a Laundelle order from the moment a customer realizes they need clean clothes to post-delivery satisfaction.

```
+----------------------------------------------------------------------------------------------------+
|                                    STAGE 1: DISCOVERY & BOOKING                                    |
| Customer checks postcode -> Customizes wash preferences -> Selects 2h slots -> Pays via Stripe     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 STAGE 2: ROUTING & FLEET DISPATCH                                  |
| System matches UK postcode to Plant -> Assigns local Courier Driver -> Generates Encrypted PINs    |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                               STAGE 3: DOORSTEP COLLECTION & TAGGING                               |
| Driver arrives -> Customer states 6-digit PIN -> Driver scans Bag QR -> Intake photos captured     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                STAGE 4: FACILITY INTAKE & WEIGH-IN                                 |
| Plant Processor scans Bag QR -> Digital scale weigh-in -> Overweight check (Customer approval)     |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                            STAGE 5: COMMERCIAL PROCESSING & MACHINES                               |
| Garment Sorting -> Washer Cycle (Eco-enzyme) -> Dryer -> Steam Ironing -> Robotic Flat Fold        |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                             STAGE 6: 9-POINT QUALITY CONTROL & PACKAGING                           |
| Visual stain audit -> Zero moisture check -> QC pass or Rewash Loop -> Sealed in protective film   |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                                 STAGE 7: RETURN TRANSIT & DELIVERY                                 |
| Delivery Driver assigned -> Out for Delivery -> Customer states Delivery PIN -> Handover completed |
+----------------------------------------------------------------------------------------------------+
                                                  │
                                                  ▼
+----------------------------------------------------------------------------------------------------+
|                             STAGE 8: POST-DELIVERY CARE & GOVERNANCE                               |
| Automated invoice receipt -> Loyalty points awarded -> Incident dispute management (if required)   |
+----------------------------------------------------------------------------------------------------+
```

### Detailed Phase Walkthrough

#### Stage 1: Discovery, Address Validation & Booking
1. **Postcode Availability Check:** The customer enters their UK postcode (e.g. `PR1 1AA` or `SW1A 1AA`). The platform normalizes the postcode, checks active coverage in the `postcode_sectors` database, and determines the servicing Plant. If unserviced, the customer is invited to join the geographic waitlist.
2. **Catalog & Garment Customization:** The customer selects services:
   - *Wash & Tumble Fold* (priced per kg or per bag)
   - *Formal Shirt Steaming & Pressing* (priced per piece)
   - *Bedding & Duvet Deep Clean* (priced per set)
   - *Delicate & Wool Dry Cleaning* (priced per garment)
   - *Shoe & Sneaker Restoration* (priced per pair)
   The customer chooses detergent (Standard vs. Eco-Enzyme), fabric softener, hypoallergenic fragrance, folding style (Flat Fold vs. Hanger Preferred), and optional express 24-hour turnaround.
3. **Scheduling:** The customer selects a 2-hour collection slot and delivery slot based on live plant slot capacity.
4. **Checkout & Pre-Authorization:** The customer inputs address instructions, gate codes, and completes payment via Stripe (Credit/Debit Card, Apple Pay, Google Pay) or selects Cash on Delivery.

#### Stage 2: Routing, Dispatch & PIN Cryptography
1. **Plant & Driver Allocation:** The server matches the customer's postcode against plant territory configurations. The order is automatically associated with the assigned Plant and its Manager.
2. **Cryptographic PIN Generation:** The system generates two distinct 6-digit numeric verification tokens: `pickup_pin` and `delivery_pin`.
   - Each PIN is hashed using `HMAC-SHA256` salted with a 16-byte cryptographically secure random salt, tied to `orderId` and `customerId`.
   - The plaintext PIN is encrypted in MongoDB using `AES-256-GCM` with Additional Authenticated Data (AAD).
   - Only the authenticated customer can decrypt and view their PINs in their mobile portal. PINs are completely redacted and invisible to drivers, processors, and plant managers.

#### Stage 3: Doorstep Collection
1. **Driver Manifest:** The driver opens the mobile Driver Portal, reviews their active pickup schedule, and taps navigation for route directions.
2. **Customer Doorstep Verification:** When the driver arrives, the customer shares their 6-digit Pickup PIN.
3. **Verification & Lockout Safety:** The driver inputs the PIN into their portal. The backend verifies the hash in constant time (`crypto.timingSafeEqual`). If incorrect, the driver has up to 5 attempts before the PIN locks to prevent brute force attacks.
4. **Physical Bag Tagging:** The driver places garments into a heavy-duty Laundelle laundry bag, scans the bag's pre-printed QR code, takes a photo of the packed bag, and submits. The order status updates instantly to `laundry_collected`.

#### Stage 4: Plant Intake & Precision Weigh-In
1. **Arrival at Facility:** The driver unloads bags at the regional laundry facility.
2. **Processor Intake Scan:** The intake processor scans the QR bag using a tablet or scanner.
3. **Certified Weigh-In:** The bag is placed on a digital floor scale. The processor records the actual weight in kg.
4. **Visual Inspection:** The processor checks for pre-existing fabric damage, burns, or prohibited contraband (lighters, sharp objects, heavy metals) and uploads intake photos.
5. **Overweight / Surcharge Handling:** If the actual weight exceeds the customer's booked estimate by $>1.0$ kg:
   - The system automatically creates an `AdditionalCharge` record.
   - The order enters `awaiting_customer_approval`.
   - The customer receives an instant notification to review the scale photo and approve the difference via Stripe.

#### Stage 5: Commercial Laundry Pipeline
Once intake is approved, the order advances through specialized mechanical stages:
- **Sorting (`sorting`):** Separating whites, darks, delicates, wools, and stain-treated items.
- **Washing (`washing`):** Loading into commercial washers. The processor scans the washer's machine QR code to link the order to the machine cycle and temperature preset.
- **Drying (`drying`):** Tumble drying at controlled temperatures to prevent shrinkage.
- **Finishing & Pressing (`ironing`):** Rotary shirt pressing, steam tunnel, or hand-ironing as requested.
- **Folding (`folding`):** Automated garment folding or protective hanger bagging.

#### Stage 6: 9-Point Quality Control (QC) Station
Before garments can be cleared for delivery, they must pass through a dedicated Quality Control station:
1. All manifest items accounted for.
2. Zero surface stains remaining.
3. Garments 100% dry (zero residual moisture).
4. Crisp steam press and uniform flat-folding standards met.
5. Zero fabric tears, linting, or mechanical snags.
6. Customer custom fragrance and detergent preferences verified.
7. Special instructions complied with.
8. Bag QR tag matching order ID verified.
9. Hygienic anti-static protective film sealed.

*The Rewash Loop:* If the QC inspector discovers remaining stains or dampness, the inspector marks the item as `rewash_required`. The order is routed back to `washing` for chemical spot-treatment and re-cleaning.

#### Stage 7: Return Transit & Delivery
1. **Ready for Delivery:** The packaged order is sealed with a delivery QR label and placed in the facility outbound holding bay (`ready_for_delivery`).
2. **Delivery Driver Assignment:** The system or Plant Manager assigns the package to an outbound courier driver.
3. **Out for Delivery:** The driver loads the order into their vehicle, updating the status to `out_for_delivery`. The customer receives a notification that their delivery driver is en route.
4. **Doorstep Handover Verification:** The driver arrives at the customer's address. The customer provides their 6-digit Delivery PIN. The driver inputs the PIN, the server validates the hash, and logs photo proof of delivery. The order transitions to `delivered` and then `completed`.

#### Stage 8: Post-Delivery Care & Incident Management
1. **Invoice & Points:** A PDF invoice/receipt is generated, and customer reward points are credited.
2. **Customer Inquiries & Claims:** If an item is missing or damaged, the customer can submit an incident ticket with photo evidence via the Support Portal.
3. **Dispute Resolution:** The Plant Manager reviews the digital audit trail (intake photos, scale weight, machine cycles, QC checklists) to resolve the issue through a complimentary rewash or passes it to Admin for a Stripe refund or store credit voucher.

---

## 4. Complete Order State Machine & Allowed Transitions

The Laundelle lifecycle is governed by an authoritative state machine defined in `src/lib/workflow.ts`. Illegal state transitions (e.g. attempting to skip processing directly to delivery) are strictly blocked with an HTTP 400 `BadRequestError`.

```
[ pending_payment ]
        │
        ▼ (Stripe checkout completed / COD selected)
[ booking_confirmed ]
        │
        ▼ (Driver scheduled for route)
[ collection_scheduled / driver_assigned ]
        │
        ▼ (Driver starts transit to customer)
[ pickup_in_progress ]
        │
        ▼ (Driver validates 6-digit PIN & scans Bag QR)
[ laundry_collected / picked_up ]
        │
        ▼ (Driver returns to facility)
[ received_at_facility ]
        │
        ▼ (Garments sorted by fabric & colour)
[ sorting ]
        │
        ▼ (Loaded into commercial washer)
[ washing / processing ]
        │
        ▼ (Temperature-controlled drying)
[ drying ]
        │
        ▼ (Steam tunnel & hand press)
[ ironing ]
        │
        ▼ (Flat fold / hanger bagging)
[ folding ]
        │
        ▼ (9-point inspection checklist)
[ quality_check / qc_ready ] ─────────► [ washing ] (Rewash Loop if QC fails)
        │
        ▼ (QC passed & anti-static film sealed)
[ ready_for_delivery ]
        │
        ▼ (Assigned to outbound courier)
[ delivery_driver_assigned ]
        │
        ▼ (Driver in transit to customer)
[ out_for_delivery ]
        │
        ▼ (Customer validates 6-digit Delivery PIN)
[ delivered ]
        │
        ▼
[ completed ]
```

### Transition Authority Table

| Current Status | Allowed Target Statuses | Trigger Event / Actor |
| :--- | :--- | :--- |
| `pending_payment` | `booking_confirmed`, `cancelled` | Stripe webhook confirmation or timeout cancel. |
| `booking_confirmed` | `collection_scheduled`, `driver_assigned`, `pickup_in_progress`, `cancelled` | Automated dispatch or Manager driver allocation. |
| `collection_scheduled` | `driver_assigned`, `pickup_in_progress`, `laundry_collected`, `picked_up`, `cancelled` | Driver accepts run or initiates pickup route. |
| `driver_assigned` | `pickup_in_progress`, `laundry_collected`, `picked_up`, `collection_scheduled`, `cancelled` | Driver en route to customer doorstep. |
| `pickup_in_progress` | `laundry_collected`, `picked_up`, `driver_assigned`, `cancelled` | Successful collection PIN entry + QR bag scan. |
| `laundry_collected` | `received_at_facility`, `arrived_at_facility`, `in_transit`, `sorting`, `washing` | Driver delivers van cargo to plant intake dock. |
| `received_at_facility` | `processor_assigned`, `sorting`, `washing`, `processing` | Plant processor scans bag and weighs in on digital scale. |
| `sorting` | `washing`, `drying`, `ironing`, `folding`, `qc_ready`, `quality_check` | Garments segregated into cycle wash loads. |
| `washing` | `drying`, `ironing`, `folding`, `qc_ready`, `quality_check` | Commercial wash cycle finishes. |
| `drying` | `ironing`, `folding`, `qc_ready`, `quality_check` | Tumble dry cycle completes (zero moisture). |
| `ironing` | `folding`, `qc_ready`, `quality_check` | Steam finishing and pressing completed. |
| `folding` | `qc_ready`, `quality_check`, `ready_for_delivery` | Garments folded or hung. |
| `quality_check` | `ready_for_delivery`, `washing`, `sorting` | QC Passed $\to$ `ready_for_delivery`. QC Failed $\to$ `washing` (Rewash). |
| `ready_for_delivery` | `delivery_driver_assigned`, `package_collected_for_delivery`, `out_for_delivery` | Delivery driver assigned to package. |
| `delivery_driver_assigned`| `package_collected_for_delivery`, `out_for_delivery` | Driver loads package into delivery van. |
| `package_collected_for_delivery` | `out_for_delivery`, `delivered` | Driver begins transit to customer delivery address. |
| `out_for_delivery` | `delivered`, `delivery_driver_assigned` | Customer verifies 6-digit Delivery PIN. |
| `delivered` | `completed` | System archives order and issues points/receipt. |
| `cancelled` | *(Terminal state)* | Order terminated by customer or Admin. |

---

## 5. Security & Cryptographic Pin Subsystem

To eliminate fraudulent claims of missing orders, stolen packages, or false delivery confirmations, Laundelle implements a multi-tier cryptographic PIN subsystem (`src/lib/orderPin.ts`).

```
                              ┌─────────────────────────────────────────┐
                              │  Cryptographic Random PIN Generation    │
                              │       crypto.randomInt(100000, 1000000) │
                              └────────────────────┬────────────────────┘
                                                   │
                      ┌────────────────────────────┴───────────────────────────┐
                      │                                                        │
                      ▼                                                        ▼
      ┌───────────────────────────────┐                        ┌───────────────────────────────┐
      │   In-Memory AES-256-GCM       │                        │   Salted HMAC-SHA256 Hash     │
      │   Encryption with AAD         │                        │   Bound to Order + Customer   │
      └───────────────┬───────────────┘                        └───────────────┬───────────────┘
                      │                                                        │
                      ▼                                                        ▼
      ┌───────────────────────────────┐                        ┌───────────────────────────────┐
      │ Stored in MongoDB:            │                        │ Stored in MongoDB:            │
      │ { iv : authTag : ciphertext } │                        │ { pin_hash, pin_salt }        │
      └───────────────┬───────────────┘                        └───────────────┬───────────────┘
                      │                                                        │
                      ▼                                                        ▼
         Decrypted ONLY in memory for                             Constant-time verification:
          authenticated customer UI.                               crypto.timingSafeEqual()
          Redacted from all staff.                                 Max 5 attempts before lockout.
```

### 5.1 Cryptographic Guarantees
1. **Binding & AAD:** The PIN hash and ciphertext are cryptographically bound to the combination of `orderId`, `customerId`, and a 16-byte random salt. A PIN from one order cannot be replayed or substituted for another.
2. **Zero-Knowledge to Staff:** The plaintext PIN is never stored unencrypted in the database and is excluded from all API responses to drivers, processors, and managers. The customer must physically or verbally provide the PIN at the door.
3. **Timing-Attack Resistance:** Verification uses `crypto.timingSafeEqual` to prevent attackers from inferring correct digits via response latency.
4. **Brute-Force Lockout:** After 5 failed attempts, the PIN state is marked `locked: true`. The order cannot be marked collected or delivered without manager/admin verification.

---

## 6. Role Permissions & Operational Overrides

In real-world logistics, exceptions happen: customer phones run out of battery, gate access codes fail, customers request urgent slot changes, or stains require unexpected rewashes. Laundelle maintains a strict separation between **Operational Overrides** (Manager) and **Financial / Critical Overrides** (Admin Only) in `src/lib/permissions.ts`.

### 6.1 Permission Matrix

| Override Action | Action Code | Permitted Roles | Business Rationale & Safety Guardrails |
| :--- | :--- | :--- | :--- |
| **Reschedule Slot** | `reschedule_slot` | Manager, Admin, Super Admin | Customer is not home; manager reschedules pickup/delivery window to another available plant slot. |
| **Edit Order Address/Phone** | `edit_order_details` | Manager, Admin, Super Admin | Customer provided incorrect flat number or driver notes; manager corrects delivery routing. |
| **Resend Pickup OTP / PIN** | `resend_pickup_otp` | Manager, Admin, Super Admin | Customer deleted notification or SMS; generates a fresh secure PIN. |
| **Mark Customer Unavailable**| `mark_customer_unavailable` | Manager, Admin, Super Admin | Driver waited at door; flags customer as no-show and reschedules run. |
| **Return to Plant** | `return_to_plant` | Manager, Admin, Super Admin | Route cancelled or truck breakdown; cargo returned safely to facility. |
| **Advance Pipeline Stage** | `advance_stage` | Manager, Admin, Super Admin | Physical wash finished but processor forgot to tap tablet; manager advances stage. |
| **Flag Rewash** | `flag_rewash` | Manager, Admin, Super Admin | Quality check failed; routes garments back to washing queue for re-treatment. |
| **Unassign Staff** | `unassign_driver`, `unassign_processor` | Manager, Admin, Super Admin | Staff member called in sick; reassigns load to another available employee. |
| **Force Confirm Pickup PIN** | `force_pickup_otp` | **Admin Only** | Customer phone broken at doorstep; driver confirmed identity with physical photo ID. Requires Admin approval and logs an audit trail. |
| **Force Confirm Delivery PIN**| `force_delivery_pin` | **Admin Only** | Emergency delivery signoff without customer smartphone. High risk of fraud; Admin-only. |
| **Cancel Order** | `cancel_order` | **Admin Only** | Order terminated prior to or during processing. Requires financial review. |
| **Reopen Order** | `reopen_order` | **Admin Only** | Erroneously marked completed; restored to active delivery pipeline. |
| **Rollback Status** | `rollback_pickup`, `rollback_delivery` | **Admin Only** | Reverses incorrect status transitions. |
| **Edit Order Items / Price** | `edit_order_items` | **Admin Only** | Modifies line items or billing totals after order submission. |
| **Incident Resolution: Rewash**| `rewash` | Manager, Admin, Super Admin | Operational remedy for stain complaints. No money changes hands. |
| **Incident Resolution: Refund**| `refund` | **Admin Only** | Stripe card refund. Directly impacts business revenue. |
| **Incident Resolution: Credit**| `credit` | **Admin Only** | Issues promotional or goodwill store credit vouchers to customer balance. |
| **Incident Resolution: Replace**| `replacement` | **Admin Only** | Reimburses customer for lost or permanently damaged garments. |

---

## 7. Key Features & Functional Modules

### 7.1 Customer Modules
- **Postcode Radius & Serviceability Engine:** Automatically parses UK outward (district) and inward (sector) postcodes, verifies plant coverage, and checks real-time slot booking limits.
- **Dynamic Garment Customizer:** Allows per-service customization of eco-enzyme detergents, luxury fabric conditioners, hypoallergenic fragrance profiles, flat-fold vs. hanger delivery, and stain treatments.
- **Interactive Order Journey Tracker:** Real-time visual timeline showing current status, driver location coordinates, estimated arrival window, and decrypted collection/delivery PINs.
- **Additional Charge Approval Modal:** Displays scale weigh-in photos, original vs. actual weights, and surcharge breakdown, allowing customers to approve or reject extra charges with one tap.
- **Subscriptions & Recurring Care:** Flexible subscription tiers (Basic, Standard, Premium) offering weekly or bi-weekly automated pickups, overage weight allowances, and discounts on dry cleaning.
- **AI Garment Care Master (Gemini 2.0 Flash):** Built-in AI consultant for emergency stain removal instructions (wine, coffee, grease, ink) and laundry load estimation based on fabric types.
- **Customer Support & Live Ticket Desk:** Submits tickets with photo uploads for missing items, damaged garments, or collection delays.

### 7.2 Driver Fleet Modules
- **Dynamic Manifest & Route Sequencing:** Automatically groups assigned pickups and deliveries by postcode sector and time slot windows.
- **Doorstep Verification Station:** Numeric PIN entry keypad with instant feedback, attempt counter, and brute-force lockout protection.
- **Camera & Photo Proof Integration:** Compresses and uploads collection/delivery photos, captures digital customer signatures, and tags GPS coordinates.
- **Bag QR Code Scanner:** Pairs physical laundry bags to digital orders upon collection.

### 7.3 Processor & Facility Modules
- **Plant Intake Terminal:** QR scanner for arriving cargo, precision digital scale weigh-in, and pre-existing garment defect photo logging.
- **Visual Kanban Laundry Pipeline:** Interactive multi-column workflow (`sorting` $\to$ `washing` $\to$ `drying` $\to$ `ironing` $\to$ `folding` $\to$ `qc`).
- **Machine Fleet Binding:** Associates active laundry bags with specific washing machines and dryer codes for cycle traceability.
- **9-Point Quality Control Station:** Interactive digital QC inspection checklist with one-touch triggers for the Rewash Loop.
- **Packaging & Delivery Dispatch:** Binds clean, anti-static sealed bundles to final delivery QR codes for driver pickup.

### 7.4 Plant Manager Modules
- **Facility Capacity Cockpit:** Real-time tracking of daily booked orders vs. plant capacity limits and total kg processed.
- **Staff Fleet Management:** Toggles driver and processor shift availability (`available`, `busy`, `offline`) and monitors active job loads.
- **Operational Override Modal:** Interface to reschedule slots, update addresses, resend customer PINs, reassign drivers, or flag rewashes with mandatory reason logging.
- **Incident Management System:** Dedicated incident logger for reported complaints with priority tags (`low`, `medium`, `high`, `urgent`), investigation notes, and operational remedies.

### 7.5 Central Admin Modules
- **Executive Operations Dashboard:** Enterprise metrics on daily revenue, order trends, kilograms processed, and delivery fulfillment rates.
- **Customer CRM:** Tracks customer lifetime value (LTV), repeat order rate, preferred detergent profiles, internal risk flags (`Chargeback`, `Fraud Concern`, `Abusive Behavior`), and staff notes.
- **Geographic Logistics & Plant Manager:** Configures Plants, physical facility addresses, serviced UK postcode sectors, and 2-hour collection/delivery slots with capacity caps.
- **Dynamic Pricing & Service Catalog:** Manages base prices, price per kg, minimum order values, collection fees, delivery fees, and express surcharges.
- **Finance & Stripe Reconciliation Ledger:** Audits incoming payments, Stripe payment intent IDs, processed refunds, goodwill store credits, and manual financial adjustments.
- **System Alerts & Immutable Audit Trail:** Real-time warnings for QR mismatches, delayed drivers, capacity overruns, and complete audit records of every administrative action.

---

## 8. Financial Flows, Payments & Pricing Architecture

```
                       ┌──────────────────────────────┐
                       │  Authoritative Database Total│
                       │   (Order subtotal + fees)    │
                       └──────────────┬───────────────┘
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │   Stripe Checkout Session    │
                       │   (GBP currency, card, Apple)│
                       └──────────────┬───────────────┘
                                      │
                         Stripe Webhook (Signature verified)
                                      │
                                      ▼
                       ┌──────────────────────────────┐
                       │  Idempotent Event Check      │
                       │ (db.collection('stripe_events')│
                       └──────────────┬───────────────┘
                                      │
                      ┌───────────────┴───────────────┐
                      ▼                               ▼
       [ checkout.session.completed ]     [ payment_intent.failed ]
                      │                               │
                      ▼                               ▼
          Order status updated to:             Order flagged:
           'booking_confirmed'                 'pending_payment'
           Payment status: 'Paid'               Alert dispatched to Admin
```

### 8.1 Server-Side Authoritative Pricing
To prevent client-side price tampering, all financial calculations are computed server-side:
$$\text{Total} = \text{Subtotal} + \text{Additions} - \text{Discount} + \text{Collection Fee} + \text{Delivery Fee} + \text{Express Surcharge} + \text{Service Fee}$$

- **Weight Surcharges:** Additional charges created at plant intake must be explicitly approved by the customer before charging through Stripe.
- **Stripe Webhook Idempotency:** The webhook handler records event IDs in `stripe_events` using unique database indexes, ensuring duplicate webhook deliveries cannot result in double billing or repeated state transitions.
- **Financial Remedies:** Refunds are initiated through the Stripe API using `stripe.refunds.create({ payment_intent })` and logged in `refunds_audit`.

---

## 9. Third-Party Integrations & Technical Infrastructure

| Service / Technology | Role in Laundelle Architecture | Technical Details & Files |
| :--- | :--- | :--- |
| **Next.js 15 (App Router)** | Full-stack web framework | Server-side API routes (`/api/v1/*`), dynamic client views, React 19 server components. |
| **MongoDB Atlas / Native Driver** | Authoritative primary database | Indexed collections: `orders`, `users`, `plants`, `postcode_sectors`, `slots`, `incidents`, `customer_flags`, `audit_log`, `notifications`. Direct connection pooling via `src/lib/mongodb.ts`. |
| **Stripe Payments** | Payment processing & webhooks | Stripe Checkout, payment intents, refunds, webhook signature verification (`src/services/PaymentService.ts`). |
| **Google Gemini 2.0 Flash** | AI Garment Care Specialist | Emergency stain removal recommendations, load weight estimation, care instructions via `@google/genai` (`src/app/api/gemini/assistant/route.ts`). |
| **QR & Barcode Subsystem** | Physical item chain-of-custody | Dynamic QR code generation for bags and packages (`qrcode.react`), live camera QR scanning via `@yudiel/react-qr-scanner`. |
| **Node.js Crypto** | Enterprise security & tokens | `AES-256-GCM` encryption with AAD, `HMAC-SHA256` salted hashing, constant-time verification (`crypto.timingSafeEqual`). |
| **Lucide Icons & Tailwind CSS** | Design system & UI aesthetics | Premium visual hierarchy, micro-animations, glassmorphism, responsive mobile-first views. |

---

## 10. Cross-Role Collaboration & Real-World Interaction Scenarios

### Scenario A: The Overweight Bag & Additional Charge Approval
1. **Customer** books a *Wash & Tumble Fold* order estimated at 6 kg (£18.00).
2. **Driver** arrives, verifies the customer's pickup PIN, places the laundry in Bag `#BAG-402`, and scans the QR code.
3. **Processor** at the plant scans `#BAG-402` and places it on the digital floor scale. The scale reads 9.5 kg (3.5 kg over estimate).
4. **Processor** enters 9.5 kg into the intake terminal. The system calculates an overage fee of £7.00 (3.5 kg $\times$ £2.00/kg) and generates an `AdditionalCharge` record with photos of the scale readout.
5. **Customer** receives an instant push/in-app notification. They open their app, inspect the scale photo, and tap **"Approve & Pay £7.00"**.
6. The payment is processed via Stripe, the order status updates to `received_at_facility`, and the garments enter the sorting queue.

### Scenario B: The Doorstep Delivery Handover & PIN Lockout Safety
1. **Delivery Driver** arrives at the customer's flat with sealed garment bags.
2. **Customer** opens the Laundelle app and reveals their 6-digit Delivery PIN (`482910`).
3. **Driver** types the PIN into the mobile driver portal.
4. If entered incorrectly 5 times (e.g. driver typo or misheard number), the PIN automatically locks to protect the customer from unauthorized collection.
5. **Driver** contacts **Plant Dispatch / Manager**. The Manager verifies the customer's identity over the phone or requests **Admin Override**.
6. The Admin executes an audited `force_delivery_pin` override. The package is handed over, photo proof is logged, and the customer receives an instant delivery confirmation.

### Scenario C: The Stubborn Stain & The Rewash Loop
1. Garments complete the wash and dry cycles.
2. **Processor** at the QC station examines a white silk blouse and discovers residual coffee staining on the collar.
3. Rather than packaging the defective item, the processor selects **"Stain Remains (Rewash)"** in the QC checklist.
4. The system updates the order history, triggers a notification to plant supervisors, and automatically moves the item back to `washing`.
5. The garment undergoes enzyme pre-soaking and a specialized delicate rewash cycle, passing secondary QC before final protective packaging and dispatch.

---

## 11. Summary & Architecture Compliance

Laundelle represents an end-to-end, industrial-grade operational platform. By combining:
- Physical chain-of-custody tracking (QR bag tagging at every handover),
- Non-repudiable cryptographic security (AES-256-GCM encrypted, HMAC-SHA256 salted PINs),
- Strict role-based workflow boundaries (Manager operational overrides vs. Admin financial controls), and
- Multi-plant geographic routing (UK postcode sector parsing and dynamic capacity caps),

the system ensures zero lost laundry, transparent real-time tracking for customers, and scalable, predictable operations for facility and logistics teams.

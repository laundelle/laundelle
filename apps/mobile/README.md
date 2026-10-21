# LAUNDELLE — React Native Mobile Applications

This directory contains two standalone native mobile applications built with **Expo SDK 57**, **React Native 0.86.3**, and **TypeScript** (React 19.2.3), seamlessly integrated into the LAUNDELLE PNPM + Turborepo monorepo.

---

## Applications Overview

| Application | Path | Identifier / Scheme | Target Audience | Primary Capabilities |
| :--- | :--- | :--- | :--- | :--- |
| **LAUNDELLE Customer** | `apps/mobile/customer/` | `uk.co.laundelle.customer`<br>`laundelle-customer://` | End Customers | Registration, Auth0 PKCE login, UK postcode availability checker, service catalog, booking & slot selection, Stripe online payments, real-time 7-stage order tracking, customer pickup/delivery OTP PIN display. |
| **LAUNDELLE Operations** | `apps/mobile/operations/` | `uk.co.laundelle.operations`<br>`laundelle-ops://` | Field Drivers & Facility Processors | **Drivers:** Route queue, doorstep arrival notification, 6-digit Customer Pickup PIN verification, QR bag tag pairing, 6-digit Customer Delivery PIN verification, delivery exception handling.<br>**Processors:** Plant order queue, dock intake weight recording (kg), camera QR scanning, sequential laundry stage stepper (`picked_up` → `ready_for_delivery`), quality check pass/rewash routing. |

> [!IMPORTANT]
> **Strict Plant Manager and Administrator Exclusion:**
> Plant Managers and System Administrators are strictly excluded from the mobile interface. They continue using their dedicated Next.js web portals (`apps/operations` and `apps/admin`). If an authenticated user with an unsupported role (e.g., `PLANT_MANAGER`, `ADMIN`, `CUSTOMER`) logs into the Operations mobile app, the role gatekeeper terminates the session, redirects to a dedicated Access Denied screen, and provides a secure sign-out action.

---

## Directory Structure

```
apps/mobile/
├── customer/                          # Customer Expo Application
│   ├── app/                           # Expo Router File-Based Navigation
│   │   ├── (auth)/                    # Authentication group (login, register)
│   │   ├── (tabs)/                    # Bottom tab navigator (Home, Services, Orders, Account)
│   │   ├── booking/                   # Booking flow (service selection, slot picker, checkout)
│   │   ├── orders/[id].tsx            # Real-time order tracking & 6-digit OTP cards
│   │   └── _layout.tsx                # App root provider & navigation stack
│   ├── assets/                        # Brand icons, adaptive icons, splash screens
│   ├── src/
│   │   ├── components/                # Reusable UI (Button, Input, Card, Badge, Header, PostcodeChecker, ErrorRetry)
│   │   ├── context/                   # AuthContext with Auth0 PKCE flow & SecureStore
│   │   ├── services/                  # Async SecureStore adapter & typed api client
│   │   ├── theme/                     # Laundelle White & Blue Design Tokens
│   │   └── types/                     # Ambient icon type declarations
│   ├── __tests__/                     # Automated customer workflow test suite
│   ├── app.json                       # Expo SDK 52 configuration
│   ├── eas.json                       # EAS Build profiles (development, preview, production)
│   └── package.json                   # @laundelle/mobile-customer
│
├── operations/                        # Staff Operations Application (Drivers & Processors)
│   ├── app/                           # Expo Router File-Based Navigation
│   │   ├── (auth)/                    # Auth screens & Access Denied security screen
│   │   ├── (driver)/                  # Driver portal (jobs queue, arrival, OTP pickup, OTP delivery, history)
│   │   ├── (processor)/               # Processor portal (plant queue, camera QR scan, dock weight intake, stage progression, QC)
│   │   └── _layout.tsx                # Role-gated root layout & state supervisor
│   ├── assets/                        # Brand icons, adaptive icons, splash screens
│   ├── src/
│   │   ├── components/                # Reusable UI (OtpInput, QrScannerModal, Button, Input, Card, Badge, Header)
│   │   ├── context/                   # AuthContext with verified role enforcement
│   │   ├── services/                  # Async SecureStore adapter & typed api client
│   │   ├── theme/                     # Laundelle White & Blue Design Tokens
│   │   └── types/                     # Ambient icon type declarations
│   ├── __tests__/                     # Automated operations workflow test suite
│   ├── app.json                       # Expo SDK 52 configuration with Camera permissions
│   ├── eas.json                       # EAS Build profiles (development, preview, production)
│   └── package.json                   # @laundelle/mobile-operations
```

---

## Shared Monorepo Package Integration

Both applications directly consume shared workspace packages without code duplication or server-side leaks:

- `@laundelle/types`: Canonical domain models (`OrderStatus`, `Order`, `ServiceItem`, `StaffProfile`, `UserRole`).
- `@laundelle/validations`: Runtime Zod schemas (`createOrderSchema`, `loginSchema`, `driverPickupSchema`, `driverDeliverySchema`, `processorStageSchema`, `processorQcSchema`).
- `@laundelle/utils`: BS 7666 UK postcode normalization (`normalizeUkPostcode`), validation (`isValidUkPostcode`), and service area checking (`isPostcodeInServiceArea`).
- `@laundelle/ids`: Deterministic, cryptographically secure ID generators (`createPrefixedId`).
- `@laundelle/api-client`: Universal HTTP client with asynchronous token resolution (`getToken: () => Promise<string | null>`) targeting the backend API.

---

## Security Architecture

1. **Native Auth0 PKCE Flow:**
   - Both apps authenticate via Authorization Code Flow with Proof Key for Code Exchange (PKCE) using `expo-auth-session` and `expo-crypto`.
   - Client secrets are never embedded in the client bundles.
   - Redirect URIs are explicitly registered:
     - Customer: `laundelle-customer://auth`
     - Operations: `laundelle-ops://auth`

2. **Secure Token Storage:**
   - Access tokens and user session payloads are stored in device-level encrypted hardware keystores via `expo-secure-store` (iOS Keychain and Android Keystore).
   - Plaintext `AsyncStorage` is strictly prohibited for credentials.

3. **Two-Sided OTP Verification Architecture:**
   - Customer orders display a 6-digit numeric PIN verbally shared at the door.
   - Backend APIs (`DriverService.ts`) strip the plaintext PIN from all staff job endpoints (`pickup_pin`, `delivery_pin`, `pickup_pin_hash`).
   - Drivers must enter the PIN through the mobile UI keypad; the backend hashes the submission, verifies it against the database, locks the order after 5 invalid attempts, and updates the status only upon server confirmation.

4. **Authoritative Stripe Payment Flow:**
   - The customer app initiates checkout via `/api/v1/payments/create-checkout-session` with deep link callback `laundelle-customer://payment`.
   - The mobile application never marks an order as paid based solely on client callback triggers; authoritative payment state is verified by the backend through Stripe sessions and webhooks.

---

## Environment Variables Configuration

Create a `.env` file in each app directory (`apps/mobile/customer/.env` and `apps/mobile/operations/.env`):

### Customer App (`apps/mobile/customer/.env`)
```bash
# Backend API Base URL
# For Android Emulator: http://10.0.2.2:4000
# For iOS Simulator: http://localhost:4000
# For Physical Device (LAN): http://<YOUR_LAN_IP>:4000
# For Production: https://api.laundelle.co.uk
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# Auth0 Configuration
EXPO_PUBLIC_AUTH0_DOMAIN=laundelle-dev.uk.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your_native_customer_client_id
EXPO_PUBLIC_AUTH0_AUDIENCE=https://api.laundelle.co.uk
```

### Operations App (`apps/mobile/operations/.env`)
```bash
# Backend API Base URL
EXPO_PUBLIC_API_URL=http://10.0.2.2:4000

# Auth0 Configuration
EXPO_PUBLIC_AUTH0_DOMAIN=laundelle-dev.uk.auth0.com
EXPO_PUBLIC_AUTH0_CLIENT_ID=your_native_operations_client_id
EXPO_PUBLIC_AUTH0_AUDIENCE=https://api.laundelle.co.uk
```

---

## Local Development & Testing Commands

### Running Locally
```bash
# Start Customer Mobile App (Metro bundler)
pnpm run dev:mobile:customer

# Start Operations Mobile App (Metro bundler)
pnpm run dev:mobile:operations

# Target specific platforms directly:
pnpm --filter=@laundelle/mobile-customer android
pnpm --filter=@laundelle/mobile-customer ios

pnpm --filter=@laundelle/mobile-operations android
pnpm --filter=@laundelle/mobile-operations ios
```

### Type Checking & Automated Workflow Tests
```bash
# Full Monorepo Type Check (14 packages)
pnpm run typecheck

# Customer App Automated Workflow Tests (7/7 passing)
pnpm --filter=@laundelle/mobile-customer test

# Operations App Automated Workflow Tests (13/13 passing)
pnpm --filter=@laundelle/mobile-operations test
```

---

## EAS Build & Release Instructions

Both applications include preconfigured `eas.json` profiles:

### 1. Development Build (Debug APK / Simulator Build)
```bash
cd apps/mobile/customer
eas build --profile development --platform android
eas build --profile development --platform ios

cd ../operations
eas build --profile development --platform android
eas build --profile development --platform ios
```

### 2. Preview Build (Internal Testing APK / Ad-Hoc iOS)
```bash
eas build --profile preview --platform android
eas build --profile preview --platform ios
```

### 3. Production Release (Google Play AAB / App Store IPA)
```bash
eas build --profile production --platform android
eas build --profile production --platform ios
```

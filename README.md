# Laundelle — On-Demand Laundry & Dry Cleaning Platform

Production-ready Turborepo + pnpm monorepo architecture for the Laundelle laundry operating platform.

## Architecture

```text
laundelle/
│
├── apps/
│   ├── customer/              # Customer frontend (customer.laundelle.co.uk)
│   ├── operations/            # Operations portal: Driver + Processor + Manager (ops.laundelle.co.uk)
│   ├── admin/                 # Admin frontend (admin.laundelle.co.uk)
│   └── backend/               # Centralized backend API (api.laundelle.co.uk)
│
├── packages/
│   ├── ui/                    # Generic design-system UI components
│   ├── types/                 # Domain, entity & administrative TypeScript types
│   ├── api-client/            # Typed API client & legacy dbFetch compatibility layer
│   ├── auth/                  # Shared auth helpers, JWT payload & permissions
│   ├── utils/                 # Pure utilities (postcodes, currency, dates, compression)
│   ├── validations/           # Zod validation schemas & scheduling rules
│   └── config/                # Platform constants, SLA thresholds & API endpoints
│
├── package.json
├── pnpm-workspace.yaml
├── turbo.json
├── tsconfig.json
└── README.md
```

## Applications & Ports

| Application | Local Port | Production Host | Description |
| :--- | :--- | :--- | :--- |
| **Customer** | `http://localhost:3000` | `customer.laundelle.co.uk` | Order booking, tracking, address management, subscriptions, checkout |
| **Operations** | `http://localhost:3001` | `ops.laundelle.co.uk` | Driver (`/driver`), Processor (`/processor`), Manager (`/manager`) workflows |
| **Admin** | `http://localhost:3002` | `admin.laundelle.co.uk` | Platform administration, staff, plants, fleet, audit trails, metrics |
| **Backend** | `http://localhost:4000` | `api.laundelle.co.uk` | Centralized Next.js API server, MongoDB connection, Stripe/WhatsApp webhooks |

## Shared Packages

- `@laundelle/types`: Canonical entity models (`Order`, `User`, `Plant`, `DriverTask`, `AdminUser`, etc.)
- `@laundelle/config`: Service configurations, SLA matrices, and constants
- `@laundelle/utils`: Formatters, postcode validator, image compressors, route helpers
- `@laundelle/validations`: Zod validation schemas for requests, schedules, and operations
- `@laundelle/auth`: Session storage management, role check helpers, permission matrix
- `@laundelle/ui`: Common UI primitives (`Button`, `Input`, `Modal`, `Badge`, `Card`, `Toast`, etc.)
- `@laundelle/api-client`: Typed `api` SDK and backward-compatible `dbFetch...` adapters

## Getting Started

### Prerequisites

- Node.js >= 18.0.0
- pnpm >= 9.0.0 (pnpm v12 supported)

### Install Dependencies

```bash
pnpm install
```

### Environment Setup

Each application has its own `.env.example` file:
- `apps/customer/.env.example` -> `apps/customer/.env.local`
- `apps/operations/.env.example` -> `apps/operations/.env.local`
- `apps/admin/.env.example` -> `apps/admin/.env.local`
- `apps/backend/.env.example` -> `apps/backend/.env.local`

Set `NEXT_PUBLIC_API_URL=http://localhost:4000` in the frontend apps.

### Development Commands

```bash
# Run all services concurrently
pnpm dev

# Run individual apps
pnpm dev:customer     # http://localhost:3000
pnpm dev:operations   # http://localhost:3001
pnpm dev:admin        # http://localhost:3002
pnpm dev:backend      # http://localhost:4000

# Monorepo build, lint & typecheck
pnpm build
pnpm lint
pnpm typecheck
```

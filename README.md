# FleetMind AI — Autonomous Commercial Fleet Management Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF.svg)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC.svg)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend%20%26%20RLS-3ECF8E.svg)](https://supabase.com/)

**Team:** Fleet Innovators  
**Repository:** [https://github.com/rojajasti-stack/FleetMind](https://github.com/rojajasti-stack/FleetMind)

---

## Overview

**FleetMind AI** is an enterprise-grade commercial fleet management platform built for transport operators, bus fleets, logistics networks, and fleet managers. It combines vehicle telemetry, driver scheduling, maintenance logging, financial tracking (EMI, fuel, and expenses), and role-based access control with real-time operations dashboards.

---

## Architecture & Technology Stack

* **Frontend Framework:** React 19 + TypeScript + Vite 6
* **Styling & UI:** Tailwind CSS + Lucide Icons + Recharts + Leaflet
* **Backend Platform:** Supabase (PostgreSQL 15+, Auth, Storage, Edge Functions)
* **Security & Isolation:** PostgreSQL Row Level Security (RLS) + Role-Based Access Control (RBAC)
* **Resilience:** Dual-mode architecture (Seamless live Supabase cloud connectivity with local offline fallback)

---

## Core Capabilities

1. **Vehicle Registry & Fleet Health:** Track bus configurations, mileage, chassis numbers, fuel types, and active operational statuses.
2. **Driver Operations & Scheduling:** Driver duty status, contact vaults, license compliance, and safety scores.
3. **Trip & Route Management:** Live route monitoring, passenger load factors, fare revenue, and schedule adherence.
4. **Telematics & GPS Tracking:** Real-time coordinates, speed gauges, trip history, and geofence alerts.
5. **Maintenance & Workshop Orders:** Scheduled service alerts, mechanic work orders, part replacements, and repair history.
6. **Financial Operations & EMI Ledger:** Fleet loan amortization schedules, verified payment processing, and fuel expense analytics.
7. **Document Vault (Supabase Storage):** Private encrypted storage for vehicle compliance documents, driver IDs, and fuel receipts with signed URL expiration.
8. **Serverless Edge Functions:**
   - `admin-manage-user`: Privileged account moderation with audit logging.
   - `emi-calculate-and-pay`: Double-entry accounting for loan installments.
   - `telematics-webhook-ingest`: IoT GPS telemetry ingestion with HMAC-SHA256 signature verification.
   - `ai-fleet-insights`: Server-side fleet diagnostics and optimization recommendations.
9. **Security & Auditing:** Comprehensive audit trails logging user activity, role modifications, and login attempts.
10. **Disaster Recovery & Automated Backups:** Automated daily backups and point-in-time recovery specifications.

---

## Getting Started

### Prerequisites

* [Node.js](https://nodejs.org/) (v18 or higher)
* [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)

### Installation

```bash
# Clone the repository
git clone https://github.com/rojajasti-stack/FleetMind.git
cd FleetMind

# Install dependencies
npm install
```

### Environment Configuration

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-actual-anon-publishable-key
```

> **Note:** If left unconfigured, FleetMind automatically runs in offline demo mode with mock data.

### Running the Application

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## Database Migrations

Database migrations are located in `supabase/migrations/`:

1. `20261115120000_create_fleetmind_schema.sql` — 16 core PostgreSQL tables, functions, and base RLS policies.
2. `20261115130000_create_storage_buckets_and_policies.sql` — Private storage buckets and file access policies.
3. `20261115140000_production_hardening_and_indexes.sql` — Performance B-Tree indexes and hardened views.

---

## License

This project is licensed under the MIT License. Developed by **Fleet Innovators**.

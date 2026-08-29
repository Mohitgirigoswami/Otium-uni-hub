# Architecture Decision Records (ADR) Log — Otium Uni Hub

> ⚠️ **AI Agent Directive:**  
> *Update this file whenever a major architectural change, new database model, schema migration, or new external service integration is implemented in this codebase.*

---

## ADR-001: Next.js 14 App Router & React Server Components
* **Status:** Accepted
* **Context:** We needed a unified full-stack React framework capable of server-side rendering, API routing, server actions, and mobile-responsive viewport scaling.
* **Decision:** Adopted Next.js 14 App Router with React Server Components (RSC) and `"use server"` actions instead of traditional REST API routes.
* **Consequences:**
  * Direct server actions eliminate boilerplate API route definitions.
  * Server actions must maintain strict typing returning `{ success: boolean, data?: any, error?: string }`.
  * Dynamic search param components must be encapsulated inside `<Suspense>` boundaries.

---

## ADR-002: PostgreSQL via Supabase & Prisma ORM
* **Status:** Accepted
* **Context:** Campus operations require relational integrity, transactions, foreign key constraints (e.g. users, colleges, orders, gigs), and connection pooling for serverless deployments.
* **Decision:** Standardized on PostgreSQL hosted on Supabase, connected via Prisma ORM using PgBouncer pooler (`DATABASE_URL`) for runtime queries and direct port 5432 (`DIRECT_URL`) for migrations.
* **Consequences:**
  * Financial calculations (print pricing, gig bounties, platform fees) are strictly stored in integer **Paise** to eliminate floating-point rounding errors.
  * Atomic operations use `prisma.$transaction`.

---

## ADR-003: Direct Client-to-Cloud Uploads (Google Drive & Cloudinary)
* **Status:** Accepted
* **Context:** Serverless hosts (e.g., Vercel) impose a strict 4.5MB request payload limit. Large student PDFs (10MB–50MB) and multi-image posts cause serverless function timeouts and payload rejections.
* **Decision:**
  1. **Documents/PDFs -> Google Drive v3 Resumable Upload:** The server generates a signed Resumable Session URI using Google Service Account JWT credentials. The client streams the binary PDF directly to Google Drive, obtains the file ID, and applies public reader permissions.
  2. **Images/Media -> Cloudinary Direct Upload:** Client-side unsigned direct uploads for profiles and incognito memes.
* **Consequences:**
  * Zero serverless bandwidth or memory consumption during file uploads.
  * Service Account must be shared as **Editor** on the target Google Drive parent folder or fallback to root drive.

---

## ADR-004: Campus-Level Feature Flags (`CampusService`)
* **Status:** Accepted
* **Context:** Operational rollout happens campus by campus. Different universities have varying operational capabilities (e.g., some have active student print operators, while others only use the Incognito Wall or Marketplace).
* **Decision:** Introduced the `CampusService` database model with a composite unique constraint `@@unique([campusId, serviceKey])`.
* **Consequences:**
  * Allows Super Admins to dynamically enable or pause individual modules (`PRINT_STATION`, `INCOGNITO_WALL`, `MARKETPLACE`, `CAB_SPLIT`) per campus without code redeployments.
  * Protected via `<ClientServiceGuard />` and server-level action validation.

---

## ADR-005: Role-Based Campus Segregation
* **Status:** Accepted
* **Context:** Print managers and campus moderators from one university should never see or manage orders or sensitive data from another university.
* **Decision:**
  * `SUPER_ADMIN` has global multi-campus oversight.
  * `PRINT_MANAGER` is scoped strictly to orders matching their `collegeId`.
  * `getAllPrintOrdersAdmin` automatically applies `where: { collegeId: user.collegeId }` for non-super admins.

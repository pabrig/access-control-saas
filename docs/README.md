# Multi-Tenant Access Control System (SaaS)

## Project Description
A SaaS platform for managing entries and exits in gated communities and real estate complexes. It allows property owners to manage guest invitations via QR codes and security personnel to log physical movements through a high-performance web interface.

## Core Tech Stack
* **Language:** Strict TypeScript throughout the entire stack.
* **Backend:** Node.js (Express/NestJS or Fastify).
* **Frontend (Admin/Owners):** React (Next.js recommended for SSR/SEO).
* **Frontend (Security):** React (Vite/PWA, optimized for speed and scanner input).
* **Database:** PostgreSQL.
* **ORM:** Prisma ORM.
* **Infrastructure:** Monorepo architecture (Turborepo).

## Monorepo Structure
```text
/
├── apps/
│   ├── api/          # Node.js Backend
│   ├── admin-web/    # React/Next.js panel for Superadmin, Admin, and Owners
│   └── gate-web/     # Lightweight React/Vite UI for security guards
├── packages/
│   ├── db/           # Prisma schema and exported client
│   └── ui/           # Shared UI components (Tailwind, Radix, etc.)
└── docs/             # Architecture and business logic documentation
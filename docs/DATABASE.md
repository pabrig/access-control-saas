# Data Model (PostgreSQL + Prisma)

## Hierarchy of Main Entities
1.  **Complex:** Optional grouping of neighborhoods (Master Plan).
2.  **Neighborhood:** Primary tenant. Can belong to a Complex or be independent.
3.  **Gate:** Physical control point linked to a Neighborhood or a Complex.
4.  **Property:** Linked to a Neighborhood.

## Prisma Schema (Base for AI agents)
*(Include the Prisma code structure here)*

## Critical Indexes
* Exact search by `qr_token` in the `Invitation` table.
* Date range filters `valid_from` and `valid_to`.
* Foreign keys indexed to ensure Multi-tenancy performance (`neighborhood_id`, `complex_id`).
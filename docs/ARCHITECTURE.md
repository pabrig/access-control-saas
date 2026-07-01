```markdown
# System Architecture

## Multi-Tenant Pattern
The system uses a **Shared database with row-level isolation (Logical RLS)**. 
All queries from an authenticated user must be scoped by `tenant_id` (mapped to `complex_id` or `neighborhood_id`).

## Authentication and Authorization
* **Authentication:** JWT (JSON Web Tokens) based.
* **Authorization:** Scoped Role-Based Access Control (Scoped RBAC). Users have roles restricted to a specific node in the hierarchy (e.g., Administrator only for "Neighborhood A").

## Frontend - Backend Communication
* The API exposes RESTful endpoints (or GraphQL).
* The security client (`gate-web`) requires minimal latency (<200ms). Configurations must be pre-loaded, and connections optimized. The QR reader simulates physical keyboard input followed by "Enter".
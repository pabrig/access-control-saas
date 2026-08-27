# Core Business Logic

## 1. Scoped RBAC Rules

- **SUPERADMIN:** Global access to all tables and tenants.
- **COMPLEX_ADMIN:** Management restricted to `complex_id` and transitively to child `neighborhood_ids`.
- **NEIGHBORHOOD_ADMIN:** Management restricted exclusively to a `neighborhood_id`.
- **SECURITY:** Read/Validation access restricted to the `gate_id` assigned to their shift.
- **OWNER:** May update (not create or delete) their own `property`. Full CRUD on invitations strictly limited to their `property_id`. Cannot move the lot to another neighborhood.

## 2. QR Generation and Validation Flow

- **QR Token:** UUID stored on `invitations.qr_token`, unique per invitation.
- **Scanning (Validation):** `POST /access/validate` on `apps/api` receives `{ qrToken, gateId }` with the guard JWT. Writes use the Supabase service role.

### 2.1. Double Barrier Logic

If the complex has a main barrier and internal neighborhood barriers, the invitation state flow is:

1.  **Arrival at Barrier 1 (MAIN_COMPLEX):**
    - Action: Create `AccessLog` (IN_COMPLEX). QR remains active.
2.  **Arrival at Barrier 2 (INTERNAL_NEIGHBORHOOD):**
    - Action: Create `AccessLog` (IN_PROPERTY).
    - Mutation: If the invitation is `SINGLE_USE`, mark as invalid.

## 3. Vehicles and passengers

Guests usually arrive by car. An invitation can list **one or more vehicles**, each with **one or more passengers**.

- **Plates:** only the two Argentine formats — old `ABC 123` (`AR_OLD`) and Mercosur `AB 123 CD` (`AR_MERCOSUR`). Stored normalized (`ABC123` / `AB123CD`) plus a display form.
- **Owner:** loads cars and passengers when creating the pass.
- **Security:** `POST /access/validate` returns the cars and passengers with the scan result. Optional `plate` in the body: if present and the pass has cars, it must match one of them (`UNKNOWN_PLATE` otherwise). The matching `vehicle_id` is stored on `access_logs`.

## 4. Special Invitation Types

- **PROVIDER:** Invitations can have additional restrictions based on weekdays (`allowed_days`). The backend must validate the current day against this array before authorizing access.

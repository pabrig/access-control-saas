# Core Business Logic

## 1. Scoped RBAC Rules

- **SUPERADMIN:** Global access to all tables and tenants.
- **COMPLEX_ADMIN:** Management restricted to `complex_id` and transitively to child `neighborhood_ids`. May create multiple neighborhoods inside that complex.
- **NEIGHBORHOOD_ADMIN:** Management restricted exclusively to a `neighborhood_id`. Cannot create or delete neighborhoods.
- **SECURITY:** Read/Validation access restricted to the `gate_id` assigned to their shift.
- **OWNER:** May update (not create or delete) their own `property`. Full CRUD on invitations strictly limited to their `property_id`. Cannot move the lot to another neighborhood.

## 2. QR Generation and Validation Flow

- **Owner (mobile):** Creates a `DRAFT` invitation (lot, validity window, optional single-use) and shares `/i/{share_token}` by WhatsApp or email. No barrier QR yet.
- **Guest:** Opens the public link (no login), fills name / DNI / cars, then `claim_invite` mints `qr_token` and sets `READY`.
- **Walk-up:** Owner can create a `READY` pass immediately with a guest name if the visitor is already at the gate.
- **Owner resident:** Security can register owner entry without a pass. Lookup by name, email, DNI or lot; scan a permanent resident QR (`resident_credentials.qr_token`). Validate tries invitations first, then resident credentials. No expiry or single-use.
- **Resident credential:** Each OWNER gets a permanent QR per lot, optional vehicles, and can invite co-owners via `/r/{share_token}` (WhatsApp) or pre-filled DNI.
- **Scanning:** `POST /access/validate` looks up `qr_token` for guests, or `profileId` + `propertyId` for owners. Drafts are not scannable (`NOT_READY`).

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
- **Owner:** Sends a share link. The guest loads cars and passengers when they claim the pass. Walk-up passes can skip vehicles.
- **Security:** `POST /access/validate` returns the cars and passengers with the scan result. Optional `plate` in the body: if present and the pass has cars, it must match one of them (`UNKNOWN_PLATE` otherwise). The matching `vehicle_id` is stored on `access_logs`.

## 4. Special Invitation Types

- **PROVIDER:** Invitations can have additional restrictions based on weekdays (`allowed_days`). The backend must validate the current day against this array before authorizing access.

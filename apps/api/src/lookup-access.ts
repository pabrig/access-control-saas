import { z } from "zod";
import { gateMatchesInvitation } from "./access-rules.js";
import { assertGateOperator } from "./gate-auth.js";
import { parsePlate } from "./plates.js";
import { serviceClient } from "./supabase.js";

const bodySchema = z.object({
  gateId: z.string().uuid(),
  query: z.string().trim().min(2).max(80),
});

export type LookupMatch = {
  qrToken: string;
  guestName: string;
  guestDni: string | null;
  plateDisplay: string | null;
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
};

export type LookupResult =
  | { ok: true; matches: LookupMatch[] }
  | { ok: false; code: string; message: string };

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type VehicleRow = {
  plate_display: string;
  plate_normalized: string;
  invitation_passengers: Array<{ full_name: string; dni: string | null }>;
};

function asOne<T extends object>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as T;
}

function compact(value: string) {
  return value.toLowerCase().replace(/[\s-]/g, "");
}

export async function lookupAccess(
  userId: string,
  rawBody: unknown,
): Promise<LookupResult> {
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "query and gateId are required",
    };
  }

  const auth = await assertGateOperator(userId, parsed.data.gateId);
  if (!auth.ok) {
    return auth;
  }

  const { data: gate, error: gateError } = await serviceClient
    .from("gates")
    .select("id, type, complex_id, neighborhood_id")
    .eq("id", parsed.data.gateId)
    .maybeSingle();

  if (gateError) {
    throw gateError;
  }

  if (!gate) {
    return { ok: false, code: "WRONG_GATE", message: "Gate not found" };
  }

  const query = parsed.data.query.trim();
  const plate = parsePlate(query);
  const needle = compact(plate?.normalized ?? query);

  let invitationQuery = serviceClient
    .from("invitations")
    .select(
      "qr_token, guest_name, guest_dni, neighborhood_id, properties(lot_number, street_name), neighborhoods(name, complex_id), invitation_vehicles(plate_display, plate_normalized, invitation_passengers(full_name, dni))",
    )
    .eq("status", "READY")
    .eq("is_revoked", false)
    .not("qr_token", "is", null)
    .order("valid_to", { ascending: false })
    .limit(80);

  if (UUID.test(query)) {
    invitationQuery = invitationQuery.eq("qr_token", query.toLowerCase());
  }

  const { data, error } = await invitationQuery;

  if (error) {
    throw error;
  }

  const matches: LookupMatch[] = [];

  for (const row of data ?? []) {
    if (!row.qr_token) {
      continue;
    }

    const neighborhood = asOne<{ name: string; complex_id: string | null }>(
      row.neighborhoods,
    );
    const property = asOne<{
      lot_number: string;
      street_name: string | null;
    }>(row.properties);

    if (
      !gateMatchesInvitation({
        gateType: gate.type,
        gateComplexId: gate.complex_id,
        gateNeighborhoodId: gate.neighborhood_id,
        invitationNeighborhoodId: row.neighborhood_id,
        invitationComplexId: neighborhood?.complex_id ?? null,
      })
    ) {
      continue;
    }

    const vehicles = (row.invitation_vehicles ?? []) as VehicleRow[];
    const terms = [
      row.qr_token,
      row.guest_name,
      row.guest_dni,
      property?.lot_number,
      ...vehicles.flatMap((vehicle) => [
        vehicle.plate_display,
        vehicle.plate_normalized,
        ...vehicle.invitation_passengers.flatMap((passenger) => [
          passenger.full_name,
          passenger.dni,
        ]),
      ]),
    ]
      .filter(Boolean)
      .map((value) => compact(String(value)));

    if (!UUID.test(query) && !terms.some((term) => term.includes(needle))) {
      continue;
    }

    const matchedVehicle =
      vehicles.find(
        (vehicle) => plate && vehicle.plate_normalized === plate.normalized,
      ) ??
      vehicles.find((vehicle) =>
        compact(vehicle.plate_normalized).includes(needle),
      ) ??
      vehicles[0];

    matches.push({
      qrToken: row.qr_token,
      guestName: row.guest_name ?? "Visita",
      guestDni: row.guest_dni,
      plateDisplay: matchedVehicle?.plate_display ?? null,
      lotNumber: property?.lot_number ?? "",
      streetName: property?.street_name ?? null,
      neighborhoodName: neighborhood?.name ?? "Barrio",
    });

    if (matches.length >= 8) {
      break;
    }
  }

  return { ok: true, matches };
}

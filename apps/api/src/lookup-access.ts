import { z } from "zod";
import { gateMatchesInvitation, gateMatchesProperty } from "./access-rules.js";
import { assertGateOperator } from "./gate-auth.js";
import { parsePlate } from "./plates.js";
import { serviceClient } from "./supabase.js";

const bodySchema = z.object({
  gateId: z.string().uuid(),
  query: z.string().trim().min(2).max(80),
});

export type InvitationLookupMatch = {
  kind: "invitation";
  qrToken: string;
  guestName: string;
  guestDni: string | null;
  plateDisplay: string | null;
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
};

export type OwnerLookupMatch = {
  kind: "owner";
  qrToken: string;
  profileId: string;
  propertyId: string;
  ownerName: string;
  email: string | null;
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
};

export type LookupMatch = InvitationLookupMatch | OwnerLookupMatch;

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

function ownerDisplayName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

async function lookupResidentQr(
  gate: {
    type: "MAIN_COMPLEX" | "INTERNAL_NEIGHBORHOOD";
    complex_id: string | null;
    neighborhood_id: string | null;
  },
  qrToken: string,
): Promise<OwnerLookupMatch | null> {
  const { data, error } = await serviceClient
    .from("resident_credentials")
    .select(
      "qr_token, profile_id, property_id, is_revoked, profiles!inner(first_name, last_name, email, is_active), properties!inner(lot_number, street_name, neighborhood_id, neighborhoods(name, complex_id))",
    )
    .eq("qr_token", qrToken)
    .eq("is_revoked", false)
    .eq("profiles.is_active", true)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  const profile = asOne<{
    first_name: string;
    last_name: string;
    email: string | null;
  }>(data.profiles);
  const property = asOne<{
    lot_number: string;
    street_name: string | null;
    neighborhood_id: string;
    neighborhoods: { name: string; complex_id: string | null } | Array<{
      name: string;
      complex_id: string | null;
    }>;
  }>(data.properties);

  if (!profile || !property) {
    return null;
  }

  const neighborhood = asOne<{ name: string; complex_id: string | null }>(
    property.neighborhoods,
  );

  if (
    !gateMatchesProperty({
      gateType: gate.type,
      gateComplexId: gate.complex_id,
      gateNeighborhoodId: gate.neighborhood_id,
      propertyNeighborhoodId: property.neighborhood_id,
      propertyComplexId: neighborhood?.complex_id ?? null,
    })
  ) {
    return null;
  }

  return {
    kind: "owner",
    qrToken: data.qr_token,
    profileId: data.profile_id,
    propertyId: data.property_id,
    ownerName: ownerDisplayName(profile.first_name, profile.last_name),
    email: profile.email,
    lotNumber: property.lot_number,
    streetName: property.street_name,
    neighborhoodName: neighborhood?.name ?? "Barrio",
  };
}

async function lookupOwners(
  gate: {
    type: "MAIN_COMPLEX" | "INTERNAL_NEIGHBORHOOD";
    complex_id: string | null;
    neighborhood_id: string | null;
  },
  query: string,
  needle: string,
  limit: number,
): Promise<OwnerLookupMatch[]> {
  if (UUID.test(query)) {
    return [];
  }

  const { data, error } = await serviceClient
    .from("resident_credentials")
    .select(
      "qr_token, profile_id, property_id, profiles!inner(first_name, last_name, email, dni, is_active), properties!inner(lot_number, street_name, neighborhood_id, neighborhoods(name, complex_id))",
    )
    .eq("is_revoked", false)
    .eq("profiles.is_active", true)
    .limit(120);

  if (error) {
    throw error;
  }

  const matches: OwnerLookupMatch[] = [];

  for (const row of data ?? []) {
    const profile = asOne<{
      first_name: string;
      last_name: string;
      email: string | null;
      dni: string | null;
    }>(row.profiles);
    const property = asOne<{
      lot_number: string;
      street_name: string | null;
      neighborhood_id: string;
      neighborhoods: { name: string; complex_id: string | null } | Array<{
        name: string;
        complex_id: string | null;
      }>;
    }>(row.properties);

    if (!profile || !property) {
      continue;
    }

    const neighborhood = asOne<{ name: string; complex_id: string | null }>(
      property.neighborhoods,
    );

    if (
      !gateMatchesProperty({
        gateType: gate.type,
        gateComplexId: gate.complex_id,
        gateNeighborhoodId: gate.neighborhood_id,
        propertyNeighborhoodId: property.neighborhood_id,
        propertyComplexId: neighborhood?.complex_id ?? null,
      })
    ) {
      continue;
    }

    const ownerName = ownerDisplayName(profile.first_name, profile.last_name);
    const terms = [
      ownerName,
      profile.first_name,
      profile.last_name,
      profile.email,
      profile.dni,
      property.lot_number,
      property.street_name,
    ]
      .filter(Boolean)
      .map((value) => compact(String(value)));

    if (!terms.some((term) => term.includes(needle))) {
      continue;
    }

    matches.push({
      kind: "owner",
      qrToken: row.qr_token,
      profileId: row.profile_id,
      propertyId: row.property_id,
      ownerName,
      email: profile.email,
      lotNumber: property.lot_number,
      streetName: property.street_name,
      neighborhoodName: neighborhood?.name ?? "Barrio",
    });

    if (matches.length >= limit) {
      break;
    }
  }

  return matches;
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

  if (UUID.test(query)) {
    const residentMatch = await lookupResidentQr(gate, query.toLowerCase());
    if (residentMatch) {
      return { ok: true, matches: [residentMatch] };
    }
  }

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
      kind: "invitation",
      qrToken: row.qr_token,
      guestName: row.guest_name ?? "Invitado",
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

  if (matches.length < 8) {
    const ownerMatches = await lookupOwners(
      gate,
      query,
      needle,
      8 - matches.length,
    );
    matches.push(...ownerMatches);
  }

  return { ok: true, matches };
}

import { z } from "zod";
import { gateMatchesProperty } from "./access-rules.js";
import { nextAccessAction, type AccessStatus } from "./access-state.js";
import { assertGateOperator } from "./gate-auth.js";
import { matchInvitationPlate, parsePlate } from "./plates.js";
import { serviceClient } from "./supabase.js";

export type ResidentVehicle = {
  plateDisplay: string;
  plateFormat: string;
  color: string | null;
};

export type ValidateResidentErrorCode =
  | "INVALID_BODY"
  | "NO_SHIFT"
  | "INACTIVE_USER"
  | "NOT_OWNER"
  | "INACTIVE_OWNER"
  | "REVOKED"
  | "WRONG_GATE"
  | "INVALID_TRANSITION"
  | "INVALID_PLATE"
  | "UNKNOWN_PLATE";

export type ValidateResidentResult =
  | {
      ok: true;
      kind: "owner";
      actionType: AccessStatus;
      owner: {
        profileId: string;
        propertyId: string;
        firstName: string;
        lastName: string;
        lotNumber: string;
        streetName: string | null;
        neighborhoodName: string;
      };
      vehicles: ResidentVehicle[];
      matchedPlate: string | null;
      committed: boolean;
    }
  | { ok: false; code: ValidateResidentErrorCode; message: string };

function asOne<T extends object>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as T;
}

type CredentialRow = {
  id: string;
  profile_id: string;
  property_id: string;
  qr_token: string;
  is_revoked: boolean;
};

export async function validateResidentEntry(
  userId: string,
  input: {
    gateId: string;
    profileId: string;
    propertyId: string;
    plate?: string;
    commit?: boolean;
    credential?: CredentialRow | null;
  },
): Promise<ValidateResidentResult> {
  const { gateId, profileId, propertyId, plate } = input;
  const commit = input.commit !== false;

  const auth = await assertGateOperator(userId, gateId);
  if (!auth.ok) {
    return auth;
  }

  let credential = input.credential ?? null;
  if (!credential) {
    const { data, error } = await serviceClient
      .from("resident_credentials")
      .select("id, profile_id, property_id, qr_token, is_revoked")
      .eq("profile_id", profileId)
      .eq("property_id", propertyId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    credential = data;
  }

  if (!credential) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "Resident credential not found",
    };
  }

  if (
    credential.profile_id !== profileId ||
    credential.property_id !== propertyId
  ) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "Credential does not match resident",
    };
  }

  if (credential.is_revoked) {
    return {
      ok: false,
      code: "REVOKED",
      message: "Resident credential was revoked",
    };
  }

  const { data: roleRow, error: roleError } = await serviceClient
    .from("user_roles")
    .select("user_id")
    .eq("user_id", profileId)
    .eq("role", "OWNER")
    .eq("property_id", propertyId)
    .maybeSingle();

  if (roleError) {
    throw roleError;
  }

  if (!roleRow) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "This person is not an owner of the selected lot",
    };
  }

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, first_name, last_name, is_active")
    .eq("id", profileId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "Resident profile not found",
    };
  }

  if (!profile.is_active) {
    return {
      ok: false,
      code: "INACTIVE_OWNER",
      message: "This owner account is inactive",
    };
  }

  const { data: vehicleRows, error: vehiclesError } = await serviceClient
    .from("resident_vehicles")
    .select("id, plate_normalized, plate_display, plate_format, color")
    .eq("credential_id", credential.id)
    .order("created_at", { ascending: true });

  if (vehiclesError) {
    throw vehiclesError;
  }

  const plateDecision = matchInvitationPlate(
    (vehicleRows ?? []).map((row) => ({
      plateNormalized: row.plate_normalized,
    })),
    plate,
  );

  if (plateDecision === "invalid") {
    return {
      ok: false,
      code: "INVALID_PLATE",
      message: "Plate must be AAA 000 or AA000AA",
    };
  }

  if (plateDecision === "unknown") {
    return {
      ok: false,
      code: "UNKNOWN_PLATE",
      message: "This plate is not on the resident credential",
    };
  }

  const matchedPlate =
    plateDecision === "match"
      ? (parsePlate(plate ?? "")?.display ?? null)
      : null;
  const matchedVehicleId =
    plateDecision === "match" && plate
      ? ((vehicleRows ?? []).find(
          (row) => row.plate_normalized === parsePlate(plate)?.normalized,
        )?.id ?? null)
      : null;

  const vehicles: ResidentVehicle[] = (vehicleRows ?? []).map((row) => ({
    plateDisplay: row.plate_display,
    plateFormat: row.plate_format,
    color: row.color,
  }));

  const { data: property, error: propertyError } = await serviceClient
    .from("properties")
    .select(
      "id, lot_number, street_name, neighborhood_id, neighborhoods(name, complex_id)",
    )
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError) {
    throw propertyError;
  }

  if (!property) {
    return {
      ok: false,
      code: "NOT_OWNER",
      message: "Lot not found",
    };
  }

  const neighborhood = asOne<{ name: string; complex_id: string | null }>(
    property.neighborhoods,
  );

  const { data: gate, error: gateError } = await serviceClient
    .from("gates")
    .select("id, type, complex_id, neighborhood_id")
    .eq("id", gateId)
    .maybeSingle();

  if (gateError) {
    throw gateError;
  }

  if (!gate) {
    return { ok: false, code: "WRONG_GATE", message: "Gate not found" };
  }

  if (
    !gateMatchesProperty({
      gateType: gate.type,
      gateComplexId: gate.complex_id,
      gateNeighborhoodId: gate.neighborhood_id,
      propertyNeighborhoodId: property.neighborhood_id,
      propertyComplexId: neighborhood?.complex_id ?? null,
    })
  ) {
    return {
      ok: false,
      code: "WRONG_GATE",
      message: "This resident is not valid at this gate",
    };
  }

  const { data: lastLogs, error: logError } = await serviceClient
    .from("access_logs")
    .select("action_type")
    .eq("profile_id", profileId)
    .eq("property_id", propertyId)
    .order("timestamp", { ascending: false })
    .limit(1);

  if (logError) {
    throw logError;
  }

  const lastStatus = lastLogs?.[0]?.action_type ?? null;
  const actionType = nextAccessAction(gate.type, lastStatus);

  if (!actionType) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: "This scan is not valid for the current resident state",
    };
  }

  if (commit) {
    const { error: insertError } = await serviceClient
      .from("access_logs")
      .insert({
        profile_id: profileId,
        property_id: propertyId,
        gate_id: gateId,
        security_user_id: userId,
        action_type: actionType,
        resident_vehicle_id: matchedVehicleId,
      });

    if (insertError) {
      throw insertError;
    }
  }

  return {
    ok: true,
    kind: "owner",
    actionType,
    owner: {
      profileId,
      propertyId,
      firstName: profile.first_name,
      lastName: profile.last_name,
      lotNumber: property.lot_number,
      streetName: property.street_name,
      neighborhoodName: neighborhood?.name ?? "Barrio",
    },
    vehicles,
    matchedPlate,
    committed: commit,
  };
}

export async function validateResidentByQr(
  userId: string,
  rawBody: unknown,
): Promise<
  ValidateResidentResult | { ok: false; code: "INVALID_QR"; message: string }
> {
  const parsed = zParseQrBody(rawBody);
  if (!parsed.ok) {
    return parsed;
  }

  const { qrToken, gateId, plate, commit } = parsed.data;

  const { data: credential, error } = await serviceClient
    .from("resident_credentials")
    .select("id, profile_id, property_id, qr_token, is_revoked")
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!credential) {
    return { ok: false, code: "INVALID_QR", message: "Credential not found" };
  }

  return validateResidentEntry(userId, {
    gateId,
    profileId: credential.profile_id,
    propertyId: credential.property_id,
    plate,
    commit,
    credential,
  });
}

function zParseQrBody(rawBody: unknown) {
  const bodySchema = z.object({
    qrToken: z.string().uuid(),
    gateId: z.string().uuid(),
    plate: z.string().max(12).optional(),
    commit: z.boolean().optional(),
  });

  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false as const,
      code: "INVALID_BODY" as const,
      message: "qrToken and gateId must be UUIDs",
    };
  }

  return { ok: true as const, data: parsed.data };
}

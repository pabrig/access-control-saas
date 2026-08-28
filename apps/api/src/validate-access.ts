import { z } from "zod";
import {
  gateMatchesInvitation,
  invitationWindowError,
  shouldRevokeSingleUse,
} from "./access-rules.js";
import { nextAccessAction, type AccessStatus } from "./access-state.js";
import { assertGateOperator } from "./gate-auth.js";
import { matchInvitationPlate, parsePlate } from "./plates.js";
import { serviceClient } from "./supabase.js";

const bodySchema = z.object({
  qrToken: z.string().uuid(),
  gateId: z.string().uuid(),
  plate: z.string().max(12).optional(),
  commit: z.boolean().optional(),
});

export type ValidateErrorCode =
  | "INVALID_BODY"
  | "NO_SHIFT"
  | "INACTIVE_USER"
  | "INVALID_QR"
  | "REVOKED"
  | "NOT_YET_VALID"
  | "EXPIRED"
  | "WRONG_GATE"
  | "INVALID_TRANSITION"
  | "INVALID_PLATE"
  | "UNKNOWN_PLATE"
  | "NOT_READY";

export type InvitationVehicle = {
  plateDisplay: string;
  plateFormat: string;
  color: string | null;
  passengers: Array<{
    fullName: string;
    dni: string | null;
    isDriver: boolean;
  }>;
};

export type ValidateResult =
  | {
      ok: true;
      actionType: AccessStatus;
      invitation: {
        id: string;
        guestName: string;
        guestDni: string | null;
        propertyId: string;
        lotNumber: string;
        streetName: string | null;
        neighborhoodName: string;
      };
      vehicles: InvitationVehicle[];
      matchedPlate: string | null;
      committed: boolean;
    }
  | { ok: false; code: ValidateErrorCode; message: string };

export async function validateAccess(
  userId: string,
  rawBody: unknown,
): Promise<ValidateResult> {
  const parsed = bodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "qrToken and gateId must be UUIDs",
    };
  }

  const { qrToken, gateId, plate } = parsed.data;
  const commit = parsed.data.commit !== false;

  const auth = await assertGateOperator(userId, gateId);
  if (!auth.ok) {
    return auth;
  }

  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select(
      "id, guest_name, guest_dni, property_id, neighborhood_id, valid_from, valid_to, is_revoked, is_single_use, status, qr_token, properties(lot_number, street_name), neighborhoods(name)",
    )
    .eq("qr_token", qrToken)
    .maybeSingle();

  if (invitationError) {
    throw invitationError;
  }

  if (!invitation) {
    return { ok: false, code: "INVALID_QR", message: "Invitation not found" };
  }

  if (invitation.is_revoked) {
    return { ok: false, code: "REVOKED", message: "Invitation was revoked" };
  }

  if (invitation.status !== "READY" || !invitation.qr_token) {
    return {
      ok: false,
      code: "NOT_READY",
      message: "Guest has not completed this pass yet",
    };
  }

  const { data: vehicleRows, error: vehiclesError } = await serviceClient
    .from("invitation_vehicles")
    .select(
      "id, plate_normalized, plate_display, plate_format, color, invitation_passengers(full_name, dni, is_driver)",
    )
    .eq("invitation_id", invitation.id)
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
      message: "This plate is not on the invitation",
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

  const vehicles: InvitationVehicle[] = (vehicleRows ?? []).map((row) => ({
    plateDisplay: row.plate_display,
    plateFormat: row.plate_format,
    color: row.color,
    passengers: (row.invitation_passengers ?? []).map((passenger) => ({
      fullName: passenger.full_name,
      dni: passenger.dni,
      isDriver: passenger.is_driver,
    })),
  }));

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

  const { data: neighborhood, error: neighborhoodError } = await serviceClient
    .from("neighborhoods")
    .select("complex_id")
    .eq("id", invitation.neighborhood_id)
    .maybeSingle();

  if (neighborhoodError) {
    throw neighborhoodError;
  }

  const invitationComplexId = neighborhood?.complex_id ?? null;

  if (
    !gateMatchesInvitation({
      gateType: gate.type,
      gateComplexId: gate.complex_id,
      gateNeighborhoodId: gate.neighborhood_id,
      invitationNeighborhoodId: invitation.neighborhood_id,
      invitationComplexId,
    })
  ) {
    return {
      ok: false,
      code: "WRONG_GATE",
      message: "This QR is not valid at this gate",
    };
  }

  const { data: lastLogs, error: logError } = await serviceClient
    .from("access_logs")
    .select("action_type")
    .eq("invitation_id", invitation.id)
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
      message: "This scan is not valid for the current invitation state",
    };
  }

  const windowError = invitationWindowError(
    Date.now(),
    new Date(invitation.valid_from).getTime(),
    new Date(invitation.valid_to).getTime(),
    actionType,
  );

  if (windowError === "NOT_YET_VALID") {
    return {
      ok: false,
      code: "NOT_YET_VALID",
      message: "Invitation is not valid yet",
    };
  }

  if (windowError === "EXPIRED") {
    return { ok: false, code: "EXPIRED", message: "Invitation has expired" };
  }

  if (commit) {
    const { error: insertError } = await serviceClient
      .from("access_logs")
      .insert({
        invitation_id: invitation.id,
        gate_id: gateId,
        security_user_id: userId,
        action_type: actionType,
        vehicle_id: matchedVehicleId,
      });

    if (insertError) {
      throw insertError;
    }

    if (shouldRevokeSingleUse(invitation.is_single_use, actionType)) {
      const { error: revokeError } = await serviceClient
        .from("invitations")
        .update({ is_revoked: true })
        .eq("id", invitation.id);

      if (revokeError) {
        throw revokeError;
      }
    }
  }

  const property = Array.isArray(invitation.properties)
    ? invitation.properties[0]
    : invitation.properties;
  const neighborhoodName = Array.isArray(invitation.neighborhoods)
    ? invitation.neighborhoods[0]?.name
    : invitation.neighborhoods?.name;

  return {
    ok: true,
    actionType,
    invitation: {
      id: invitation.id,
      guestName: invitation.guest_name ?? "Invitado",
      guestDni: invitation.guest_dni,
      propertyId: invitation.property_id,
      lotNumber: property?.lot_number ?? "",
      streetName: property?.street_name ?? null,
      neighborhoodName: neighborhoodName ?? "Barrio",
    },
    vehicles,
    matchedPlate,
    committed: commit,
  };
}

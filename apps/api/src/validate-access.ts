import { z } from "zod";
import {
  gateMatchesInvitation,
  invitationWindowError,
  shouldRevokeSingleUse,
} from "./access-rules.js";
import { nextAccessAction, type AccessStatus } from "./access-state.js";
import { serviceClient } from "./supabase.js";

const bodySchema = z.object({
  qrToken: z.string().uuid(),
  gateId: z.string().uuid(),
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
  | "INVALID_TRANSITION";

export type ValidateResult =
  | {
      ok: true;
      actionType: AccessStatus;
      invitation: {
        id: string;
        guestName: string;
        propertyId: string;
      };
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

  const { qrToken, gateId } = parsed.data;

  const { data: profile, error: profileError } = await serviceClient
    .from("profiles")
    .select("id, is_active")
    .eq("id", userId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  if (!profile?.is_active) {
    return { ok: false, code: "INACTIVE_USER", message: "User is inactive" };
  }

  const { data: roles, error: rolesError } = await serviceClient
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);

  if (rolesError) {
    throw rolesError;
  }

  const isSuperadmin = roles?.some((row) => row.role === "SUPERADMIN") ?? false;
  const isSecurity = roles?.some((row) => row.role === "SECURITY") ?? false;

  if (!isSuperadmin && !isSecurity) {
    return {
      ok: false,
      code: "NO_SHIFT",
      message: "Only SECURITY can validate access",
    };
  }

  if (!isSuperadmin) {
    const { data: shift, error: shiftError } = await serviceClient
      .from("shifts")
      .select("id")
      .eq("user_id", userId)
      .eq("gate_id", gateId)
      .is("ended_at", null)
      .maybeSingle();

    if (shiftError) {
      throw shiftError;
    }

    if (!shift) {
      return {
        ok: false,
        code: "NO_SHIFT",
        message: "No active shift on this gate",
      };
    }
  }

  const { data: invitation, error: invitationError } = await serviceClient
    .from("invitations")
    .select(
      "id, guest_name, property_id, neighborhood_id, valid_from, valid_to, is_revoked, is_single_use",
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

  const { error: insertError } = await serviceClient
    .from("access_logs")
    .insert({
      invitation_id: invitation.id,
      gate_id: gateId,
      security_user_id: userId,
      action_type: actionType,
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

  return {
    ok: true,
    actionType,
    invitation: {
      id: invitation.id,
      guestName: invitation.guest_name,
      propertyId: invitation.property_id,
    },
  };
}

import { serviceClient } from "./supabase.js";

export type GateAuthError = {
  ok: false;
  code: "NO_SHIFT" | "INACTIVE_USER";
  message: string;
};

export async function assertGateOperator(
  userId: string,
  gateId: string,
): Promise<GateAuthError | { ok: true }> {
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

  return { ok: true };
}

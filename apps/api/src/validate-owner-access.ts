import { z } from "zod";
import {
  validateResidentByQr,
  validateResidentEntry,
  type ValidateResidentResult,
} from "./resident-access.js";

const ownerBodySchema = z.object({
  profileId: z.string().uuid(),
  propertyId: z.string().uuid(),
  gateId: z.string().uuid(),
  plate: z.string().max(12).optional(),
  commit: z.boolean().optional(),
});

export type ValidateOwnerErrorCode =
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

export type ValidateOwnerResult = ValidateResidentResult;

export async function validateOwnerAccess(
  userId: string,
  rawBody: unknown,
): Promise<ValidateOwnerResult> {
  const parsed = ownerBodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return {
      ok: false,
      code: "INVALID_BODY",
      message: "profileId, propertyId and gateId must be UUIDs",
    };
  }

  return validateResidentEntry(userId, parsed.data);
}

export { validateResidentByQr };

import type { Enums } from "@repo/db";

export type AccessStatus = Enums<"access_status">;
export type GateType = Enums<"gate_type">;

export function nextAccessAction(
  gateType: GateType,
  lastStatus: AccessStatus | null,
): AccessStatus | null {
  if (gateType === "MAIN_COMPLEX") {
    if (
      lastStatus === null ||
      lastStatus === "PENDING" ||
      lastStatus === "EXITED" ||
      lastStatus === "EXPIRED"
    ) {
      return "IN_COMPLEX";
    }
    if (lastStatus === "IN_COMPLEX" || lastStatus === "IN_PROPERTY") {
      return "EXITED";
    }
  }

  if (gateType === "INTERNAL_NEIGHBORHOOD") {
    if (lastStatus === "IN_COMPLEX") {
      return "IN_PROPERTY";
    }
    if (
      lastStatus === null ||
      lastStatus === "PENDING" ||
      lastStatus === "EXITED" ||
      lastStatus === "EXPIRED"
    ) {
      return "IN_PROPERTY";
    }
    if (lastStatus === "IN_PROPERTY") {
      return "EXITED";
    }
  }

  return null;
}

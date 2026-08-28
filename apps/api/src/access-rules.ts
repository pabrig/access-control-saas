import type { AccessStatus, GateType } from "./access-state.js";

export function gateMatchesProperty(input: {
  gateType: GateType;
  gateComplexId: string | null;
  gateNeighborhoodId: string | null;
  propertyNeighborhoodId: string;
  propertyComplexId: string | null;
}): boolean {
  if (input.gateType === "MAIN_COMPLEX") {
    return (
      input.gateComplexId !== null &&
      input.gateComplexId === input.propertyComplexId
    );
  }

  return input.gateNeighborhoodId === input.propertyNeighborhoodId;
}

export function gateMatchesInvitation(input: {
  gateType: GateType;
  gateComplexId: string | null;
  gateNeighborhoodId: string | null;
  invitationNeighborhoodId: string;
  invitationComplexId: string | null;
}): boolean {
  if (input.gateType === "MAIN_COMPLEX") {
    return (
      input.gateComplexId !== null &&
      input.gateComplexId === input.invitationComplexId
    );
  }

  return input.gateNeighborhoodId === input.invitationNeighborhoodId;
}

export function invitationWindowError(
  now: number,
  validFrom: number,
  validTo: number,
  actionType: AccessStatus,
): "NOT_YET_VALID" | "EXPIRED" | null {
  if (now < validFrom) {
    return "NOT_YET_VALID";
  }

  if (now > validTo && actionType !== "EXITED") {
    return "EXPIRED";
  }

  return null;
}

export function shouldRevokeSingleUse(
  isSingleUse: boolean,
  actionType: AccessStatus,
): boolean {
  return isSingleUse && actionType === "IN_PROPERTY";
}

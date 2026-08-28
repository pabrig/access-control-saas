import type { Role } from "@/lib/session";

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  COMPLEX_ADMIN: "Admin del complejo",
  NEIGHBORHOOD_ADMIN: "Admin del barrio",
  OWNER: "Residente",
  SECURITY: "Seguridad",
};

export const ACCESS_ACTION_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_COMPLEX: "Entró al complejo",
  IN_PROPERTY: "Entró al lote",
  EXITED: "Salió",
  EXPIRED: "Vencida",
};

export const GATE_TYPE_LABEL: Record<string, string> = {
  MAIN_COMPLEX: "Barrera principal",
  INTERNAL_NEIGHBORHOOD: "Barrera interna",
};

export function roleLabel(role: Role | null) {
  return role ? ROLE_LABEL[role] : "Sin rol";
}

export function accessActionLabel(actionType: string) {
  return ACCESS_ACTION_LABEL[actionType] ?? actionType;
}

export function accessActionShort(actionType: string) {
  if (actionType === "IN_COMPLEX" || actionType === "IN_PROPERTY") {
    return "Entró";
  }
  if (actionType === "EXITED") {
    return "Salió";
  }
  return accessActionLabel(actionType);
}

export function isExitAction(actionType: string) {
  return actionType === "EXITED";
}

export function gateTypeLabel(type: string) {
  return GATE_TYPE_LABEL[type] ?? type;
}

export type PassStatus =
  | "waiting"
  | "active"
  | "scheduled"
  | "expired"
  | "revoked";

export function passIsEnded(input: {
  is_revoked: boolean;
  valid_to: string;
  now?: Date;
}) {
  if (input.is_revoked) {
    return true;
  }

  return (input.now ?? new Date()) > new Date(input.valid_to);
}

export function passIsShareable(status: PassStatus) {
  return status === "waiting" || status === "active" || status === "scheduled";
}

export function passStatus(input: {
  is_revoked: boolean;
  valid_from: string;
  valid_to: string;
  status?: "DRAFT" | "READY";
  now?: Date;
}): PassStatus {
  if (input.is_revoked) {
    return "revoked";
  }

  const now = input.now ?? new Date();
  const from = new Date(input.valid_from);
  const to = new Date(input.valid_to);

  if (now > to) {
    return "expired";
  }

  if (input.status === "DRAFT") {
    return "waiting";
  }

  if (now < from) {
    return "scheduled";
  }

  return "active";
}

export const PASS_STATUS_LABEL: Record<PassStatus, string> = {
  waiting: "Pendiente",
  active: "Vigente",
  scheduled: "Programado",
  expired: "Vencido",
  revoked: "Cancelado",
};

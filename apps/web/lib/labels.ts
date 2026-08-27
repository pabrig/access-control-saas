import type { Role } from "@/lib/session";

export const ROLE_LABEL: Record<Role, string> = {
  SUPERADMIN: "Superadmin",
  COMPLEX_ADMIN: "Admin del complejo",
  NEIGHBORHOOD_ADMIN: "Admin del barrio",
  OWNER: "Property owner",
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

export function gateTypeLabel(type: string) {
  return GATE_TYPE_LABEL[type] ?? type;
}

export type PassStatus = "active" | "scheduled" | "expired" | "revoked";

export function passStatus(input: {
  is_revoked: boolean;
  valid_from: string;
  valid_to: string;
  now?: Date;
}): PassStatus {
  if (input.is_revoked) {
    return "revoked";
  }

  const now = input.now ?? new Date();
  const from = new Date(input.valid_from);
  const to = new Date(input.valid_to);

  if (now < from) {
    return "scheduled";
  }

  if (now > to) {
    return "expired";
  }

  return "active";
}

export const PASS_STATUS_LABEL: Record<PassStatus, string> = {
  active: "Activo",
  scheduled: "Programado",
  expired: "Vencido",
  revoked: "Revocado",
};

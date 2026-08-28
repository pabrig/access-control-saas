import { lotLabel } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/lib/session";

export type RoleMaps = {
  propertyById: Map<string, { lot_number: string; street_name: string | null }>;
  neighborhoodById: Map<string, { name: string }>;
  complexById: Map<string, { name: string }>;
};

export function roleScopeLabel(
  row: {
    role: string;
    complex_id: string | null;
    neighborhood_id: string | null;
    property_id: string | null;
  },
  maps: RoleMaps,
) {
  const role = ROLE_LABEL[row.role as Role] ?? row.role;
  const property = row.property_id
    ? maps.propertyById.get(row.property_id)
    : undefined;
  const scope =
    (property && lotLabel(property)) ||
    (row.neighborhood_id &&
      maps.neighborhoodById.get(row.neighborhood_id)?.name) ||
    (row.complex_id && maps.complexById.get(row.complex_id)?.name) ||
    (row.role === "SECURITY" || row.role === "SUPERADMIN"
      ? "Toda la plataforma"
      : "Sin alcance");

  return { role, scope };
}

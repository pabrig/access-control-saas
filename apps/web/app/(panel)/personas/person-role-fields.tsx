"use client";

import { useState } from "react";
import { lotLabel } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import type { Role } from "@/lib/session";

export type PersonRoleFieldsProps = {
  roles: Role[];
  complexes: { id: string; name: string }[];
  neighborhoods: { id: string; name: string }[];
  properties: {
    id: string;
    lot_number: string;
    street_name: string | null;
  }[];
  defaultRole?: Role;
  lockRole?: boolean;
  defaultComplexId?: string;
  defaultNeighborhoodId?: string;
  defaultPropertyId?: string;
};

export function PersonRoleFields({
  roles,
  complexes,
  neighborhoods,
  properties,
  defaultRole,
  lockRole,
  defaultComplexId,
  defaultNeighborhoodId,
  defaultPropertyId,
}: PersonRoleFieldsProps) {
  const initial =
    defaultRole && roles.includes(defaultRole) ? defaultRole : roles[0];
  const [role, setRole] = useState<Role>(initial ?? "OWNER");
  const needsComplex = role === "COMPLEX_ADMIN";
  const needsNeighborhood = role === "NEIGHBORHOOD_ADMIN";
  const needsProperty = role === "OWNER";
  const hideRoleSelect = lockRole || roles.length <= 1;
  const onlyComplex = complexes.length === 1 ? complexes[0] : undefined;
  const onlyNeighborhood =
    neighborhoods.length === 1 ? neighborhoods[0] : undefined;
  const onlyProperty = properties.length === 1 ? properties[0] : undefined;

  return (
    <>
      {hideRoleSelect ? (
        <input type="hidden" name="role" value={roles[0] ?? role} />
      ) : (
        <label>
          Rol
          <select
            name="role"
            required
            value={role}
            onChange={(event) => setRole(event.target.value as Role)}
          >
            {roles.map((item) => (
              <option key={item} value={item}>
                {ROLE_LABEL[item]}
              </option>
            ))}
          </select>
        </label>
      )}
      {needsComplex ? (
        <label>
          Complejo
          <select
            name="complex_id"
            required
            defaultValue={defaultComplexId ?? onlyComplex?.id ?? ""}
          >
            {onlyComplex ? null : (
              <option value="" disabled>
                Elegí el complejo
              </option>
            )}
            {complexes.map((complex) => (
              <option key={complex.id} value={complex.id}>
                {complex.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {needsNeighborhood ? (
        <label>
          Barrio
          <select
            name="neighborhood_id"
            required
            defaultValue={defaultNeighborhoodId ?? onlyNeighborhood?.id ?? ""}
          >
            {onlyNeighborhood ? null : (
              <option value="" disabled>
                Elegí el barrio
              </option>
            )}
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood.id} value={neighborhood.id}>
                {neighborhood.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {needsProperty ? (
        <label>
          Lote
          <select
            name="property_id"
            required
            defaultValue={defaultPropertyId ?? onlyProperty?.id ?? ""}
          >
            {onlyProperty ? null : (
              <option value="" disabled>
                Elegí el lote
              </option>
            )}
            {properties.map((property) => (
              <option key={property.id} value={property.id}>
                {lotLabel(property)}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </>
  );
}

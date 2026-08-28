import Link from "next/link";
import { Badge } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { initials, personName } from "@/lib/format";
import type { RoleMaps } from "./role-scope";
import { roleScopeLabel } from "./role-scope";

export type PersonCardValue = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  is_active: boolean;
  roles: Array<{
    role: string;
    complex_id: string | null;
    neighborhood_id: string | null;
    property_id: string | null;
  }>;
};

export function PersonCard({
  person,
  maps,
}: {
  person: PersonCardValue;
  maps: RoleMaps;
}) {
  const name = personName(person);
  const line =
    person.roles.length === 0
      ? person.is_active
        ? "Sin rol en tu alcance"
        : "Inactiva"
      : person.roles
          .map((row) => {
            const { role, scope } = roleScopeLabel(row, maps);
            return `${role} · ${scope}`;
          })
          .join(" · ");

  return (
    <Link className={ui.card} href={`/personas/${person.id}`}>
      <div className={ui.person}>
        <span className={ui.avatar} aria-hidden>
          {initials(name)}
        </span>
        <div>
          <h2>{name}</h2>
          <p className={ui.muted}>{line}</p>
          {person.email ? <p className={ui.muted}>{person.email}</p> : null}
        </div>
        {person.is_active ? null : <Badge status="muted">Inactiva</Badge>}
      </div>
    </Link>
  );
}

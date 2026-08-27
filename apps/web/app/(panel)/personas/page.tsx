import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { lotLabel, personName } from "@/lib/format";
import { ROLE_LABEL } from "@/lib/labels";
import { isSuperadmin, requireAdmin } from "@/lib/session";
import type { Role } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { assignRole, removeRole } from "./actions";

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();
  const superadmin = isSuperadmin(session);
  const supabase = await createClient();

  const [
    { data: profiles, error },
    { data: roles },
    { data: properties },
    { data: neighborhoods },
    { data: complexes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, is_active")
      .order("last_name"),
    supabase
      .from("user_roles")
      .select("id, user_id, role, complex_id, neighborhood_id, property_id"),
    supabase.from("properties").select("id, lot_number, street_name"),
    supabase.from("neighborhoods").select("id, name"),
    supabase.from("complexes").select("id, name"),
  ]);

  const propertyById = new Map((properties ?? []).map((row) => [row.id, row]));
  const neighborhoodById = new Map(
    (neighborhoods ?? []).map((row) => [row.id, row]),
  );
  const complexById = new Map((complexes ?? []).map((row) => [row.id, row]));

  const people = (profiles ?? []).map((profile) => ({
    ...profile,
    roles: (roles ?? []).filter((role) => role.user_id === profile.id),
  }));

  return (
    <>
      <PageHeader
        kicker="Comunidad"
        title="Personas"
        description="Quién vive, quién administra y quién está de guardia, según lo que te deja ver tu rol. Las cuentas nuevas se crean en Supabase Auth."
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Rol asignado.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {superadmin ? (
        <section className={ui.card}>
          <h2>Asignar rol</h2>
          <p className={ui.muted}>
            Complejo para admin de complejo, barrio para admin de barrio, lote
            para propietario. Seguridad y superadmin van sin alcance.
          </p>
          <form action={assignRole} className={ui.form}>
            <label>
              Persona
              <select name="user_id" required defaultValue="">
                <option value="" disabled>
                  Elegí una persona
                </option>
                {people.map((person) => (
                  <option key={person.id} value={person.id}>
                    {personName(person)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Rol
              <select name="role" required defaultValue="OWNER">
                {(Object.keys(ROLE_LABEL) as Role[]).map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABEL[role]}
                  </option>
                ))}
              </select>
            </label>
            <div className={ui.formRow}>
              <label>
                Complejo
                <select name="complex_id" defaultValue="">
                  <option value="">—</option>
                  {(complexes ?? []).map((complex) => (
                    <option key={complex.id} value={complex.id}>
                      {complex.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Barrio
                <select name="neighborhood_id" defaultValue="">
                  <option value="">—</option>
                  {(neighborhoods ?? []).map((neighborhood) => (
                    <option key={neighborhood.id} value={neighborhood.id}>
                      {neighborhood.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Lote
                <select name="property_id" defaultValue="">
                  <option value="">—</option>
                  {(properties ?? []).map((property) => (
                    <option key={property.id} value={property.id}>
                      {lotLabel(property)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className={ui.button} type="submit">
              Asignar
            </button>
          </form>
        </section>
      ) : null}

      {people.length === 0 ? (
        <Empty
          title="No hay personas visibles"
          description="RLS muestra solo las personas de tu complejo o barrio."
        />
      ) : (
        <ul className={ui.stack} style={{ marginTop: 16 }}>
          {people.map((person) => (
            <li className={ui.card} key={person.id}>
              <div>
                <h2>{personName(person)}</h2>
                <p className={ui.muted}>
                  {person.is_active ? "Activa" : "Inactiva"}
                </p>
              </div>
              {person.roles.length === 0 ? (
                <p className={ui.muted}>
                  {superadmin
                    ? "Sin rol asignado."
                    : "El rol de esta persona no está en tu alcance."}
                </p>
              ) : (
                <ul className={ui.list}>
                  {person.roles.map((row) => {
                    const scope =
                      (row.property_id &&
                        propertyById.get(row.property_id) &&
                        lotLabel(propertyById.get(row.property_id)!)) ||
                      (row.neighborhood_id &&
                        neighborhoodById.get(row.neighborhood_id)?.name) ||
                      (row.complex_id &&
                        complexById.get(row.complex_id)?.name) ||
                      "Toda la plataforma";

                    return (
                      <li className={ui.row} key={row.id}>
                        <div>
                          <strong>{ROLE_LABEL[row.role as Role]}</strong>
                          <p className={ui.muted}>{scope}</p>
                        </div>
                        {superadmin ? (
                          <form action={removeRole}>
                            <input type="hidden" name="id" value={row.id} />
                            <button className={ui.buttonDanger} type="submit">
                              Quitar
                            </button>
                          </form>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

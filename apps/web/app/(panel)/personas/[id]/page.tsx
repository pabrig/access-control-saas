import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { personName } from "@/lib/format";
import {
  assignableRoles,
  canRemoveAssignedRole,
  requireAdmin,
  type Role,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  activatePerson,
  assignRole,
  deactivatePerson,
  removeRole,
} from "../actions";
import { PersonRoleFields } from "../person-role-fields";
import { roleScopeLabel } from "../role-scope";

export default async function PersonaFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; rol?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  const allowed = assignableRoles(session);
  const supabase = await createClient();

  const [
    { data: person },
    { data: roles },
    { data: properties },
    { data: neighborhoods },
    { data: complexes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, is_active")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("user_roles")
      .select("id, user_id, role, complex_id, neighborhood_id, property_id")
      .eq("user_id", id),
    supabase.from("properties").select("id, lot_number, street_name"),
    supabase.from("neighborhoods").select("id, name"),
    supabase.from("complexes").select("id, name"),
  ]);

  if (!person) {
    notFound();
  }

  const maps = {
    propertyById: new Map((properties ?? []).map((row) => [row.id, row])),
    neighborhoodById: new Map(
      (neighborhoods ?? []).map((row) => [row.id, row]),
    ),
    complexById: new Map((complexes ?? []).map((row) => [row.id, row])),
  };
  const name = personName(person);
  const isSelf = person.id === session.userId;

  return (
    <>
      <Link className={ui.backLink} href="/personas">
        <Icon name="back" size={18} />
        Personas
      </Link>
      <PageHeader
        kicker="Persona"
        title={name}
        description="Ficha: datos de la cuenta y roles en tu alcance."
        actions={
          <Link className={ui.button} href={`/personas/${person.id}/editar`}>
            Editar
          </Link>
        }
      />
      {flash.created ? <Banner>Persona guardada.</Banner> : null}
      {flash.rol ? <Banner>Rol asignado.</Banner> : null}
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <dl className={ui.form}>
          {person.email ? (
            <div>
              <p className={ui.kicker}>Email</p>
              <p>{person.email}</p>
            </div>
          ) : null}
          <div>
            <p className={ui.kicker}>Estado</p>
            <p>{person.is_active ? "Activa" : "Inactiva"}</p>
          </div>
        </dl>
      </section>

      <section className={ui.card} style={{ marginTop: 24 }}>
        <h2>Roles</h2>
        {(roles ?? []).length === 0 ? (
          <p className={ui.muted}>Sin rol asignado en tu alcance.</p>
        ) : (
          <ul className={ui.list}>
            {(roles ?? []).map((row) => {
              const { role, scope } = roleScopeLabel(row, maps);
              return (
                <li className={ui.row} key={row.id}>
                  <div>
                    <strong>{role}</strong>
                    <p className={ui.muted}>{scope}</p>
                  </div>
                  {canRemoveAssignedRole(session, row.role as Role) ? (
                    <form action={removeRole}>
                      <input type="hidden" name="id" value={row.id} />
                      <input type="hidden" name="role" value={row.role} />
                      <input
                        type="hidden"
                        name="next"
                        value={`/personas/${person.id}`}
                      />
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
      </section>

      {allowed.length > 0 ? (
        <section className={ui.card} style={{ marginTop: 24 }}>
          <h2>Asignar rol</h2>
          <p className={ui.muted}>
            Un rol más sobre esta persona, dentro de lo que administra tu
            cuenta.
          </p>
          <form action={assignRole} className={ui.form}>
            <input type="hidden" name="user_id" value={person.id} />
            <input type="hidden" name="next" value={`/personas/${person.id}`} />
            <PersonRoleFields
              roles={allowed}
              complexes={complexes ?? []}
              neighborhoods={neighborhoods ?? []}
              properties={properties ?? []}
            />
            <button className={ui.button} type="submit">
              Asignar
            </button>
          </form>
        </section>
      ) : null}

      {!isSelf ? (
        <section className={ui.card} style={{ marginTop: 24 }}>
          <h2>{person.is_active ? "Desactivar cuenta" : "Reactivar cuenta"}</h2>
          <p className={ui.muted}>
            {person.is_active
              ? "No entra más a Nexo. No se borra porque puede tener pases o turnos."
              : "Vuelve a poder entrar con el mismo email."}
          </p>
          <form action={person.is_active ? deactivatePerson : activatePerson}>
            <input type="hidden" name="id" value={person.id} />
            <button
              className={person.is_active ? ui.buttonDanger : ui.button}
              type="submit"
            >
              {person.is_active ? "Desactivar" : "Reactivar"}
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}

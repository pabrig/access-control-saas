import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import {
  assignableRoles,
  assignedNeighborhoodId,
  isNeighborhoodAdmin,
  requireAdmin,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createPerson } from "../actions";
import { PersonFields } from "../person-fields";
import { PersonRoleFields } from "../person-role-fields";

export default async function NuevaPersonaPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();
  const barrio = isNeighborhoodAdmin(session);
  const roles = assignableRoles(session);
  const neighborhoodId = assignedNeighborhoodId(session);
  const supabase = await createClient();

  const [{ data: complexes }, { data: neighborhoods }, { data: properties }] =
    await Promise.all([
      supabase.from("complexes").select("id, name").order("name"),
      supabase.from("neighborhoods").select("id, name").order("name"),
      neighborhoodId
        ? supabase
            .from("properties")
            .select("id, lot_number, street_name")
            .eq("neighborhood_id", neighborhoodId)
            .order("lot_number")
        : supabase
            .from("properties")
            .select("id, lot_number, street_name")
            .order("lot_number"),
    ]);

  const lots = properties ?? [];

  if (lots.length === 0 && roles.includes("OWNER") && roles.length === 1) {
    return (
      <>
        <Link className={ui.backLink} href="/personas">
          <Icon name="back" size={18} />
          Personas
        </Link>
        <PageHeader kicker="Comunidad" title="Nueva persona" />
        <Empty
          title="Falta un lote"
          description="Cargá un lote primero y después asignale un residente."
        />
        <p>
          <Link className={ui.button} href="/lotes/nuevo">
            Nuevo lote
          </Link>
        </p>
      </>
    );
  }

  return (
    <>
      <Link className={ui.backLink} href="/personas">
        <Icon name="back" size={18} />
        Personas
      </Link>
      <PageHeader
        kicker="Comunidad"
        title="Nueva persona"
        description={
          barrio
            ? "Residente del lote o guardia de seguridad. Entra a Nexo con esa cuenta."
            : "Nombre, email, contraseña y el rol en tu alcance."
        }
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createPerson} className={ui.form}>
          <PersonFields />
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="off"
              inputMode="email"
            />
          </label>
          <label>
            Contraseña inicial
            <input
              type="password"
              name="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <PersonRoleFields
            roles={roles}
            complexes={complexes ?? []}
            neighborhoods={neighborhoods ?? []}
            properties={lots}
            defaultRole="OWNER"
          />
          <button className={ui.button} type="submit">
            Guardar persona
          </button>
        </form>
      </section>
    </>
  );
}

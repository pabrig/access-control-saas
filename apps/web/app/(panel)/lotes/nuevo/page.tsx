import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import {
  assignedNeighborhoodId,
  canCreateNeighborhood,
  isNeighborhoodAdmin,
  requireAdmin,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createProperty } from "../actions";
import { LotFields } from "../lot-fields";

export default async function NuevoLotePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; barrio?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();
  const barrioAdmin = isNeighborhoodAdmin(session);
  const assignedBarrioId = assignedNeighborhoodId(session);
  const createBarrio = canCreateNeighborhood(session);
  const supabase = await createClient();
  const { data: neighborhoods } = await supabase
    .from("neighborhoods")
    .select("id, name")
    .order("name");

  const defaultBarrio =
    (barrioAdmin ? assignedBarrioId : null) || flash.barrio || "";
  const backHref =
    flash.barrio && !barrioAdmin ? `/barrios/${flash.barrio}` : "/lotes";
  const backLabel = barrioAdmin ? "Lotes" : "Comunidad";

  if ((neighborhoods ?? []).length === 0) {
    return (
      <>
        <Link className={ui.backLink} href="/lotes">
          <Icon name="back" size={18} />
          {backLabel}
        </Link>
        <PageHeader kicker="Comunidad" title="Nuevo lote" />
        <Empty
          title="Falta un barrio"
          description={
            createBarrio
              ? "Creá el barrio primero y después cargá el lote adentro."
              : "Todavía no hay un barrio asignado a tu rol."
          }
        />
        {createBarrio ? (
          <p>
            <Link className={ui.button} href="/barrios/nuevo">
              Nuevo barrio
            </Link>
          </p>
        ) : null}
      </>
    );
  }

  return (
    <>
      <Link className={ui.backLink} href={backHref}>
        <Icon name="back" size={18} />
        {backLabel}
      </Link>
      <PageHeader
        kicker="Comunidad"
        title="Nuevo lote"
        description="Número, calle y contacto. El barrio ya tiene que existir."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createProperty} className={ui.form}>
          {barrioAdmin && assignedBarrioId ? (
            <input
              type="hidden"
              name="neighborhood_id"
              value={assignedBarrioId}
            />
          ) : (
            <label>
              Barrio
              <select
                name="neighborhood_id"
                required
                defaultValue={defaultBarrio}
              >
                <option value="" disabled>
                  Elegí el barrio
                </option>
                {(neighborhoods ?? []).map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.id}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <LotFields />
          <button className={ui.button} type="submit">
            Guardar lote
          </button>
        </form>
      </section>
    </>
  );
}

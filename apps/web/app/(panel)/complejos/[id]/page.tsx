import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { canManageComplex, isSuperadmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { deleteComplex } from "../actions";
import { BarrioCard } from "../../lotes/barrio-card";
import { loadResidentsByLot } from "../../lotes/residents";

export default async function ComplejoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  const superadmin = isSuperadmin(session);
  if (!canManageComplex(session, id)) {
    redirect("/");
  }

  const supabase = await createClient();
  const [{ data: complex }, { data: neighborhoods }, residentsByLot] =
    await Promise.all([
      supabase.from("complexes").select("id, name, location").eq("id", id).maybeSingle(),
      supabase
        .from("neighborhoods")
        .select("id, name")
        .eq("complex_id", id)
        .order("name"),
      loadResidentsByLot(),
    ]);

  if (!complex) {
    notFound();
  }

  const barrioIds = (neighborhoods ?? []).map((row) => row.id);
  const { data: properties } = barrioIds.length
    ? await supabase
        .from("properties")
        .select("id, neighborhood_id")
        .in("neighborhood_id", barrioIds)
    : { data: [] as { id: string; neighborhood_id: string }[] };

  const lots = properties ?? [];

  return (
    <>
      <Link className={ui.backLink} href={superadmin ? "/complejos" : "/"}>
        <Icon name="back" size={18} />
        {superadmin ? "Complejos" : "Inicio"}
      </Link>
      <PageHeader
        kicker="Complejo"
        title={complex.name}
        description={
          complex.location
            ? `${complex.location}. ${
                superadmin
                  ? "Barrios de este complejo. Editalo o borralo si ya no aplica."
                  : "Barrios de tu complejo. Editalo y cargá barrios o lotes adentro."
              }`
            : superadmin
              ? "Barrios de este complejo. Editalo o borralo si ya no aplica."
              : "Barrios de tu complejo. Editalo y cargá barrios o lotes adentro."
        }
        actions={
          <>
            <Link
              className={ui.buttonSecondary}
              href={`/complejos/${complex.id}/editar`}
            >
              Editar
            </Link>
            <Link
              className={ui.button}
              href={`/barrios/nuevo?complejo=${complex.id}`}
            >
              <Icon name="plus" size={18} />
              Nuevo barrio
            </Link>
          </>
        }
      />
      {flash.created ? <Banner>Complejo creado.</Banner> : null}
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.stats}>
        <Stat label="Barrios" value={(neighborhoods ?? []).length} />
        <Stat label="Lotes" value={lots.length} />
      </section>

      {(neighborhoods ?? []).length === 0 ? (
        <Empty
          title="Este complejo no tiene barrios"
          description="Creá un barrio adentro o asignale uno existente desde editar barrio."
        />
      ) : (
        <ul className={ui.list}>
          {(neighborhoods ?? []).map((neighborhood) => {
            const lotsHere = lots.filter(
              (property) => property.neighborhood_id === neighborhood.id,
            );
            const vacant = lotsHere.filter(
              (property) =>
                (residentsByLot.get(property.id) ?? []).length === 0,
            ).length;
            return (
              <li key={neighborhood.id}>
                <BarrioCard
                  id={neighborhood.id}
                  name={neighborhood.name}
                  lotCount={lotsHere.length}
                  vacant={vacant}
                />
              </li>
            );
          })}
        </ul>
      )}

      {superadmin ? (
        <section className={ui.card} style={{ marginTop: 24 }}>
          <h2>Eliminar complejo</h2>
          <p className={ui.muted}>
            Los barrios quedan independientes. Los admins asignados a este
            complejo se dan de baja.
          </p>
          <form action={deleteComplex}>
            <input type="hidden" name="id" value={complex.id} />
            <button className={ui.buttonDanger} type="submit">
              Eliminar complejo
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}

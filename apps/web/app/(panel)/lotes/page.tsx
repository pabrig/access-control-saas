import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { asOne } from "@/lib/relations";
import {
  canCreateNeighborhood,
  isAdmin,
  isNeighborhoodAdmin,
  requireSession,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LotCard } from "./lot-card";
import { BarrioCard } from "./barrio-card";
import { loadResidentsByLot } from "./residents";

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    barrio?: string;
  }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const barrioAdmin = isNeighborhoodAdmin(session);
  const createBarrio = canCreateNeighborhood(session);
  const showBarrios = admin && !barrioAdmin;
  const supabase = await createClient();

  const [
    { data: properties, error },
    { data: neighborhoods },
    residentsByLot,
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, lot_number, street_name, neighborhood_id, block_name, phone, neighborhoods(name)",
      )
      .order("lot_number"),
    showBarrios
      ? supabase
          .from("neighborhoods")
          .select("id, name, complex_id, complexes(name)")
          .order("name")
      : Promise.resolve({
          data: [] as {
            id: string;
            name: string;
            complex_id: string | null;
            complexes: { name: string } | { name: string }[] | null;
          }[],
        }),
    loadResidentsByLot(),
  ]);

  const lots = properties ?? [];
  const barrioCards = (neighborhoods ?? []).map((neighborhood) => {
    const lotsHere = lots.filter(
      (property) => property.neighborhood_id === neighborhood.id,
    );
    const vacant = lotsHere.filter(
      (property) => (residentsByLot.get(property.id) ?? []).length === 0,
    ).length;
    const complex = asOne<{ name: string }>(neighborhood.complexes);

    return {
      id: neighborhood.id,
      name: neighborhood.name,
      complexId: neighborhood.complex_id,
      complexName: complex?.name ?? null,
      lotCount: lotsHere.length,
      vacant,
    };
  });

  const complexNames = [
    ...new Set(
      barrioCards
        .map((card) => card.complexName)
        .filter((name): name is string => Boolean(name)),
    ),
  ];
  const groupByComplex = showBarrios && complexNames.length > 1;

  return (
    <>
      <PageHeader
        kicker={showBarrios && complexNames.length === 1 ? complexNames[0] : "Comunidad"}
        title={barrioAdmin ? "Lotes" : admin ? "Comunidad" : "Mi lote"}
        description={
          barrioAdmin
            ? "Padrón de tu barrio. Tocá un lote para ver la ficha."
            : showBarrios
              ? "Barrios del complejo. Entrá a uno para ver sus lotes."
              : "Este es el lote desde el que invitás a entrar."
        }
        actions={
          admin ? (
            <>
              {createBarrio ? (
                <Link className={ui.buttonSecondary} href="/barrios/nuevo">
                  Nuevo barrio
                </Link>
              ) : null}
              <Link className={ui.button} href="/lotes/nuevo">
                <Icon name="plus" size={18} />
                Nuevo lote
              </Link>
            </>
          ) : null
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Lote guardado.</Banner> : null}
      {flash.barrio ? (
        <Banner>Barrio listo. Ya podés cargar lotes ahí.</Banner>
      ) : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {showBarrios ? (
        barrioCards.length === 0 ? (
          <Empty
            title="Todavía no hay barrios"
            description={
              createBarrio
                ? "Creá el primer barrio y después cargá los lotes adentro."
                : "Cuando haya un barrio asignado, acá vas a ver el padrón."
            }
          />
        ) : groupByComplex ? (
          complexNames.map((complexName) => (
            <section key={complexName}>
              <h2 className={ui.groupTitle}>{complexName}</h2>
              <ul className={ui.list}>
                {barrioCards
                  .filter((card) => card.complexName === complexName)
                  .map((card) => (
                    <li key={card.id}>
                      <BarrioCard
                        id={card.id}
                        name={card.name}
                        lotCount={card.lotCount}
                        vacant={card.vacant}
                      />
                    </li>
                  ))}
              </ul>
            </section>
          ))
        ) : (
          <ul className={ui.list}>
            {barrioCards.map((card) => (
              <li key={card.id}>
                <BarrioCard
                  id={card.id}
                  name={card.name}
                  lotCount={card.lotCount}
                  vacant={card.vacant}
                />
              </li>
            ))}
          </ul>
        )
      ) : lots.length === 0 ? (
        <Empty
          title={admin ? "No hay lotes en tu barrio" : "No hay lotes en tu alcance"}
          description={
            admin
              ? "Cargá el primer lote para armar el padrón."
              : "El administrador carga el lote y te lo asigna como propietario."
          }
        />
      ) : (
        <ul className={ui.list}>
          {lots.map((property) => {
            const neighborhood = asOne<{ name: string }>(property.neighborhoods);

            return (
              <li key={property.id}>
                <LotCard
                  property={property}
                  residents={residentsByLot.get(property.id) ?? []}
                  neighborhood={admin ? null : neighborhood?.name}
                  showVacant={admin}
                />
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}


import Link from "next/link";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { asOne } from "@/lib/relations";
import {
  canCreateNeighborhood,
  canManageStructure,
  isAdmin,
  isNeighborhoodAdmin,
  requireSession,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LotCard } from "./lot-card";
import { BarrioCard } from "./barrio-card";
import { loadResidentsByLot } from "./residents";
import { ScopeFilter } from "../scope-filter";
import ops from "../ops-overview.module.css";

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    barrio?: string;
    grupo?: string;
  }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const barrioAdmin = isNeighborhoodAdmin(session);
  const createBarrio = canCreateNeighborhood(session);
  const structureAdmin = canManageStructure(session);
  const showBarrios = admin && !barrioAdmin;
  const supabase = await createClient();

  const [{ data: properties, error }, { data: neighborhoods }, residentsByLot] =
    await Promise.all([
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

  const groups = [
    ...new Map(
      barrioCards
        .filter((card) => card.complexId && card.complexName)
        .map((card) => [
          card.complexId as string,
          {
            id: card.complexId as string,
            name: card.complexName as string,
            count: 0,
          },
        ]),
    ).values(),
  ].map((group) => ({
    ...group,
    count: barrioCards.filter((card) => card.complexId === group.id).length,
  }));
  const independents = barrioCards.filter((card) => !card.complexId).length;
  const visibleBarrios =
    flash.grupo === "independent"
      ? barrioCards.filter((card) => !card.complexId)
      : flash.grupo
        ? barrioCards.filter((card) => card.complexId === flash.grupo)
        : barrioCards;
  const vacantTotal = barrioCards.reduce((sum, card) => sum + card.vacant, 0);
  const showFlags =
    groups.length > 0 && (groups.length > 1 || independents > 0);

  return (
    <>
      <PageHeader
        kicker="Estructura"
        title={barrioAdmin ? "Lotes" : admin ? "Comunidad" : "Mi lote"}
        description={
          barrioAdmin
            ? "Padrón de tu barrio. Tocá un lote para ver la ficha."
            : structureAdmin
              ? "Directorio de barrios. Entrá a uno para ver y editar sus lotes."
              : showBarrios
                ? "Barrios del complejo. Entrá a uno para ver sus lotes."
                : "Este es el lote desde el que invitás a entrar."
        }
        actions={
          admin ? (
            <>
              {createBarrio ? (
                <Link
                  className={structureAdmin ? ui.button : ui.buttonSecondary}
                  href="/barrios/nuevo"
                >
                  Nuevo barrio
                </Link>
              ) : null}
              <Link
                className={structureAdmin ? ui.buttonSecondary : ui.button}
                href="/lotes/nuevo"
              >
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
        ) : (
          <div className={ops.board}>
            {structureAdmin ? (
              <section className={ui.stats} aria-label="Resumen de comunidad">
                <Stat label="Barrios" value={barrioCards.length} />
                <Stat label="Lotes" value={lots.length} />
                <Stat label="Sin residente" value={vacantTotal} />
              </section>
            ) : null}
            {structureAdmin ? (
              <ScopeFilter groups={groups} independents={independents} />
            ) : null}
            <ul className={structureAdmin ? ops.cards : ui.list}>
              {visibleBarrios.map((card) => (
                <li key={card.id}>
                  <BarrioCard
                    id={card.id}
                    name={card.name}
                    lotCount={card.lotCount}
                    vacant={card.vacant}
                    flag={
                      structureAdmin && showFlags ? card.complexName : undefined
                    }
                  />
                </li>
              ))}
            </ul>
          </div>
        )
      ) : lots.length === 0 ? (
        <Empty
          title={
            admin ? "No hay lotes en tu barrio" : "No hay lotes en tu alcance"
          }
          description={
            admin
              ? "Cargá el primer lote para armar el padrón."
              : "El administrador carga el lote y te lo asigna como propietario."
          }
        />
      ) : (
        <ul className={ui.list}>
          {lots.map((property) => {
            const neighborhood = asOne<{ name: string }>(
              property.neighborhoods,
            );

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

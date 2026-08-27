import Link from "next/link";
import { Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { asOne } from "@/lib/relations";
import { isNeighborhoodAdmin, type Session } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { BarrioCard } from "./lotes/barrio-card";
import { LotCard } from "./lotes/lot-card";
import { loadResidentsByLot } from "./lotes/residents";

export async function CommunityHome({ session }: { session: Session }) {
  const barrioAdmin = isNeighborhoodAdmin(session);
  const supabase = await createClient();

  const [{ data: properties }, { data: neighborhoods }, residentsByLot] =
    await Promise.all([
      supabase
        .from("properties")
        .select(
          "id, lot_number, street_name, neighborhood_id, block_name, phone, neighborhoods(name)",
        )
        .order("lot_number"),
      supabase
        .from("neighborhoods")
        .select("id, name, complex_id, complexes(name)")
        .order("name"),
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
      complexName: complex?.name ?? null,
      lots: lotsHere,
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
  const kicker = barrioAdmin
    ? (barrioCards[0]?.name ?? "Tu barrio")
    : complexNames.length === 1
      ? complexNames[0]
      : "Comunidad";

  return (
    <>
      <PageHeader
        kicker={kicker}
        title={`Hola, ${session.firstName}`}
        description={
          barrioAdmin
            ? "Del barrio a cada lote. Los movimientos están en el historial."
            : "Del complejo a cada barrio y lote. Los movimientos están en el historial."
        }
      />

      <div className={ui.modules}>
        {barrioAdmin ? null : (
          <section>
            <div className={ui.sectionHead}>
              <h2>Barrios</h2>
              <Link href="/lotes">Comunidad</Link>
            </div>
            {barrioCards.length === 0 ? (
              <Empty
                title="Todavía no hay barrios"
                description="Cuando existan, aparecen acá para entrar al padrón."
              />
            ) : (
              <ul className={ui.cardGrid}>
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
            )}
          </section>
        )}

        <section>
          <div className={ui.sectionHead}>
            <h2>Lotes</h2>
            <Link href="/lotes">Ver padrón</Link>
          </div>
          {lots.length === 0 ? (
            <Empty
              title="No hay lotes en tu alcance"
              description="El padrón se arma por barrio. Cuando haya lotes, se listan acá."
            />
          ) : barrioAdmin ? (
            <ul className={ui.cardGrid}>
              {lots.map((property) => (
                <li key={property.id}>
                  <LotCard
                    property={property}
                    residents={residentsByLot.get(property.id) ?? []}
                    showVacant
                  />
                </li>
              ))}
            </ul>
          ) : (
            barrioCards.map((barrio) =>
              barrio.lots.length === 0 ? null : (
                <div key={barrio.id}>
                  <h3 className={ui.groupTitle}>{barrio.name}</h3>
                  <ul className={ui.cardGrid}>
                    {barrio.lots.map((property) => (
                      <li key={property.id}>
                        <LotCard
                          property={property}
                          residents={residentsByLot.get(property.id) ?? []}
                          showVacant
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              ),
            )
          )}
        </section>

        <section>
          <div className={ui.sectionHead}>
            <h2>Movimientos</h2>
            <Link href="/movimientos">Abrir</Link>
          </div>
          <Link className={ui.card} href="/movimientos">
            <h2>Historial de puerta</h2>
            <p className={ui.muted}>
              Entradas y salidas. El detalle está en movimientos, no en el
              inicio.
            </p>
          </Link>
        </section>
      </div>
    </>
  );
}

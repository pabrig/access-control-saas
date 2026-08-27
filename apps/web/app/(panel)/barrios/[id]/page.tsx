import Link from "next/link";
import { notFound } from "next/navigation";
import { Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { asOne } from "@/lib/relations";
import { isNeighborhoodAdmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { LotCard } from "../../lotes/lot-card";
import { loadResidentsByLot, lotCountLabel } from "../../lotes/residents";

export default async function BarrioPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin();
  const barrioAdmin = isNeighborhoodAdmin(session);
  const supabase = await createClient();

  const [{ data: neighborhood }, { data: properties }, residentsByLot] =
    await Promise.all([
      supabase
        .from("neighborhoods")
        .select("id, name, complexes(name)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("properties")
        .select("id, lot_number, street_name, block_name, phone")
        .eq("neighborhood_id", id)
        .order("lot_number"),
      loadResidentsByLot(),
    ]);

  if (!neighborhood) {
    notFound();
  }

  const lots = properties ?? [];
  const vacant = lots.filter(
    (property) => (residentsByLot.get(property.id) ?? []).length === 0,
  ).length;
  const complex = asOne<{ name: string }>(neighborhood.complexes);

  return (
    <>
      <Link className={ui.backLink} href="/lotes">
        <Icon name="back" size={18} />
        {barrioAdmin ? "Lotes" : "Comunidad"}
      </Link>
      <PageHeader
        kicker={complex?.name ?? "Comunidad"}
        title={neighborhood.name}
        description="Lotes de este barrio. Tocá uno para ver la ficha."
        actions={
          <Link
            className={ui.button}
            href={`/lotes/nuevo?barrio=${neighborhood.id}`}
          >
            <Icon name="plus" size={18} />
            Nuevo lote
          </Link>
        }
      />

      <section className={ui.stats}>
        <Stat label="Lotes" value={lots.length} />
        <Stat label="Sin residente" value={vacant} />
      </section>

      {lots.length === 0 ? (
        <Empty
          title="Este barrio todavía no tiene lotes"
          description="Cargá el primero para armar el padrón."
        />
      ) : (
        <section>
          <div className={ui.sectionHead}>
            <h2>{lotCountLabel(lots.length)}</h2>
          </div>
          <ul className={ui.list}>
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
        </section>
      )}
    </>
  );
}

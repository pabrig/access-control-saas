import { lotLabel } from "@/lib/format";
import { asOne } from "@/lib/relations";
import {
  canCreateNeighborhood,
  canManageStructure,
  isNeighborhoodAdmin,
  isSuperadmin,
  type Session,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { DashboardMetrics } from "./inicio/dashboard-metrics";
import { PrimaryActions } from "./inicio/primary-actions";
import { StructureDataGrid } from "./inicio/structure-data-grid";
import type { BarrioNode, ComplexNode, LotNode } from "./inicio/types";
import styles from "./inicio/inicio.module.css";
import { loadResidentsByLot } from "./lotes/residents";

type PropertyRow = {
  id: string;
  lot_number: string | null;
  street_name: string | null;
  neighborhood_id: string | null;
  block_name: string | null;
};

function lotNode(property: PropertyRow, residents: string[]): LotNode {
  const meta = [
    property.block_name ? `Manzana ${property.block_name}` : null,
    residents.length > 0 ? residents.join(", ") : "Sin residente",
  ]
    .filter(Boolean)
    .join(" · ");

  return {
    id: property.id,
    label: lotLabel(property),
    meta,
  };
}

function barrioNode(
  neighborhood: { id: string; name: string },
  lots: PropertyRow[],
  residentsByLot: Map<string, string[]>,
  complexId?: string | null,
  complexName?: string | null,
): BarrioNode {
  const lotsHere = lots.filter(
    (property) => property.neighborhood_id === neighborhood.id,
  );
  const vacant = lotsHere.filter(
    (property) => (residentsByLot.get(property.id) ?? []).length === 0,
  ).length;

  return {
    id: neighborhood.id,
    name: neighborhood.name,
    lotCount: lotsHere.length,
    vacant,
    complexId: complexId ?? null,
    complexName: complexName ?? null,
    lots: lotsHere.map((property) =>
      lotNode(property, residentsByLot.get(property.id) ?? []),
    ),
  };
}

export async function CommunityHome({ session }: { session: Session }) {
  const barrioAdmin = isNeighborhoodAdmin(session);
  const superadmin = isSuperadmin(session);
  const structureAdmin = canManageStructure(session);
  const supabase = await createClient();

  const [
    { data: complexes },
    { data: neighborhoods },
    { data: properties },
    residentsByLot,
  ] = await Promise.all([
    supabase.from("complexes").select("id, name").order("name"),
    supabase
      .from("neighborhoods")
      .select("id, name, complex_id, complexes(name)")
      .order("name"),
    supabase
      .from("properties")
      .select("id, lot_number, street_name, neighborhood_id, block_name")
      .order("lot_number"),
    loadResidentsByLot(),
  ]);

  const lots = (properties ?? []) as PropertyRow[];
  const barrioRows = neighborhoods ?? [];
  const complexRows = complexes ?? [];

  const groups: ComplexNode[] = complexRows.map((complex) => {
    const barrios = barrioRows
      .filter((neighborhood) => neighborhood.complex_id === complex.id)
      .map((neighborhood) =>
        barrioNode(
          neighborhood,
          lots,
          residentsByLot,
          complex.id,
          complex.name,
        ),
      );

    return {
      id: complex.id,
      name: complex.name,
      barrioCount: barrios.length,
      lotCount: barrios.reduce((sum, barrio) => sum + barrio.lotCount, 0),
      barrios,
    };
  });

  const independents = barrioRows
    .filter((neighborhood) => !neighborhood.complex_id)
    .map((neighborhood) =>
      barrioNode(neighborhood, lots, residentsByLot, null, null),
    );

  const kicker = barrioAdmin
    ? (barrioRows[0]?.name ?? "Tu barrio")
    : structureAdmin
      ? superadmin
        ? "Administración estructural"
        : (complexRows[0]?.name ?? "Tu complejo")
      : (asOne<{ name: string }>(barrioRows[0]?.complexes)?.name ??
        "Comunidad");

  const mixed = groups.length > 0 && independents.length > 0;

  return (
    <div className={styles.board}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.kicker}>{kicker}</p>
          <h1 className={styles.title}>Hola, {session.firstName}</h1>
          <p className={styles.lede}>
            {barrioAdmin
              ? "Los lotes de tu barrio. La estructura se lee de un vistazo."
              : mixed
                ? "El flag marca el complejo. El filtro agrupa los barrios que le pertenecen."
                : "Complejos, barrios y lotes. Creá la estructura acá; el detalle vive en cada ficha."}
          </p>
        </div>
        <PrimaryActions
          canCreateComplex={superadmin}
          canCreateBarrio={canCreateNeighborhood(session)}
          canCreateLot
        />
      </header>

      <DashboardMetrics
        complexes={complexRows.length > 0 ? complexRows.length : null}
        neighborhoods={barrioRows.length}
        lots={lots.length}
        manageComplexes={structureAdmin}
      />

      <StructureDataGrid
        groups={groups}
        independents={independents}
        showBarrios={!barrioAdmin}
        canCreateLot
        canManageComplexes={structureAdmin}
      />
    </div>
  );
}

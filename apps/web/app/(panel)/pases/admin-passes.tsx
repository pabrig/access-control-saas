import Link from "next/link";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";
import { passStatus } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { GuestRow } from "./guest-row";
import { ScopeFilter } from "../scope-filter";
import ops from "../ops-overview.module.css";
import styles from "./pases.module.css";

export type AdminPassRow = {
  id: string;
  guest_name: string | null;
  valid_from: string;
  valid_to: string;
  is_revoked: boolean;
  is_single_use: boolean;
  status: "DRAFT" | "READY";
  property_id: string;
  neighborhood_id: string;
  properties?: unknown;
  neighborhoods?: unknown;
};

function isRequested(row: AdminPassRow) {
  const status = passStatus(row);
  return status === "waiting" || status === "scheduled" || status === "active";
}

function isPast(row: AdminPassRow) {
  const status = passStatus(row);
  return status === "expired" || status === "revoked";
}

function placeOf(row: AdminPassRow) {
  const neighborhood = asOne<{
    name: string;
    complex_id: string | null;
    complexes:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
  }>(row.neighborhoods);
  const complex = asOne<{ id: string; name: string }>(neighborhood?.complexes);
  const property = asOne<{
    lot_number: string | null;
    street_name: string | null;
  }>(row.properties);

  return {
    lotId: row.property_id,
    lot: lotLabel(property ?? {}),
    lotNumber: Number(property?.lot_number),
    barrioId: row.neighborhood_id,
    barrioName: neighborhood?.name ?? "Barrio",
    complexId: neighborhood?.complex_id ?? complex?.id ?? null,
    complexName: complex?.name ?? null,
  };
}

const STATUS_ORDER = {
  waiting: 0,
  scheduled: 1,
  active: 2,
  expired: 3,
  revoked: 4,
} as const;

function byStatus(left: AdminPassRow, right: AdminPassRow) {
  return STATUS_ORDER[passStatus(left)] - STATUS_ORDER[passStatus(right)];
}

type LotBucket = {
  id: string;
  label: string;
  lotNumber: number;
  barrioName: string;
  complexName: string | null;
  complexId: string | null;
  requested: AdminPassRow[];
  past: AdminPassRow[];
};

function lotsOf(people: AdminPassRow[]): LotBucket[] {
  const buckets = new Map<string, LotBucket>();

  for (const row of people) {
    const place = placeOf(row);
    const current = buckets.get(place.lotId) ?? {
      id: place.lotId,
      label: place.lot,
      lotNumber: Number.isFinite(place.lotNumber) ? place.lotNumber : 9999,
      barrioName: place.barrioName,
      complexName: place.complexName,
      complexId: place.complexId,
      requested: [],
      past: [],
    };
    if (isRequested(row)) {
      current.requested.push(row);
    } else if (isPast(row)) {
      current.past.push(row);
    }
    buckets.set(place.lotId, current);
  }

  for (const lot of buckets.values()) {
    lot.requested.sort(byStatus);
    lot.past.sort(byStatus);
  }

  return [...buckets.values()].sort(
    (left, right) =>
      left.barrioName.localeCompare(right.barrioName) ||
      left.lotNumber - right.lotNumber,
  );
}

export function AdminPasses({
  error,
  created,
  updated,
  queryError,
  grupo,
  people,
  showBarrio,
}: {
  error?: string;
  created?: string;
  updated?: string;
  queryError?: string;
  grupo?: string;
  people: AdminPassRow[];
  showBarrio: boolean;
}) {
  const lots = lotsOf(people);
  const groups = [
    ...new Map(
      lots
        .filter((lot) => lot.complexId && lot.complexName)
        .map((lot) => [
          lot.complexId as string,
          {
            id: lot.complexId as string,
            name: lot.complexName as string,
            count: 0,
          },
        ]),
    ).values(),
  ].map((group) => ({
    ...group,
    count: lots.filter((lot) => lot.complexId === group.id).length,
  }));
  const independents = lots.filter((lot) => !lot.complexId).length;
  const scoped =
    grupo === "independent"
      ? lots.filter((lot) => !lot.complexId)
      : grupo
        ? lots.filter((lot) => lot.complexId === grupo)
        : lots;
  const openLots = scoped.filter((lot) => lot.requested.length > 0);
  const pastLots = scoped.filter((lot) => lot.past.length > 0);
  const pending = scoped.reduce(
    (sum, lot) =>
      sum + lot.requested.filter((row) => passStatus(row) === "waiting").length,
    0,
  );
  const ready = scoped.reduce(
    (sum, lot) =>
      sum + lot.requested.filter((row) => passStatus(row) !== "waiting").length,
    0,
  );
  const past = scoped.reduce((sum, lot) => sum + lot.past.length, 0);

  return (
    <div className={ops.board}>
      <PageHeader
        title="Pases"
        description="Pedidos por lote. Aunque estén pendientes o el invitado no haya confirmado, se ven acá."
        actions={
          <Link className={ui.button} href="/pases?nuevo=1">
            <Icon name="plus" size={18} />
            Nuevo pase
          </Link>
        }
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {created ? <Banner>Listo. Tocá la tarjeta para compartir.</Banner> : null}
      {updated ? <Banner>Guardado.</Banner> : null}
      {queryError ? <Banner tone="danger">{queryError}</Banner> : null}

      <section className={ui.stats} aria-label="Resumen de pases">
        <Stat label="Pendientes" value={pending} />
        <Stat label="Listos" value={ready} />
        <Stat label="Anteriores" value={past} />
      </section>

      <ScopeFilter groups={groups} independents={independents} />

      {openLots.length === 0 ? (
        <Empty
          title="No hay pases pedidos"
          description="Cuando un lote invite, aunque falte confirmar o validar en la barrera, aparece en ese lote."
        />
      ) : (
        <div className={styles.lotStack}>
          {openLots.map((lot) => (
            <LotPassGroup
              key={lot.id}
              lot={lot}
              rows={lot.requested}
              showBarrio={showBarrio}
            />
          ))}
        </div>
      )}

      {pastLots.length > 0 ? (
        <details className={ops.history}>
          <summary>Anteriores · {past}</summary>
          <div className={styles.lotStack}>
            {pastLots.map((lot) => (
              <LotPassGroup
                key={`past-${lot.id}`}
                lot={lot}
                rows={lot.past}
                showBarrio={showBarrio}
              />
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}

function LotPassGroup({
  lot,
  rows,
  showBarrio,
}: {
  lot: LotBucket;
  rows: AdminPassRow[];
  showBarrio: boolean;
}) {
  return (
    <section className={styles.lotGroup}>
      <header className={styles.lotHead}>
        <div>
          {showBarrio ? (
            <p className={styles.lotKicker}>{lot.barrioName}</p>
          ) : null}
          <h2>{lot.label}</h2>
        </div>
        <span>
          {rows.length} {rows.length === 1 ? "pase" : "pases"}
        </span>
      </header>
      <ul className={styles.list}>
        {rows.map((invitation) => (
          <GuestRow key={invitation.id} invitation={invitation} />
        ))}
      </ul>
    </section>
  );
}

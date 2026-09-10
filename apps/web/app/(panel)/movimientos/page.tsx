import Link from "next/link";
import { connection } from "next/server";
import { DataTable } from "@/components/data-table";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { eventSpaceName, isBookingLabel } from "@/lib/amenities";
import {
  formatDate,
  formatDateTime,
  formatTime,
  lotLabel,
  personName,
} from "@/lib/format";
import {
  accessActionLabel,
  accessActionShort,
  isExitAction,
} from "@/lib/labels";
import { asOne } from "@/lib/relations";
import {
  canManageStructure,
  isAdmin,
  isNeighborhoodAdmin,
  isOwner,
  requireSession,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { ScopeFilter } from "../scope-filter";
import ops from "../ops-overview.module.css";

export const dynamic = "force-dynamic";

type Named = { id: string; name: string };

type GateRel = {
  id: string;
  name: string;
  type: string;
  complex_id: string | null;
  neighborhood_id: string | null;
  complexes: Named | Named[] | null;
  neighborhoods: Named | Named[] | null;
};

type InvitationRel = {
  id: string;
  guest_name: string | null;
  neighborhood_id: string | null;
  neighborhoods: Named | Named[] | null;
  properties: PropertyRel | PropertyRel[] | null;
};

type PropertyRel = {
  id: string;
  lot_number: string;
  street_name: string | null;
  neighborhood_id: string | null;
  neighborhoods:
    | (Named & {
        complex_id?: string | null;
        complexes?: Named | Named[] | null;
      })
    | (Named & {
        complex_id?: string | null;
        complexes?: Named | Named[] | null;
      })[]
    | null;
};

type LogRow = {
  id: string;
  action_type: string;
  timestamp: string;
  invitation_id: string | null;
  profile_id: string | null;
  property_id: string | null;
  gates: GateRel | GateRel[] | null;
  invitations: InvitationRel | InvitationRel[] | null;
  profiles:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
  resident:
    | { first_name: string; last_name: string }
    | { first_name: string; last_name: string }[]
    | null;
  properties: PropertyRel | PropertyRel[] | null;
};

type Place = {
  gateId: string;
  gateName: string;
  barrioId: string | null;
  barrioName: string | null;
  complexId: string | null;
  complexName: string | null;
  lotId: string | null;
  lotLabel: string | null;
};

function placeOf(log: LogRow): Place {
  const gate = asOne<GateRel>(log.gates);
  const invitation = asOne<InvitationRel>(log.invitations);
  const inviteProperty = asOne<PropertyRel>(invitation?.properties);
  const property = asOne<PropertyRel>(log.properties) ?? inviteProperty;
  const gateComplex = asOne<Named>(gate?.complexes);
  const gateBarrio = asOne<Named>(gate?.neighborhoods);
  const inviteBarrio = asOne<Named>(invitation?.neighborhoods);
  const propertyBarrio = asOne<
    Named & {
      complex_id?: string | null;
      complexes?: Named | Named[] | null;
    }
  >(property?.neighborhoods);
  const propertyComplex = asOne<Named>(propertyBarrio?.complexes);
  const barrioName =
    inviteBarrio?.name ?? propertyBarrio?.name ?? gateBarrio?.name ?? null;

  return {
    gateId: gate?.id ?? `unknown-${log.id}`,
    gateName: gate?.name ?? "Barrera",
    barrioId:
      invitation?.neighborhood_id ??
      inviteBarrio?.id ??
      property?.neighborhood_id ??
      propertyBarrio?.id ??
      gate?.neighborhood_id ??
      gateBarrio?.id ??
      null,
    barrioName,
    complexId:
      gate?.complex_id ??
      gateComplex?.id ??
      propertyBarrio?.complex_id ??
      propertyComplex?.id ??
      null,
    complexName: gateComplex?.name ?? propertyComplex?.name ?? null,
    lotId: property?.id ?? null,
    lotLabel: property
      ? lotLabel({
          lot_number: property.lot_number,
          street_name: property.street_name,
        })
      : null,
  };
}

function placeLine(place: Place, action?: string) {
  const parts: string[] = [];
  if (action) {
    parts.push(action);
  }
  parts.push(place.gateName);
  if (
    place.barrioName &&
    place.barrioName !== place.gateName &&
    !place.gateName.includes(place.barrioName)
  ) {
    parts.push(place.barrioName);
  }
  if (place.complexName) {
    parts.push(place.complexName);
  }
  return parts.join(" · ");
}

function subjectKind(log: LogRow) {
  if (log.profile_id) {
    return "Propietario";
  }
  if (isBookingLabel(asOne<InvitationRel>(log.invitations)?.guest_name)) {
    return "Evento";
  }
  return "Invitado";
}

function guestName(log: LogRow) {
  const invitation = asOne<InvitationRel>(log.invitations);
  if (isBookingLabel(invitation?.guest_name)) {
    return eventSpaceName(invitation?.guest_name);
  }
  if (invitation?.guest_name) {
    return invitation.guest_name;
  }

  const resident = asOne<{ first_name: string; last_name: string }>(
    log.resident,
  );
  if (resident) {
    return personName(resident);
  }

  return "Invitado";
}

function movementProperty(log: LogRow) {
  const invitation = asOne<InvitationRel>(log.invitations);
  return (
    asOne<PropertyRel>(log.properties) ??
    asOne<PropertyRel>(invitation?.properties) ??
    null
  );
}

function MovementFeedItem({ log }: { log: LogRow }) {
  const invitation = asOne<InvitationRel>(log.invitations);
  const property = movementProperty(log);
  const place = placeOf(log);
  const exited = isExitAction(log.action_type);
  const kind = subjectKind(log);
  const content = (
    <>
      <span className={`${ui.feedIcon} ${exited ? ui.feedOut : ""}`}>
        <Icon name={exited ? "exit" : "enter"} size={18} />
      </span>
      <span className={ui.feedBody}>
        <strong>
          {guestName(log)}
          {kind === "Propietario" ? " · Propietario" : ""}
        </strong>
        <span className={ui.feedMeta}>
          {placeLine(place, accessActionShort(log.action_type))}
          {place.lotLabel ? ` · Origen: ${place.lotLabel}` : ""}
        </span>
      </span>
      <span className={ui.feedTime}>{formatTime(log.timestamp)}</span>
    </>
  );

  if (invitation?.id) {
    return (
      <Link className={ui.feedItem} href={`/pases/${invitation.id}`}>
        {content}
      </Link>
    );
  }

  if (property?.id) {
    return (
      <Link className={ui.feedItem} href={`/lotes/${property.id}`}>
        {content}
      </Link>
    );
  }

  return <div className={ui.feedItem}>{content}</div>;
}

function movementTableRows(rows: LogRow[]) {
  return rows.map((log) => {
    const place = placeOf(log);
    const guard = asOne<{ first_name: string; last_name: string }>(
      log.profiles,
    );

    return {
      id: log.id,
      date: formatDate(log.timestamp),
      time: formatTime(log.timestamp),
      when: formatDateTime(log.timestamp),
      guest: guestName(log),
      kind: subjectKind(log),
      action: accessActionShort(log.action_type),
      detail: accessActionLabel(log.action_type),
      gate: place.gateName,
      barrio: place.barrioName ?? "—",
      complex: place.complexName ?? "—",
      lot: place.lotLabel ?? "—",
      guard: guard ? personName(guard) : "—",
    };
  });
}

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    updated?: string;
    resumen?: string;
    grupo?: string;
  }>;
}) {
  await connection();

  const flash = await searchParams;
  const session = await requireSession();
  const ownerOnly = isOwner(session) && !isAdmin(session);
  const barrioAdmin = isNeighborhoodAdmin(session);
  const structureAdmin = canManageStructure(session);
  const supabase = await createClient();
  const { data: logs, error: logsError } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, invitation_id, profile_id, property_id, gates(id, name, type, complex_id, neighborhood_id, complexes(id, name), neighborhoods(id, name)), invitations(id, guest_name, neighborhood_id, neighborhoods(id, name), properties(id, lot_number, street_name, neighborhood_id, neighborhoods(id, name, complex_id, complexes(id, name)))), profiles!access_logs_security_user_id_fkey(first_name, last_name), resident:profiles!access_logs_profile_id_fkey(first_name, last_name), properties(id, lot_number, street_name, neighborhood_id, neighborhoods(id, name, complex_id, complexes(id, name)))",
    )
    .order("timestamp", { ascending: false })
    .limit(200);

  const rows = (logs ?? []) as LogRow[];
  const queryError = logsError?.message
    ? `No se pudieron cargar movimientos: ${logsError.message}`
    : flash.error;

  if (ownerOnly || barrioAdmin) {
    return (
      <OwnerMovimientos
        rows={rows}
        flash={{ ...flash, error: queryError }}
        title="Movimientos"
        description={
          ownerOnly
            ? "Entradas y salidas de tu lote: invitados y propietarios."
            : "Entradas y salidas del barrio: invitados y propietarios."
        }
      />
    );
  }

  if (structureAdmin && flash.resumen === "1") {
    return (
      <OpsMovimientos rows={rows} grupo={flash.grupo} error={queryError} />
    );
  }

  return (
    <GuardBook
      rows={rows}
      showResumenLink={structureAdmin}
      grupo={flash.grupo}
      error={queryError}
    />
  );
}

function OwnerMovimientos({
  rows,
  flash,
  title,
  description,
}: {
  rows: LogRow[];
  flash: { error?: string; updated?: string };
  title: string;
  description: string;
}) {
  const tableRows = movementTableRows(rows);
  const entries = rows.filter((log) => !isExitAction(log.action_type)).length;
  const exits = rows.filter((log) => isExitAction(log.action_type)).length;
  const ownerEntries = rows.filter((log) => log.profile_id).length;

  return (
    <>
      <PageHeader title={title} description={description} />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.updated ? <Banner>Guardado.</Banner> : null}

      <section className={ui.stats} aria-label="Resumen">
        <Stat label="Registros" value={rows.length} />
        <Stat label="Entradas" value={entries} />
        <Stat label="Salidas" value={exits} />
        <Stat label="Propietario" value={ownerEntries} />
      </section>

      {tableRows.length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando alguien entre o salga por la barrera, el detalle aparece acá."
        />
      ) : (
        <DataTable
          filename="movimientos.csv"
          pageSize={15}
          rows={tableRows}
          searchPlaceholder="Filtrar por persona, barrera, barrio o lote"
          columns={[
            { key: "date", header: "Fecha" },
            { key: "time", header: "Hora" },
            { key: "guest", header: "Quién" },
            { key: "kind", header: "Tipo" },
            { key: "action", header: "Movimiento" },
            { key: "gate", header: "Barrera" },
            { key: "barrio", header: "Barrio" },
            { key: "complex", header: "Complejo" },
            { key: "lot", header: "Lote origen" },
          ]}
        />
      )}
    </>
  );
}

function OpsMovimientos({
  rows,
  grupo,
  error,
}: {
  rows: LogRow[];
  grupo?: string;
  error?: string;
}) {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const today = rows.filter((log) => new Date(log.timestamp) >= start);
  const scopedToday =
    grupo === "independent"
      ? today.filter((log) => !placeOf(log).complexId)
      : grupo
        ? today.filter((log) => placeOf(log).complexId === grupo)
        : today;
  const entries = scopedToday.filter(
    (log) => !isExitAction(log.action_type),
  ).length;
  const exits = scopedToday.filter((log) =>
    isExitAction(log.action_type),
  ).length;

  const byGate = new Map<
    string,
    {
      id: string;
      name: string;
      complexId: string | null;
      complexName: string | null;
      barrios: Map<string, number>;
      count: number;
    }
  >();
  for (const log of scopedToday) {
    const place = placeOf(log);
    const current = byGate.get(place.gateId) ?? {
      id: place.gateId,
      name: place.gateName,
      complexId: place.complexId,
      complexName: place.complexName,
      barrios: new Map<string, number>(),
      count: 0,
    };
    current.count += 1;
    if (place.barrioName) {
      current.barrios.set(
        place.barrioName,
        (current.barrios.get(place.barrioName) ?? 0) + 1,
      );
    }
    byGate.set(place.gateId, current);
  }
  const gates = [...byGate.values()].sort(
    (left, right) => right.count - left.count,
  );

  const groups = [
    ...new Map(
      rows
        .map(placeOf)
        .filter((item) => item.complexId && item.complexName)
        .map((item) => [
          item.complexId as string,
          {
            id: item.complexId as string,
            name: item.complexName as string,
            count: 0,
          },
        ]),
    ).values(),
  ].map((group) => ({
    ...group,
    count: today.filter((log) => placeOf(log).complexId === group.id).length,
  }));
  const independents = today.filter((log) => !placeOf(log).complexId).length;
  const preview = scopedToday.slice(0, 6);
  const tableHref = grupo ? `/movimientos?grupo=${grupo}` : "/movimientos";

  return (
    <div className={ops.board}>
      <PageHeader
        kicker="Operación"
        title="Resumen"
        description="Qué barrera y a qué barrio. El detalle está en la tabla."
        actions={
          <Link className={ops.quietLink} href={tableHref}>
            Ver tabla
          </Link>
        }
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <section className={ui.stats} aria-label="Movimientos de hoy">
        <Stat label="Hoy" value={scopedToday.length} />
        <Stat label="Entradas" value={entries} />
        <Stat label="Salidas" value={exits} />
      </section>

      <ScopeFilter groups={groups} independents={independents} />

      {gates.length === 0 ? (
        <Empty
          title="Hoy no hubo movimientos"
          description="Cuando seguridad escanee un QR, el resumen aparece acá."
        />
      ) : (
        <ul className={ops.cards}>
          {gates.map((gate) => {
            const barrioNames = [...gate.barrios.entries()].sort(
              (left, right) => right[1] - left[1],
            );
            const flag = gate.complexName ?? barrioNames[0]?.[0] ?? null;
            const barrioLine = barrioNames
              .map(([name, count]) =>
                barrioNames.length > 1 ? `${name} (${count})` : name,
              )
              .join(" · ");
            const showBarrios =
              barrioLine.length > 0 &&
              !(barrioNames.length === 1 && barrioNames[0]?.[0] === flag);

            return (
              <li key={gate.id}>
                <div className={ops.card}>
                  <div className={ops.cardTop}>
                    <h2>{gate.name}</h2>
                    {flag ? (
                      <span className={ops.flagComplex}>{flag}</span>
                    ) : (
                      <span className={ops.flagSolo}>Barrera</span>
                    )}
                  </div>
                  <p className={ops.cardMeta}>
                    {gate.count}{" "}
                    {gate.count === 1 ? "movimiento" : "movimientos"} hoy
                    {showBarrios ? ` · ${barrioLine}` : ""}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {preview.length > 0 ? (
        <section>
          <div className={ui.sectionHead}>
            <h2>Últimos de hoy</h2>
            <Link href={tableHref}>Tabla</Link>
          </div>
          <ul className={ui.feed}>
            {preview.map((log) => (
              <li key={log.id}>
                <MovementFeedItem log={log} />
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function GuardBook({
  rows,
  showResumenLink,
  grupo,
  error,
}: {
  rows: LogRow[];
  showResumenLink: boolean;
  grupo?: string;
  error?: string;
}) {
  const scoped =
    grupo === "independent"
      ? rows.filter((log) => !placeOf(log).complexId)
      : grupo
        ? rows.filter((log) => placeOf(log).complexId === grupo)
        : rows;
  const tableRows = movementTableRows(scoped);
  const resumenHref = grupo
    ? `/movimientos?resumen=1&grupo=${grupo}`
    : "/movimientos?resumen=1";

  return (
    <>
      <PageHeader
        title="Movimientos"
        description="Entradas y salidas con barrera, barrio y complejo."
        actions={
          showResumenLink ? (
            <Link className={ops.quietLink} href={resumenHref}>
              Ver resumen
            </Link>
          ) : undefined
        }
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}

      <section className={ui.stats} aria-label="Resumen">
        <Stat label="Registros" value={scoped.length} />
        <Stat
          label="Entradas"
          value={scoped.filter((log) => !isExitAction(log.action_type)).length}
        />
        <Stat
          label="Salidas"
          value={scoped.filter((log) => isExitAction(log.action_type)).length}
        />
        <Stat
          label="Propietario"
          value={scoped.filter((log) => log.profile_id).length}
        />
      </section>

      {tableRows.length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando seguridad escanee un QR, va a aparecer acá."
        />
      ) : (
        <DataTable
          filename="movimientos.csv"
          pageSize={15}
          rows={tableRows}
          searchPlaceholder="Filtrar por persona, barrera, barrio o guardia"
          columns={[
            { key: "date", header: "Fecha" },
            { key: "time", header: "Hora" },
            { key: "guest", header: "Quién" },
            { key: "kind", header: "Tipo" },
            { key: "action", header: "Movimiento" },
            { key: "gate", header: "Barrera" },
            { key: "barrio", header: "Barrio" },
            { key: "complex", header: "Complejo" },
            { key: "lot", header: "Lote origen" },
            { key: "guard", header: "Guardia" },
          ]}
        />
      )}
    </>
  );
}

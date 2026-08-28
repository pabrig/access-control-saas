import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { eventSpaceName, isBookingLabel } from "@/lib/amenities";
import {
  formatDateTime,
  formatDayHeading,
  formatTime,
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
  properties:
    | { id: string; lot_number: string }
    | { id: string; lot_number: string }[]
    | null;
};

function placeOf(log: LogRow) {
  const gate = asOne<GateRel>(log.gates);
  const invitation = asOne<InvitationRel>(log.invitations);
  const property = asOne<{
    neighborhood_id?: string | null;
    neighborhoods?: Named | Named[] | null;
  }>(log.properties);
  const complex = asOne<Named>(gate?.complexes);
  const gateBarrio = asOne<Named>(gate?.neighborhoods);
  const inviteBarrio = asOne<Named>(invitation?.neighborhoods);
  const propertyBarrio = asOne<Named>(property?.neighborhoods);
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
    complexId: gate?.complex_id ?? complex?.id ?? null,
    complexName: complex?.name ?? null,
  };
}

function placeLine(place: ReturnType<typeof placeOf>, action?: string) {
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
  return parts.join(" · ");
}

function guestName(log: LogRow) {
  const invitation = asOne<InvitationRel>(log.invitations);
  if (isBookingLabel(invitation?.guest_name)) {
    return eventSpaceName(invitation?.guest_name);
  }
  if (invitation?.guest_name) {
    return invitation.guest_name;
  }

  const resident = asOne<{ first_name: string; last_name: string }>(log.resident);
  if (resident) {
    return `${personName(resident)} (propietario)`;
  }

  return "Invitado";
}

function MovementFeedItem({ log }: { log: LogRow }) {
  const invitation = asOne<InvitationRel>(log.invitations);
  const property = asOne<{ id: string; lot_number: string }>(log.properties);
  const exited = isExitAction(log.action_type);
  const content = (
    <>
      <span className={`${ui.feedIcon} ${exited ? ui.feedOut : ""}`}>
        <Icon name={exited ? "exit" : "enter"} size={18} />
      </span>
      <span className={ui.feedBody}>
        <strong>{guestName(log)}</strong>
        <span className={ui.feedMeta}>
          {placeLine(placeOf(log), accessActionShort(log.action_type))}
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

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    updated?: string;
    registro?: string;
    grupo?: string;
  }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const feedView =
    (isOwner(session) && !isAdmin(session)) || isNeighborhoodAdmin(session);
  const structureAdmin = canManageStructure(session);
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, invitation_id, profile_id, property_id, gates(id, name, type, complex_id, neighborhood_id, complexes(id, name), neighborhoods(id, name)), invitations(id, guest_name, neighborhood_id, neighborhoods(id, name)), profiles!access_logs_security_user_id_fkey(first_name, last_name), resident:profiles!access_logs_profile_id_fkey(first_name, last_name), properties(id, lot_number, street_name, neighborhood_id, neighborhoods(id, name))",
    )
    .order("timestamp", { ascending: false })
    .limit(200);

  const rows = (logs ?? []) as LogRow[];

  if (feedView) {
    return (
      <FeedLogs
        rows={rows}
        flash={flash}
        neighborhood={isNeighborhoodAdmin(session)}
      />
    );
  }

  if (structureAdmin && flash.registro !== "1") {
    return <OpsMovimientos rows={rows} grupo={flash.grupo} />;
  }

  return <GuardBook rows={rows} back={structureAdmin} grupo={flash.grupo} />;
}

function OpsMovimientos({ rows, grupo }: { rows: LogRow[]; grupo?: string }) {
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
  const registroHref = grupo
    ? `/movimientos?registro=1&grupo=${grupo}`
    : "/movimientos?registro=1";

  return (
    <div className={ops.board}>
      <PageHeader
        kicker="Operación"
        title="Libro de guardia"
        description="Qué barrera y a qué barrio. El registro completo queda para revisar."
        actions={
          <Link className={ops.quietLink} href={registroHref}>
            Ver registro completo
          </Link>
        }
      />

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
            <Link href={registroHref}>Registro</Link>
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
  back,
  grupo,
}: {
  rows: LogRow[];
  back: boolean;
  grupo?: string;
}) {
  const scoped =
    grupo === "independent"
      ? rows.filter((log) => !placeOf(log).complexId)
      : grupo
        ? rows.filter((log) => placeOf(log).complexId === grupo)
        : rows;
  const tableRows = scoped.map((log) => {
    const place = placeOf(log);
    const guard = asOne<{ first_name: string; last_name: string }>(
      log.profiles,
    );

    return {
      id: log.id,
      guest: guestName(log),
      action: accessActionLabel(log.action_type),
      gate: place.gateName,
      barrio: place.barrioName ?? "—",
      guard: guard ? personName(guard) : "—",
      when: formatDateTime(log.timestamp),
    };
  });

  return (
    <>
      {back ? (
        <Link
          className={ui.backLink}
          href={grupo ? `/movimientos?grupo=${grupo}` : "/movimientos"}
        >
          <Icon name="back" size={18} />
          Libro de guardia
        </Link>
      ) : null}
      <PageHeader
        kicker="Historial"
        title={back ? "Registro completo" : "Libro de guardia"}
        description="Entradas y salidas con barrera y barrio."
      />

      {tableRows.length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando seguridad escanee una invitación, va a aparecer acá."
        />
      ) : (
        <DataTable
          filename="libro-de-guardia.csv"
          pageSize={15}
          rows={tableRows}
          searchPlaceholder="Filtrar por invitado, barrera, barrio o guardia"
          columns={[
            { key: "when", header: "Cuando" },
            { key: "guest", header: "Invitado" },
            { key: "action", header: "Movimiento" },
            { key: "gate", header: "Barrera" },
            { key: "barrio", header: "Barrio" },
            { key: "guard", header: "Guardia" },
          ]}
        />
      )}
    </>
  );
}

function FeedLogs({
  rows,
  flash,
  neighborhood,
}: {
  rows: LogRow[];
  flash: { error?: string; updated?: string };
  neighborhood: boolean;
}) {
  const days: Array<{ heading: string; items: LogRow[] }> = [];

  for (const log of rows) {
    const heading = formatDayHeading(log.timestamp);
    const last = days.at(-1);
    if (last?.heading === heading) {
      last.items.push(log);
    } else {
      days.push({ heading, items: [log] });
    }
  }

  return (
    <>
      <PageHeader title={neighborhood ? "Movimientos" : "Historial"} />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.updated ? <Banner>Guardado.</Banner> : null}
      {days.length === 0 ? (
        <p className={ui.quiet}>Cuando escaneen un QR, aparece acá.</p>
      ) : (
        days.map((day) => (
          <section key={day.heading}>
            <h2 className={ui.groupTitle}>{day.heading}</h2>
            <ul className={ui.feed}>
              {day.items.map((log) => (
                <li key={log.id}>
                  <MovementFeedItem log={log} />
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </>
  );
}

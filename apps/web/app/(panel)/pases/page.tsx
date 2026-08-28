import Link from "next/link";
import { Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isBookingLabel } from "@/lib/amenities";
import { passStatus } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { canManageStructure, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { GuestRow } from "./guest-row";
import { PassComposer } from "./pass-composer";
import { ScopeFilter } from "../scope-filter";
import ops from "../ops-overview.module.css";
import styles from "./pases.module.css";

type InvitationRow = {
  id: string;
  guest_name: string | null;
  valid_from: string;
  valid_to: string;
  is_revoked: boolean;
  is_single_use: boolean;
  status: "DRAFT" | "READY";
  neighborhood_id: string;
  neighborhoods:
    | {
        name: string;
        complex_id: string | null;
        complexes:
          | { id: string; name: string }
          | { id: string; name: string }[]
          | null;
      }
    | {
        name: string;
        complex_id: string | null;
        complexes:
          | { id: string; name: string }
          | { id: string; name: string }[]
          | null;
      }[]
    | null;
};

function placeOf(row: InvitationRow) {
  const neighborhood = asOne<{
    name: string;
    complex_id: string | null;
    complexes:
      | { id: string; name: string }
      | { id: string; name: string }[]
      | null;
  }>(row.neighborhoods);
  const complex = asOne<{ id: string; name: string }>(neighborhood?.complexes);
  return {
    barrioId: row.neighborhood_id,
    barrioName: neighborhood?.name ?? "Barrio",
    complexId: neighborhood?.complex_id ?? complex?.id ?? null,
    complexName: complex?.name ?? null,
  };
}

function isLive(row: InvitationRow) {
  const status = passStatus(row);
  return status === "active" || status === "scheduled" || status === "waiting";
}

function isPast(row: InvitationRow) {
  const status = passStatus(row);
  return status === "expired" || status === "revoked";
}

export default async function PasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    tipo?: string;
    nuevo?: string;
    barrio?: string;
    grupo?: string;
    ver?: string;
  }>;
}) {
  const flash = await searchParams;
  const creating = flash.nuevo === "1" || Boolean(flash.tipo);
  const session = await requireSession();
  const structureAdmin = canManageStructure(session);
  const supabase = await createClient();

  const [{ data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("invitations")
        .select(
          "id, guest_name, valid_from, valid_to, is_revoked, is_single_use, status, neighborhood_id, neighborhoods(name, complex_id, complexes(id, name))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("id, lot_number, street_name")
        .order("lot_number"),
    ]);

  const canCreate = (properties ?? []).length > 0;
  const lots = properties ?? [];
  const kind = flash.tipo === "proveedor" ? "provider" : "visit";
  const people = ((invitations ?? []) as InvitationRow[]).filter(
    (row) => !isBookingLabel(row.guest_name),
  );
  const live = people.filter(isLive);
  const history = people.filter(isPast);

  if (creating) {
    return (
      <>
        <Link className={ui.backLink} href="/pases">
          <Icon name="back" size={18} />
          {structureAdmin ? "Pases" : "Invitados"}
        </Link>
        <PageHeader title={structureAdmin ? "Nuevo pase" : "Invitar"} />
        {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
        {canCreate ? (
          <PassComposer key={kind} lots={lots} kind={kind} />
        ) : (
          <Empty
            title="No hay un lote para invitar"
            description="Pedile al admin que te asigne el lote."
          />
        )}
      </>
    );
  }

  if (structureAdmin) {
    return (
      <OpsPases
        error={flash.error}
        created={flash.created}
        updated={flash.updated}
        queryError={error?.message}
        grupo={flash.grupo}
        barrioId={flash.barrio}
        showAll={flash.ver === "1"}
        people={people}
        live={live}
        history={history}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Invitados"
        actions={
          canCreate ? (
            <Link className={ui.button} href="/pases?nuevo=1">
              <Icon name="plus" size={18} />
              Invitar
            </Link>
          ) : null
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? (
        <Banner>Listo. Tocá la tarjeta para compartir.</Banner>
      ) : null}
      {flash.updated ? <Banner>Guardado.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {live.length === 0 ? (
        <Empty
          title="Nadie está invitado"
          description="Tocá Invitar para mandar un link."
        />
      ) : (
        <ul className={styles.list}>
          {live.map((invitation) => (
            <GuestRow key={invitation.id} invitation={invitation} />
          ))}
        </ul>
      )}

      {history.length > 0 ? (
        <section>
          <h2 className={ui.groupTitle}>Anteriores</h2>
          <ul className={styles.list}>
            {history.map((invitation) => (
              <GuestRow key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function OpsPases({
  error,
  created,
  updated,
  queryError,
  grupo,
  barrioId,
  showAll,
  people,
  live,
  history,
}: {
  error?: string;
  created?: string;
  updated?: string;
  queryError?: string;
  grupo?: string;
  barrioId?: string;
  showAll: boolean;
  people: InvitationRow[];
  live: InvitationRow[];
  history: InvitationRow[];
}) {
  const byBarrio = new Map<
    string,
    {
      id: string;
      name: string;
      complexId: string | null;
      complexName: string | null;
      live: number;
      past: number;
    }
  >();

  for (const row of people) {
    const place = placeOf(row);
    const current = byBarrio.get(place.barrioId) ?? {
      id: place.barrioId,
      name: place.barrioName,
      complexId: place.complexId,
      complexName: place.complexName,
      live: 0,
      past: 0,
    };
    if (isLive(row)) {
      current.live += 1;
    } else if (isPast(row)) {
      current.past += 1;
    }
    byBarrio.set(place.barrioId, current);
  }

  const barrios = [...byBarrio.values()].sort(
    (left, right) =>
      right.live - left.live || left.name.localeCompare(right.name),
  );
  const groups = [
    ...new Map(
      barrios
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
    count: barrios.filter((item) => item.complexId === group.id).length,
  }));
  const independents = barrios.filter((item) => !item.complexId).length;
  const scopedBarrios =
    grupo === "independent"
      ? barrios.filter((item) => !item.complexId)
      : grupo
        ? barrios.filter((item) => item.complexId === grupo)
        : barrios;

  const selected = barrioId
    ? barrios.find((item) => item.id === barrioId)
    : null;
  const scopedPeople = selected
    ? people.filter((row) => row.neighborhood_id === selected.id)
    : grupo === "independent"
      ? people.filter((row) => !placeOf(row).complexId)
      : grupo
        ? people.filter((row) => placeOf(row).complexId === grupo)
        : people;
  const scopedLive = scopedPeople.filter(isLive);
  const scopedPast = scopedPeople.filter(isPast);

  if (selected || showAll) {
    const title = selected ? selected.name : "Listado completo";
    const backHref = selected && grupo ? `/pases?grupo=${grupo}` : "/pases";

    return (
      <>
        <Link className={ui.backLink} href={backHref}>
          <Icon name="back" size={18} />
          Pases
        </Link>
        <PageHeader
          kicker={selected?.complexName ?? "Revisión"}
          title={title}
          description="Detalle de pases de este alcance. El resumen está en Pases."
          actions={
            <Link className={ui.button} href="/pases?nuevo=1">
              <Icon name="plus" size={18} />
              Nuevo pase
            </Link>
          }
        />
        {error ? <Banner tone="danger">{error}</Banner> : null}
        {created ? (
          <Banner>Listo. Tocá la tarjeta para compartir.</Banner>
        ) : null}
        {updated ? <Banner>Guardado.</Banner> : null}
        {queryError ? <Banner tone="danger">{queryError}</Banner> : null}

        {scopedLive.length === 0 ? (
          <Empty
            title="No hay pases vigentes"
            description="Los vencidos o revocados quedan en anteriores."
          />
        ) : (
          <ul className={styles.list}>
            {scopedLive.map((invitation) => (
              <GuestRow key={invitation.id} invitation={invitation} />
            ))}
          </ul>
        )}

        {scopedPast.length > 0 ? (
          <details className={ops.history}>
            <summary>Anteriores · {scopedPast.length}</summary>
            <ul className={styles.list}>
              {scopedPast.map((invitation) => (
                <GuestRow key={invitation.id} invitation={invitation} />
              ))}
            </ul>
          </details>
        ) : null}
      </>
    );
  }

  const scheduled = live.filter(
    (row) => passStatus(row) === "scheduled",
  ).length;
  const active = live.length - scheduled;

  return (
    <div className={ops.board}>
      <PageHeader
        kicker="Operación"
        title="Pases"
        description="Resumen por barrio. Entrá a uno para revisar el detalle."
        actions={
          <>
            <Link className={ops.quietLink} href="/pases?ver=1">
              Ver listado completo
            </Link>
            <Link className={ui.button} href="/pases?nuevo=1">
              <Icon name="plus" size={18} />
              Nuevo pase
            </Link>
          </>
        }
      />
      {error ? <Banner tone="danger">{error}</Banner> : null}
      {created ? <Banner>Listo. Tocá la tarjeta para compartir.</Banner> : null}
      {updated ? <Banner>Guardado.</Banner> : null}
      {queryError ? <Banner tone="danger">{queryError}</Banner> : null}

      <section className={ui.stats} aria-label="Resumen de pases">
        <Stat label="Vigentes" value={active} />
        <Stat label="Programados" value={scheduled} />
        <Stat label="Anteriores" value={history.length} />
      </section>

      <ScopeFilter groups={groups} independents={independents} />

      {scopedBarrios.length === 0 ? (
        <Empty
          title="No hay pases en este alcance"
          description="Cuando un residente invite, el barrio aparece acá."
        />
      ) : (
        <ul className={ops.cards}>
          {scopedBarrios.map((barrio) => (
            <li key={barrio.id}>
              <Link className={ops.card} href={`/pases?barrio=${barrio.id}`}>
                <div className={ops.cardTop}>
                  <h2>{barrio.name}</h2>
                  <span
                    className={
                      barrio.complexName ? ops.flagComplex : ops.flagSolo
                    }
                  >
                    {barrio.complexName ?? "Independiente"}
                  </span>
                </div>
                <p className={ops.cardMeta}>
                  {barrio.live} {barrio.live === 1 ? "vigente" : "vigentes"}
                  {barrio.past > 0 ? ` · ${barrio.past} anteriores` : ""}
                </p>
                <span className={ops.cardAction}>Revisar</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PendingLink } from "@/components/pending-link";
import ui from "@/components/ui.module.css";
import { isBookingLabel, withoutEventPeople } from "@/lib/amenities";
import { passStatus } from "@/lib/labels";
import { isAdmin, isNeighborhoodAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { AdminPasses, type AdminPassRow } from "./admin-passes";
import { GuestRow } from "./guest-row";
import { PassComposer } from "./pass-composer";
import styles from "./pases.module.css";

function isLive(row: AdminPassRow) {
  const status = passStatus(row);
  return status === "active" || status === "scheduled" || status === "waiting";
}

function isPast(row: AdminPassRow) {
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
    grupo?: string;
  }>;
}) {
  const flash = await searchParams;
  const creating = flash.nuevo === "1" || Boolean(flash.tipo);
  const session = await requireSession();
  const admin = isAdmin(session);
  const supabase = await createClient();

  const [{ data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("invitations")
        .select(
          "id, guest_name, valid_from, valid_to, is_revoked, is_single_use, status, property_id, neighborhood_id, properties(lot_number, street_name), neighborhoods(name, complex_id, complexes(id, name))",
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
  const rows = (invitations ?? []) as AdminPassRow[];
  const requested = rows.filter((row) => !isBookingLabel(row.guest_name));
  const people = admin ? requested : withoutEventPeople(rows);
  const live = people.filter(isLive);
  const history = people.filter(isPast);

  if (creating) {
    return (
      <>
        <Link className={ui.backLink} href="/pases">
          <Icon name="back" size={18} />
          {admin ? "Pases" : "Invitados"}
        </Link>
        <PageHeader title={admin ? "Nuevo pase" : "Invitar"} />
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

  if (admin) {
    return (
      <AdminPasses
        error={flash.error}
        created={flash.created}
        updated={flash.updated}
        queryError={error?.message}
        grupo={flash.grupo}
        people={people}
        showBarrio={!isNeighborhoodAdmin(session)}
      />
    );
  }

  return (
    <>
      <PageHeader
        title="Invitados"
        actions={
          canCreate ? (
            <PendingLink className={ui.button} href="/pases?nuevo=1">
              <Icon name="plus" size={18} />
              Invitar
            </PendingLink>
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

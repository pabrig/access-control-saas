import Link from "next/link";
import { Badge, Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isBookingLabel } from "@/lib/amenities";
import { formatRange, initials } from "@/lib/format";
import { passStatus } from "@/lib/labels";
import { createClient } from "@/lib/supabase/server";
import { PassComposer } from "./pass-composer";
import styles from "./pases.module.css";

export default async function PasesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    tipo?: string;
    nuevo?: string;
  }>;
}) {
  const {
    error: formError,
    created,
    updated,
    tipo,
    nuevo,
  } = await searchParams;
  const creating = nuevo === "1" || Boolean(tipo);
  const supabase = await createClient();

  const [{ data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("invitations")
        .select(
          "id, guest_name, valid_from, valid_to, is_revoked, is_single_use, status",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("id, lot_number, street_name")
        .order("lot_number"),
    ]);

  const canCreate = (properties ?? []).length > 0;
  const lots = properties ?? [];
  const kind = tipo === "proveedor" ? "provider" : "visit";
  const people = (invitations ?? []).filter(
    (row) => !isBookingLabel(row.guest_name),
  );
  const live = people.filter((row) => {
    const status = passStatus(row);
    return (
      status === "active" || status === "scheduled" || status === "waiting"
    );
  });
  const history = people.filter((row) => {
    const status = passStatus(row);
    return status === "expired" || status === "revoked";
  });

  if (creating) {
    return (
      <>
        <Link className={ui.backLink} href="/pases">
          <Icon name="back" size={18} />
          Invitados
        </Link>
        <PageHeader title="Invitar" />
        {formError ? <Banner tone="danger">{formError}</Banner> : null}
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

      {formError ? <Banner tone="danger">{formError}</Banner> : null}
      {created ? <Banner>Listo. Tocá la tarjeta para compartir.</Banner> : null}
      {updated ? <Banner>Guardado.</Banner> : null}
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

function GuestRow({
  invitation,
}: {
  invitation: {
    id: string;
    guest_name: string | null;
    valid_from: string;
    valid_to: string;
    is_revoked: boolean;
    is_single_use: boolean;
    status: "DRAFT" | "READY";
  };
}) {
  const status = passStatus(invitation);
  const name = invitation.guest_name ?? "Sin aceptar";

  return (
    <li>
      <Link className={styles.guest} href={`/pases/${invitation.id}`}>
        <span className={styles.avatar} aria-hidden>
          {initials(invitation.guest_name)}
        </span>
        <span className={styles.guestBody}>
          <span className={styles.guestTop}>
            <strong>{name}</strong>
            <Badge status={status} />
          </span>
          <span className={styles.guestMeta}>
            {formatRange(invitation.valid_from, invitation.valid_to)}
            {invitation.is_single_use ? " · 1 ingreso" : ""}
          </span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
    </li>
  );
}

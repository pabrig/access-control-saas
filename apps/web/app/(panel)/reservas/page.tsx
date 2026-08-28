import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import {
  bookingSentence,
  eventSpaceName,
  isBookingLabel,
} from "@/lib/amenities";
import { formatRange, lotLabel, personName } from "@/lib/format";
import { passStatus } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { isNeighborhoodAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PassEditForm } from "../pases/pass-edit-form";
import { revokeInvitation } from "../pases/actions";
import { BookingCalendar } from "./booking-calendar";

type BookingRow = {
  id: string;
  guest_name: string | null;
  valid_from: string;
  valid_to: string;
  is_revoked: boolean;
  status: "DRAFT" | "READY";
  properties?: unknown;
  profiles?: unknown;
};

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    updated?: string;
    nuevo?: string;
  }>;
}) {
  const flash = await searchParams;
  const creating = flash.nuevo === "1";
  const session = await requireSession();
  const barrio = isNeighborhoodAdmin(session);
  const supabase = await createClient();
  const [{ data: properties }, { data: invitations }] = await Promise.all([
    supabase
      .from("properties")
      .select("id, lot_number, street_name")
      .order("lot_number"),
    supabase
      .from("invitations")
      .select(
        "id, guest_name, valid_from, valid_to, is_revoked, status, properties(lot_number, street_name), profiles!invitations_created_by_user_id_fkey(first_name, last_name)",
      )
      .order("valid_from", { ascending: false })
      .limit(80),
  ]);

  const propertyId = properties?.[0]?.id;
  const bookings = ((invitations ?? []) as BookingRow[]).filter((row) =>
    isBookingLabel(row.guest_name),
  );
  const upcoming = bookings.filter((row) => {
    const status = passStatus(row);
    return status === "active" || status === "scheduled";
  });
  const history = bookings.filter((row) => {
    const status = passStatus(row);
    return status === "expired" || status === "revoked";
  });
  const taken = bookings
    .filter((row) => !row.is_revoked)
    .map((row) => ({
      amenity: eventSpaceName(row.guest_name),
      from: row.valid_from,
      to: row.valid_to,
    }));

  if (creating && !barrio) {
    return (
      <>
        <Link className={ui.backLink} href="/reservas">
          <Icon name="back" size={18} />
          Eventos
        </Link>
        <PageHeader title="Crear evento" />
        {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
        {!propertyId ? (
          <Empty
            title="No hay un lote para crear el evento"
            description="Pedile al admin que te asigne el lote."
          />
        ) : (
          <section className={ui.card}>
            <BookingCalendar propertyId={propertyId} taken={taken} />
          </section>
        )}
      </>
    );
  }

  if (barrio) {
    return (
      <>
        <PageHeader
          title="Reservas"
          description="Quién usó el SUM y las parrillas en tu barrio."
        />
        {upcoming.length === 0 ? (
          <p className={ui.quiet}>Nadie reservó un espacio todavía.</p>
        ) : (
          <ul className={ui.feed}>
            {upcoming.map((row) => (
              <BookingFeedItem key={row.id} row={row} />
            ))}
          </ul>
        )}
        {history.length > 0 ? (
          <section>
            <h2 className={ui.groupTitle}>Anteriores</h2>
            <ul className={ui.feed}>
              {history.map((row) => (
                <BookingFeedItem key={row.id} row={row} />
              ))}
            </ul>
          </section>
        ) : null}
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Eventos"
        actions={
          propertyId ? (
            <Link className={ui.button} href="/reservas?nuevo=1">
              <Icon name="plus" size={18} />
              Crear
            </Link>
          ) : null
        }
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? (
        <Banner>
          Evento listo. Los invitados aparecen en Invitados para compartir el
          QR.
        </Banner>
      ) : null}
      {flash.updated ? <Banner>Evento actualizado.</Banner> : null}

      {!propertyId ? (
        <Empty
          title="No hay un lote para crear el evento"
          description="Pedile al admin que te asigne el lote."
        />
      ) : upcoming.length === 0 ? (
        <Empty
          title="No hay eventos próximos"
          description="Creá un evento para reservar el SUM o una parrilla."
        />
      ) : (
        <ul className={ui.list}>
          {upcoming.map((row) => (
            <EventCard key={row.id} row={row} editable />
          ))}
        </ul>
      )}

      {history.length > 0 ? (
        <section>
          <h2 className={ui.groupTitle}>Historial</h2>
          <ul className={ui.list}>
            {history.map((row) => (
              <EventCard
                key={row.id}
                row={row}
                editable={passStatus(row) !== "revoked"}
              />
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

function BookingFeedItem({ row }: { row: BookingRow }) {
  const booker = asOne<{
    first_name: string | null;
    last_name: string | null;
  }>(row.profiles);
  const property = asOne<{
    lot_number: string;
    street_name: string | null;
  }>(row.properties);
  const resident = personName(booker ?? {}) || "Un vecino";
  const space = eventSpaceName(row.guest_name);

  return (
    <li>
      <div className={ui.feedItem}>
        <span className={ui.feedIcon} aria-hidden>
          <Icon name="calendar" size={18} />
        </span>
        <span className={ui.feedBody}>
          <strong>{bookingSentence(resident, space)}</strong>
          <span className={ui.feedMeta}>
            {property ? `${lotLabel(property)} · ` : ""}
            {formatRange(row.valid_from, row.valid_to)}
          </span>
        </span>
      </div>
    </li>
  );
}

function EventCard({ row, editable }: { row: BookingRow; editable: boolean }) {
  const status = passStatus(row);

  return (
    <li className={ui.card}>
      <div>
        <h2>{eventSpaceName(row.guest_name)}</h2>
        <p className={ui.muted}>{formatRange(row.valid_from, row.valid_to)}</p>
      </div>
      {status === "active" || status === "scheduled" ? (
        <form action={revokeInvitation}>
          <input type="hidden" name="id" value={row.id} />
          <input type="hidden" name="next" value="/reservas" />
          <button className={ui.buttonDanger} type="submit">
            Cancelar
          </button>
        </form>
      ) : null}
      {editable ? (
        <details>
          <summary>Editar horario</summary>
          <PassEditForm
            id={row.id}
            guestName={row.guest_name}
            validFrom={row.valid_from}
            validTo={row.valid_to}
            allowName={false}
            next="/reservas"
          />
        </details>
      ) : null}
    </li>
  );
}

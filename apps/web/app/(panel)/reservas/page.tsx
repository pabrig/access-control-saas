import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { AMENITIES, bookingLabel } from "@/lib/amenities";
import { formatDateTime } from "@/lib/format";
import { requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { BookingCalendar } from "./booking-calendar";

export default async function ReservasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const flash = await searchParams;
  await requireSession();
  const supabase = await createClient();
  const [{ data: properties }, { data: invitations }] = await Promise.all([
    supabase.from("properties").select("id, lot_number").order("lot_number"),
    supabase
      .from("invitations")
      .select("guest_name, valid_from, valid_to, is_revoked")
      .eq("is_revoked", false)
      .order("valid_from", { ascending: false })
      .limit(80),
  ]);

  const propertyId = properties?.[0]?.id;
  const amenityNames = new Set(
    AMENITIES.map((item) => bookingLabel(item.name)),
  );
  const bookings = (invitations ?? []).filter(
    (row) => row.guest_name && amenityNames.has(row.guest_name),
  );

  return (
    <>
      <PageHeader
        kicker="Comunidad"
        title="Amenities"
        description="Elegí SUM o parrilla, un horario, y las invitaciones de tus invitados se crean solas."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? (
        <Banner>
          Reserva lista. Los invitados aparecen en Pases para compartir el QR.
        </Banner>
      ) : null}
      {!propertyId ? (
        <Empty
          title="No hay un lote para reservar"
          description="Pedile al admin que te asigne el lote."
        />
      ) : (
        <section className={ui.card}>
          <BookingCalendar
            propertyId={propertyId}
            taken={bookings.map((row) => ({
              amenity: row.guest_name?.replace("Reserva · ", "") ?? "",
              from: row.valid_from,
              to: row.valid_to,
            }))}
          />
        </section>
      )}
      <section className={ui.card} style={{ marginTop: 16 }}>
        <h2>Próximas reservas</h2>
        {bookings.length === 0 ? (
          <p className={ui.muted}>Todavía no reservaste un espacio.</p>
        ) : (
          <ul>
            {bookings.map((row) => (
              <li
                className={ui.row}
                key={`${row.guest_name}-${row.valid_from}`}
              >
                <div>
                  <strong>{row.guest_name}</strong>
                  <p className={ui.muted}>
                    {formatDateTime(row.valid_from)} →{" "}
                    {formatDateTime(row.valid_to)}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

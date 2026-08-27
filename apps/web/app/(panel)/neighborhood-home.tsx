import Link from "next/link";
import { Badge, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import {
  bookingSentence,
  eventSpaceName,
  isBookingLabel,
} from "@/lib/amenities";
import {
  formatRange,
  formatTime,
  initials,
  lotLabel,
  personName,
} from "@/lib/format";
import {
  accessActionShort,
  isExitAction,
  passStatus,
} from "@/lib/labels";
import { asOne } from "@/lib/relations";
import {
  assignedNeighborhoodId,
  type Session,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export async function NeighborhoodHome({ session }: { session: Session }) {
  const supabase = await createClient();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const neighborhoodId = assignedNeighborhoodId(session);

  const [
    { data: neighborhood },
    { count: lotCount },
    { count: todayMoves },
    { data: invitations },
    { data: logs },
  ] = await Promise.all([
    neighborhoodId
      ? supabase
          .from("neighborhoods")
          .select("name")
          .eq("id", neighborhoodId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .gte("timestamp", startOfDay.toISOString()),
    supabase
      .from("invitations")
      .select(
        "id, guest_name, valid_from, valid_to, is_revoked, status, created_by_user_id, properties(lot_number, street_name), profiles!invitations_created_by_user_id_fkey(first_name, last_name)",
      )
      .order("valid_from", { ascending: true })
      .limit(80),
    supabase
      .from("access_logs")
      .select(
        "id, action_type, timestamp, invitation_id, invitations(id, guest_name)",
      )
      .gte("timestamp", startOfDay.toISOString())
      .order("timestamp", { ascending: false })
      .limit(8),
  ]);

  const people = (invitations ?? []).filter(
    (row) => !isBookingLabel(row.guest_name),
  );
  const livePeople = people.filter((row) => {
    const status = passStatus(row);
    return (
      status === "active" || status === "scheduled" || status === "waiting"
    );
  });
  const bookings = (invitations ?? []).filter((row) =>
    isBookingLabel(row.guest_name),
  );
  const upcomingBookings = bookings.filter((row) => {
    const status = passStatus(row);
    return status === "active" || status === "scheduled";
  });

  const barrio = neighborhood?.name ?? "Tu barrio";

  return (
    <>
      <PageHeader
        kicker={barrio}
        title={`Hola, ${session.firstName}`}
        description="Lo de tu barrio, de un vistazo."
      />

      <section className={ui.stats}>
        <Stat
          href="/pases"
          label="Invitados vigentes"
          value={livePeople.length}
        />
        <Stat
          href="/movimientos"
          label="Hoy en la puerta"
          value={todayMoves ?? 0}
        />
        <Stat
          href="/reservas"
          label="Reservas"
          value={upcomingBookings.length}
        />
        <Stat href="/lotes" label="Lotes" value={lotCount ?? 0} />
      </section>

      <div className={ui.modules}>
        <section>
          <div className={ui.sectionHead}>
            <h2>Reservas</h2>
            <Link href="/reservas">Ver todas</Link>
          </div>
          {upcomingBookings.length === 0 ? (
            <p className={ui.quiet}>Nadie reservó el SUM ni las parrillas.</p>
          ) : (
            <ul className={ui.feed}>
              {upcomingBookings.slice(0, 6).map((row) => {
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
                  <li key={row.id}>
                    <Link className={ui.feedItem} href="/reservas">
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
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className={ui.sectionHead}>
            <h2>En la puerta</h2>
            <Link href="/movimientos">Historial</Link>
          </div>
          {(logs ?? []).length === 0 ? (
            <p className={ui.quiet}>Todavía no hubo ingresos hoy.</p>
          ) : (
            <ul className={ui.feed}>
              {(logs ?? []).map((log) => {
                const invitation = asOne<{
                  id: string;
                  guest_name: string | null;
                }>(log.invitations);
                const href = invitation?.id
                  ? `/pases/${invitation.id}`
                  : "/movimientos";
                const exited = isExitAction(log.action_type);

                return (
                  <li key={log.id}>
                    <Link className={ui.feedItem} href={href}>
                      <span
                        className={`${ui.feedIcon} ${exited ? ui.feedOut : ""}`}
                      >
                        <Icon name={exited ? "exit" : "enter"} size={18} />
                      </span>
                      <span className={ui.feedBody}>
                        <strong>
                          {isBookingLabel(invitation?.guest_name)
                            ? eventSpaceName(invitation?.guest_name)
                            : (invitation?.guest_name ?? "Invitado")}
                        </strong>
                        <span className={ui.feedMeta}>
                          {accessActionShort(log.action_type)}
                        </span>
                      </span>
                      <span className={ui.feedTime}>
                        {formatTime(log.timestamp)}
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section>
          <div className={ui.sectionHead}>
            <h2>Invitados</h2>
            <Link href="/pases">Ver todos</Link>
          </div>
          {livePeople.length === 0 ? (
            <p className={ui.quiet}>Nadie está invitado ahora.</p>
          ) : (
            <ul className={ui.feed}>
              {livePeople.slice(0, 6).map((invitation) => {
                const status = passStatus(invitation);
                return (
                  <li key={invitation.id}>
                    <Link
                      className={ui.feedItem}
                      href={`/pases/${invitation.id}`}
                    >
                      <span className={ui.avatar} aria-hidden>
                        {initials(invitation.guest_name)}
                      </span>
                      <span className={ui.feedBody}>
                        <strong>
                          {invitation.guest_name ?? "Sin aceptar"}
                        </strong>
                        <span className={ui.feedMeta}>
                          {formatRange(
                            invitation.valid_from,
                            invitation.valid_to,
                          )}
                        </span>
                      </span>
                      <Badge status={status} />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

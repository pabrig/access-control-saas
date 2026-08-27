import Link from "next/link";
import { Badge, Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isBookingLabel } from "@/lib/amenities";
import { formatRange, formatTime, initials } from "@/lib/format";
import { accessActionShort, isExitAction, passStatus } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { CommunityHome } from "./community-home";
import {
  isAdmin,
  isOwner,
  isSecurity,
  requireSession,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireSession();
  const owner = isOwner(session);
  const admin = isAdmin(session);
  const resident = owner && !admin;

  if (admin) {
    return <CommunityHome session={session} />;
  }

  const supabase = await createClient();
  const [{ data: invitations }, { data: logs }] = await Promise.all([
    supabase
      .from("invitations")
      .select("id, guest_name, valid_from, valid_to, is_revoked, status")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("access_logs")
      .select(
        "id, action_type, timestamp, invitation_id, invitations(id, guest_name)",
      )
      .order("timestamp", { ascending: false })
      .limit(4),
  ]);

  const liveInvites = (invitations ?? []).filter((row) => {
    if (resident && isBookingLabel(row.guest_name)) {
      return false;
    }
    const status = passStatus(row);
    return (
      status === "active" || status === "scheduled" || status === "waiting"
    );
  });

  if (resident) {
    return (
      <>
        <PageHeader title={`Hola, ${session.firstName}`} />

        <nav className={ui.quick} aria-label="Acciones rápidas">
          <Link className={ui.quickLink} href="/pases?nuevo=1">
            <Icon name="person" />
            Invitar
          </Link>
          <Link className={ui.quickLink} href="/reservas?nuevo=1">
            <Icon name="calendar" />
            Evento
          </Link>
        </nav>

        <section>
          <div className={ui.sectionHead}>
            <h2>Vigentes</h2>
            <Link href="/pases">Ver todos</Link>
          </div>
          {liveInvites.length === 0 ? (
            <p className={ui.quiet}>Nadie está invitado.</p>
          ) : (
            <ul className={ui.feed}>
              {liveInvites.slice(0, 5).map((invitation) => {
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

        <section style={{ marginTop: 28 }}>
          <div className={ui.sectionHead}>
            <h2>En la puerta</h2>
            <Link href="/movimientos">Historial</Link>
          </div>
          {(logs ?? []).length === 0 ? (
            <p className={ui.quiet}>Todavía no hubo ingresos.</p>
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
                        <strong>{invitation?.guest_name ?? "Invitado"}</strong>
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
      </>
    );
  }

  return (
    <>
      <PageHeader
        title={`Hola, ${session.firstName}`}
        description="Consulta. El escaneo se hace en la app de barrera."
      />
      {isSecurity(session) ? (
        <Banner tone="warn">
          Para escanear QRs abrí la app de barrera (puerto 3002) con la misma
          cuenta de seguridad.
        </Banner>
      ) : null}
      <Link className={ui.card} href="/movimientos">
        <h2>Movimientos</h2>
        <p className={ui.muted}>
          Entradas y salidas. El detalle está en el historial.
        </p>
      </Link>
    </>
  );
}

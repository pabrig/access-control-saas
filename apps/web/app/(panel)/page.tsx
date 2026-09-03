import Link from "next/link";
import { Badge, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import { PendingLink } from "@/components/pending-link";
import ui from "@/components/ui.module.css";
import { withoutEventPeople } from "@/lib/amenities";
import { formatRange, formatTime, initials, personName } from "@/lib/format";
import { accessActionShort, isExitAction, passStatus } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { CommunityHome } from "./community-home";
import { gateScanUrl } from "@/lib/gate-url";
import { isAdmin, isOwner, isSecurity, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireSession();
  const owner = isOwner(session);
  const admin = isAdmin(session);
  const resident = owner && !admin;
  const security = isSecurity(session) && !admin;
  const scanUrl = gateScanUrl();

  if (admin) {
    return <CommunityHome session={session} />;
  }

  const supabase = await createClient();
  const [{ data: invitations }, { data: logs }] = await Promise.all([
    supabase
      .from("invitations")
      .select(
        "id, property_id, guest_name, valid_from, valid_to, is_revoked, status",
      )
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("access_logs")
      .select(
        "id, action_type, timestamp, invitation_id, profile_id, invitations(id, guest_name), resident:profiles!access_logs_profile_id_fkey(first_name, last_name)",
      )
      .order("timestamp", { ascending: false })
      .limit(4),
  ]);

  const liveInvites = withoutEventPeople(invitations ?? []).filter((row) => {
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
          <PendingLink className={ui.quickLink} href="/credencial">
            <Icon name="qr" />
            Credencial
          </PendingLink>
          <PendingLink className={ui.quickLink} href="/pases?nuevo=1">
            <Icon name="person" />
            Invitar
          </PendingLink>
          <PendingLink className={ui.quickLink} href="/reservas?nuevo=1">
            <Icon name="calendar" />
            Evento
          </PendingLink>
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
            <Link href="/movimientos">Movimientos</Link>
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
                const resident = asOne<{
                  first_name: string;
                  last_name: string;
                }>(log.resident);
                const label =
                  invitation?.guest_name ??
                  (resident
                    ? `${personName(resident)} · Propietario`
                    : "Movimiento");
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
                        <strong>{label}</strong>
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
        description="Consultá movimientos o abrí el escáner en la puerta."
      />
      {security ? (
        <div className={ui.stack}>
          <a className={ui.button} href={scanUrl}>
            <Icon name="qr" size={18} />
            Escanear QR en la puerta
          </a>
          <PendingLink className={ui.buttonSecondary} href="/movimientos">
            <Icon name="clock" size={18} />
            Ver movimientos
          </PendingLink>
        </div>
      ) : null}
      {!security ? (
        <Link className={ui.card} href="/movimientos">
          <h2>Movimientos</h2>
          <p className={ui.muted}>
            Entradas y salidas. El detalle está en el historial.
          </p>
        </Link>
      ) : null}
    </>
  );
}

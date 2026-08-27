import Link from "next/link";
import { Badge, Banner, Empty, PageHeader, Stat } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isBookingLabel } from "@/lib/amenities";
import {
  formatDateTime,
  formatRange,
  formatTime,
  initials,
} from "@/lib/format";
import {
  accessActionLabel,
  accessActionShort,
  isExitAction,
  passStatus,
} from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { isAdmin, isOwner, isSecurity, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const session = await requireSession();
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  const owner = isOwner(session);
  const admin = isAdmin(session);
  const resident = owner && !admin;

  const [
    { count: activePasses },
    { count: todayMoves },
    { count: propertyCount },
    { count: peopleCount },
    { count: waitingPasses },
    { count: openShifts },
    { data: invitations },
    { data: logs },
  ] = await Promise.all([
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("is_revoked", false)
      .eq("status", "READY")
      .lte("valid_from", nowIso)
      .gte("valid_to", nowIso),
    supabase
      .from("access_logs")
      .select("id", { count: "exact", head: true })
      .gte("timestamp", startOfDay.toISOString()),
    supabase.from("properties").select("id", { count: "exact", head: true }),
    isAdmin(session)
      ? supabase.from("profiles").select("id", { count: "exact", head: true })
      : Promise.resolve({ count: 0 }),
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("status", "DRAFT")
      .eq("is_revoked", false),
    admin
      ? supabase
          .from("shifts")
          .select("id", { count: "exact", head: true })
          .is("ended_at", null)
      : Promise.resolve({ count: 0 }),
    supabase
      .from("invitations")
      .select("id, guest_name, valid_from, valid_to, is_revoked, status")
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("access_logs")
      .select(
        "id, action_type, timestamp, invitation_id, gates(name), invitations(id, guest_name)",
      )
      .order("timestamp", { ascending: false })
      .limit(resident ? 4 : 8),
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
        description={
          admin
            ? "Ingresos del día y estado de las invitaciones."
            : "Consulta. El escaneo se hace en la app de barrera."
        }
        actions={
          owner || admin ? (
            <Link className={ui.button} href="/pases">
              Nueva invitación
            </Link>
          ) : undefined
        }
      />

      {isSecurity(session) && !admin ? (
        <Banner tone="warn">
          Para escanear QRs abrí la app de barrera (puerto 3002) con la misma
          cuenta de seguridad.
        </Banner>
      ) : null}

      <section className={ui.stats}>
        <Stat href="/pases" label="Pases activos" value={activePasses ?? 0} />
        <Stat href="/movimientos" label="Hoy" value={todayMoves ?? 0} />
        <Stat href="/lotes" label="Lotes" value={propertyCount ?? 0} />
        {admin ? (
          <Stat href="/personas" label="Personas" value={peopleCount ?? 0} />
        ) : null}
      </section>

      {admin ? (
        <section className={ui.split} style={{ marginBottom: 16 }}>
          <article className={ui.card}>
            <h2>Alertas de seguridad</h2>
            <ul>
              <li className={ui.row}>
                <div>
                  <strong>{openShifts ?? 0} turnos abiertos</strong>
                  <p className={ui.muted}>Guardias con barrera activa ahora.</p>
                </div>
              </li>
              <li className={ui.row}>
                <div>
                  <strong>{waitingPasses ?? 0} invitaciones sin aceptar</strong>
                  <p className={ui.muted}>Todavía no cargaron nombre ni QR.</p>
                </div>
              </li>
            </ul>
          </article>
          <article className={ui.card}>
            <h2>Horario de servicios</h2>
            <p>
              Lunes a viernes, 8:00 a 18:00. El atajo Servicio arma un ingreso
              de un solo uso con ese corte.
            </p>
            <p className={ui.muted}>
              Fuera de hora, invitá como invitado habitual.
            </p>
          </article>
        </section>
      ) : null}

      <div className={ui.split}>
        <section className={ui.card}>
          <h2>Invitaciones recientes</h2>
          {(invitations ?? []).length === 0 ? (
            <Empty
              title="Todavía no hay invitaciones"
              description="Cuando invites a alguien, el link aparece acá."
            />
          ) : (
            <ul>
              {(invitations ?? []).map((invitation) => {
                const status = passStatus(invitation);

                return (
                  <li className={ui.row} key={invitation.id}>
                    <Link href="/pases">
                      <strong>{invitation.guest_name ?? "Sin aceptar"}</strong>
                      <p className={ui.muted}>
                        {formatRange(
                          invitation.valid_from,
                          invitation.valid_to,
                        )}
                      </p>
                    </Link>
                    <Badge status={status} />
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className={ui.card}>
          <h2>{admin ? "Libro de guardia" : "Últimos movimientos"}</h2>
          {(logs ?? []).length === 0 ? (
            <Empty
              title="Sin movimientos"
              description="Cuando escaneen un pase, el historial aparece acá."
            />
          ) : (
            <ul>
              {(logs ?? []).map((log) => {
                const gate = asOne<{ name: string }>(log.gates);
                const invitation = asOne<{ guest_name: string }>(
                  log.invitations,
                );

                return (
                  <li className={ui.row} key={log.id}>
                    <div>
                      <strong>{invitation?.guest_name ?? "Invitado"}</strong>
                      <p className={ui.muted}>
                        {accessActionLabel(log.action_type)}
                        {gate?.name ? ` · ${gate.name}` : ""} ·{" "}
                        {formatDateTime(log.timestamp)}
                      </p>
                    </div>
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

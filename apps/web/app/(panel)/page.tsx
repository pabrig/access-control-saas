import Link from "next/link";
import { Badge, Banner, Empty, PageHeader, Stat } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { formatDateTime, lotLabel } from "@/lib/format";
import { accessActionLabel, passStatus } from "@/lib/labels";
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
      .select(
        "id, guest_name, valid_from, valid_to, is_revoked, status, properties(lot_number, street_name)",
      )
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("access_logs")
      .select(
        "id, action_type, timestamp, gates(name), invitations(guest_name)",
      )
      .order("timestamp", { ascending: false })
      .limit(8),
  ]);

  return (
    <>
      <PageHeader
        kicker={admin ? "Panel de gestión" : resident ? "Tu lote" : "Turno"}
        title={`Hola, ${session.firstName}`}
        description={
          resident
            ? "Creá un pase en un toque o reservá el SUM. Tu visita muestra el QR en la barrera."
            : admin
              ? "Ingresos del día, alertas de seguridad y el estado de los pases."
              : "Este panel es de consulta. El escaneo se hace en la app de barrera."
        }
        actions={
          owner || admin ? (
            <Link className={ui.button} href="/pases">
              Nuevo pase
            </Link>
          ) : null
        }
      />

      {isSecurity(session) && !admin ? (
        <Banner tone="warn">
          Para escanear QRs abrí la app de barrera (puerto 3002) con la misma
          cuenta de seguridad.
        </Banner>
      ) : null}

      {resident ? (
        <nav className={ui.quick} aria-label="Acciones rápidas">
          <Link className={ui.quickLink} href="/pases?tipo=visita">
            Visita
            <span>Pase de 24 h</span>
          </Link>
          <Link className={ui.quickLink} href="/pases?tipo=proveedor">
            Proveedor
            <span>Hoy, un ingreso</span>
          </Link>
          <Link className={ui.quickLink} href="/pases?tipo=evento">
            Evento
            <span>Fecha y QR</span>
          </Link>
        </nav>
      ) : null}

      <section className={ui.stats}>
        <Stat href="/pases" label="Pases activos" value={activePasses ?? 0} />
        <Stat
          href="/movimientos"
          label="Ingresos de hoy"
          value={todayMoves ?? 0}
        />
        <Stat
          href="/lotes"
          label={resident ? "Tu lote" : "Lotes"}
          value={propertyCount ?? 0}
        />
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
                  <strong>{waitingPasses ?? 0} pases sin completar</strong>
                  <p className={ui.muted}>
                    La visita todavía no cargó nombre ni QR.
                  </p>
                </div>
              </li>
            </ul>
          </article>
          <article className={ui.card}>
            <h2>Reglas de proveedores</h2>
            <p>
              Lunes a viernes, 8:00 a 18:00. El atajo de Proveedor arma el pase
              con ese corte y un solo uso.
            </p>
            <p className={ui.muted}>
              Para un ingreso fuera de hora, usá Visita o Evento.
            </p>
          </article>
        </section>
      ) : null}

      <div className={ui.split}>
        <section className={ui.card}>
          <h2>Pases recientes</h2>
          {(invitations ?? []).length === 0 ? (
            <Empty
              title="Todavía no hay pases"
              description="Cuando invites a alguien, el link aparece acá."
            />
          ) : (
            <ul>
              {(invitations ?? []).map((invitation) => {
                const property = asOne<{
                  lot_number: string;
                  street_name: string | null;
                }>(invitation.properties);
                const status = passStatus(invitation);

                return (
                  <li className={ui.row} key={invitation.id}>
                    <div>
                      <strong>
                        {invitation.guest_name ?? "Esperando datos"}
                      </strong>
                      <p className={ui.muted}>
                        {property ? lotLabel(property) : "Lote"} · hasta{" "}
                        {formatDateTime(invitation.valid_to)}
                      </p>
                    </div>
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
                      <strong>{invitation?.guest_name ?? "Visita"}</strong>
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

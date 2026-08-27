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

  const [
    { count: activePasses },
    { count: todayMoves },
    { count: propertyCount },
    { count: peopleCount },
    { data: invitations },
    { data: logs },
  ] = await Promise.all([
    supabase
      .from("invitations")
      .select("id", { count: "exact", head: true })
      .eq("is_revoked", false)
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
      .select(
        "id, guest_name, valid_from, valid_to, is_revoked, properties(lot_number, street_name)",
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

  const owner = isOwner(session);
  const admin = isAdmin(session);

  return (
    <>
      <PageHeader
        kicker={admin ? "Panel de gestión" : owner ? "Tu lote" : "Turno"}
        title={`Hola, ${session.firstName}`}
        description={
          owner
            ? "Creá un pase, mostralo en la barrera y mirá si tu visita ya entró."
            : admin
              ? "Un vistazo de pases, lotes y lo que pasó hoy en la barrera."
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

      <section className={ui.stats}>
        <Stat href="/pases" label="Pases activos" value={activePasses ?? 0} />
        <Stat
          href="/movimientos"
          label="Movimientos hoy"
          value={todayMoves ?? 0}
        />
        <Stat
          href="/lotes"
          label={owner && !admin ? "Tu lote" : "Lotes"}
          value={propertyCount ?? 0}
        />
        {admin ? (
          <Stat href="/personas" label="Personas" value={peopleCount ?? 0} />
        ) : null}
      </section>

      <div className={ui.split}>
        <section className={ui.card}>
          <h2>Pases recientes</h2>
          {(invitations ?? []).length === 0 ? (
            <Empty
              title="Todavía no hay pases"
              description="Cuando invites a alguien, el QR aparece acá."
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
                      <strong>{invitation.guest_name}</strong>
                      <p className={ui.muted}>
                        {property ? lotLabel(property) : "Lot or house"} · hasta{" "}
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
          <h2>Últimos movimientos</h2>
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

import { Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { formatDateTime, personName } from "@/lib/format";
import { accessActionLabel } from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { createClient } from "@/lib/supabase/server";

export default async function MovimientosPage() {
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, gates(name), invitations(guest_name), profiles!access_logs_security_user_id_fkey(first_name, last_name)",
    )
    .order("timestamp", { ascending: false })
    .limit(80);

  return (
    <>
      <PageHeader
        kicker="Historial"
        title="Movimientos"
        description="Entradas y salidas que ya se escanearon. Los rechazos en la barrera todavía no se guardan."
      />

      {(logs ?? []).length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando seguridad escanee un pase, va a aparecer acá."
        />
      ) : (
        <section className={ui.card}>
          <ul>
            {(logs ?? []).map((log) => {
              const gate = asOne<{ name: string }>(log.gates);
              const invitation = asOne<{ guest_name: string }>(log.invitations);
              const guard = asOne<{ first_name: string; last_name: string }>(
                log.profiles,
              );

              return (
                <li className={ui.row} key={log.id}>
                  <div>
                    <strong>
                      {invitation?.guest_name ?? "Visita"} ·{" "}
                      {accessActionLabel(log.action_type)}
                    </strong>
                    <p className={ui.muted}>
                      {formatDateTime(log.timestamp)}
                      {gate?.name ? ` · ${gate.name}` : ""}
                      {guard ? ` · ${personName(guard)}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

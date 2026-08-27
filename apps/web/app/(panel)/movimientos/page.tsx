import { DataTable } from "@/components/data-table";
import { Empty, PageHeader } from "@/components/ui";
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
    .limit(200);

  const rows = (logs ?? []).map((log) => {
    const gate = asOne<{ name: string }>(log.gates);
    const invitation = asOne<{ guest_name: string }>(log.invitations);
    const guard = asOne<{ first_name: string; last_name: string }>(
      log.profiles,
    );

    return {
      id: log.id,
      guest: invitation?.guest_name ?? "Visita",
      action: accessActionLabel(log.action_type),
      gate: gate?.name ?? "—",
      guard: guard ? personName(guard) : "—",
      when: formatDateTime(log.timestamp),
    };
  });

  return (
    <>
      <PageHeader
        kicker="Historial"
        title="Libro de guardia"
        description="Entradas y salidas en tiempo real según lo que ya se escaneó. Los rechazos en barrera no se guardan."
      />

      {rows.length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando seguridad escanee un pase, va a aparecer acá."
        />
      ) : (
        <DataTable
          filename="libro-de-guardia.csv"
          pageSize={15}
          rows={rows}
          searchPlaceholder="Filtrar por visita, barrera o guardia"
          columns={[
            { key: "when", header: "Cuando", value: (row) => row.when },
            { key: "guest", header: "Visita", value: (row) => row.guest },
            { key: "action", header: "Movimiento", value: (row) => row.action },
            { key: "gate", header: "Barrera", value: (row) => row.gate },
            { key: "guard", header: "Guardia", value: (row) => row.guard },
          ]}
        />
      )}
    </>
  );
}

import { Badge, Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { formatDateTime, personName } from "@/lib/format";
import { asOne } from "@/lib/relations";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { endShift, startShift } from "./actions";

export default async function TurnosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const flash = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: shifts, error }, { data: gates }, { data: securityRoles }] =
    await Promise.all([
      supabase
        .from("shifts")
        .select(
          "id, started_at, ended_at, gates(name), profiles!shifts_user_id_fkey(first_name, last_name)",
        )
        .order("started_at", { ascending: false })
        .limit(40),
      supabase.from("gates").select("id, name").order("name"),
      supabase
        .from("user_roles")
        .select("user_id, profiles(first_name, last_name)")
        .eq("role", "SECURITY"),
    ]);

  const guards = (securityRoles ?? []).map((row) => ({
    id: row.user_id,
    name: personName(
      asOne<{ first_name: string; last_name: string }>(row.profiles) ?? {},
    ),
  }));

  return (
    <>
      <PageHeader
        kicker="Barrera"
        title="Turnos"
        description="Un turno dice en qué barrera está seguridad ahora. Sin turno activo, el escáner no valida."
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Turno iniciado.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      <section className={ui.card}>
        <h2>Abrir turno</h2>
        {guards.length === 0 || (gates ?? []).length === 0 ? (
          <p className={ui.muted}>
            Hace falta al menos una barrera y una persona con rol de seguridad.
            Si no ves guardias, es porque tu rol no alcanza a esas cuentas.
          </p>
        ) : (
          <form action={startShift} className={ui.form}>
            <div className={ui.formRow}>
              <label>
                Guardia
                <select name="user_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí quién cubre
                  </option>
                  {guards.map((guard) => (
                    <option key={guard.id} value={guard.id}>
                      {guard.name || "Seguridad"}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Barrera
                <select name="gate_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí la barrera
                  </option>
                  {(gates ?? []).map((gate) => (
                    <option key={gate.id} value={gate.id}>
                      {gate.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button className={ui.button} type="submit">
              Empezar turno
            </button>
          </form>
        )}
      </section>

      {(shifts ?? []).length === 0 ? (
        <Empty
          title="No hay turnos"
          description="Cuando alguien cubra la barrera, el turno queda acá."
        />
      ) : (
        <section className={ui.card} style={{ marginTop: 16 }}>
          <ul>
            {(shifts ?? []).map((shift) => {
              const gate = asOne<{ name: string }>(shift.gates);
              const guard = asOne<{ first_name: string; last_name: string }>(
                shift.profiles,
              );
              const open = !shift.ended_at;

              return (
                <li className={ui.row} key={shift.id}>
                  <div>
                    <strong>{guard ? personName(guard) : "Guardia"}</strong>
                    <p className={ui.muted}>
                      {gate?.name ?? "Barrera"} · desde{" "}
                      {formatDateTime(shift.started_at)}
                      {shift.ended_at
                        ? ` · hasta ${formatDateTime(shift.ended_at)}`
                        : ""}
                    </p>
                  </div>
                  {open ? (
                    <form action={endShift}>
                      <input type="hidden" name="id" value={shift.id} />
                      <button className={ui.buttonDanger} type="submit">
                        Cerrar
                      </button>
                    </form>
                  ) : (
                    <Badge status="muted">Cerrado</Badge>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </>
  );
}

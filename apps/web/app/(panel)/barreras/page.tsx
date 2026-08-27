import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { gateTypeLabel } from "@/lib/labels";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createGate, renameGate } from "./actions";

export default async function BarrerasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const flash = await searchParams;
  await requireAdmin();
  const supabase = await createClient();

  const [{ data: gates, error }, { data: complexes }, { data: neighborhoods }] =
    await Promise.all([
      supabase
        .from("gates")
        .select("id, name, type, complex_id, neighborhood_id")
        .order("name"),
      supabase.from("complexes").select("id, name").order("name"),
      supabase.from("neighborhoods").select("id, name").order("name"),
    ]);

  return (
    <>
      <PageHeader
        kicker="Barrera"
        title="Barreras"
        description="Cada QR se valida en una barrera. La principal es la del complejo; las internas son de cada barrio."
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Barrera creada.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      <section className={ui.card}>
        <h2>Nueva barrera</h2>
        <form action={createGate} className={ui.form}>
          <label>
            Nombre
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Barrera principal"
            />
          </label>
          <label>
            Tipo
            <select name="type" required defaultValue="MAIN_COMPLEX">
              <option value="MAIN_COMPLEX">
                Barrera principal del complejo
              </option>
              <option value="INTERNAL_NEIGHBORHOOD">
                Barrera interna del barrio
              </option>
            </select>
          </label>
          <div className={ui.formRow}>
            <label>
              Complejo
              <select name="complex_id" defaultValue="">
                <option value="">—</option>
                {(complexes ?? []).map((complex) => (
                  <option key={complex.id} value={complex.id}>
                    {complex.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Barrio
              <select name="neighborhood_id" defaultValue="">
                <option value="">—</option>
                {(neighborhoods ?? []).map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.id}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <button className={ui.button} type="submit">
            Crear barrera
          </button>
        </form>
      </section>

      {(gates ?? []).length === 0 ? (
        <Empty
          title="No hay barreras"
          description="Creá la principal del complejo para que seguridad pueda escanear."
        />
      ) : (
        <ul className={ui.stack} style={{ marginTop: 16 }}>
          {(gates ?? []).map((gate) => (
            <li className={ui.card} key={gate.id}>
              <form action={renameGate} className={ui.form}>
                <input type="hidden" name="id" value={gate.id} />
                <p className={ui.muted}>{gateTypeLabel(gate.type)}</p>
                <label>
                  Nombre
                  <input defaultValue={gate.name} name="name" required />
                </label>
                <button className={ui.buttonSecondary} type="submit">
                  Guardar nombre
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

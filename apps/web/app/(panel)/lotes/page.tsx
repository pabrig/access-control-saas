import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";
import { asOne } from "@/lib/relations";
import { isAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createNeighborhood, createProperty, updateProperty } from "./actions";

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; barrio?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const supabase = await createClient();

  const [
    { data: properties, error },
    { data: neighborhoods },
    { data: complexes },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, lot_number, street_name, neighborhood_id, neighborhoods(name)",
      )
      .order("lot_number"),
    supabase.from("neighborhoods").select("id, name, complex_id").order("name"),
    admin
      ? supabase.from("complexes").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  return (
    <>
      <PageHeader
        kicker="Comunidad"
        title={admin ? "Lotes" : "Mi lote"}
        description={
          admin
            ? "Los pases siempre van a un lote. Acá cargás o corregís la calle y el número."
            : "Este es el lote desde el que invitás visitas."
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Lote guardado.</Banner> : null}
      {flash.barrio ? <Banner>Barrio creado.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {admin ? (
        <div className={ui.split}>
          <section className={ui.card}>
            <h2>Nuevo lote</h2>
            {(neighborhoods ?? []).length === 0 ? (
              <p className={ui.muted}>
                Primero creá un barrio. Después podés sumar lotes.
              </p>
            ) : (
              <form action={createProperty} className={ui.form}>
                <label>
                  Barrio
                  <select name="neighborhood_id" required defaultValue="">
                    <option value="" disabled>
                      Elegí el barrio
                    </option>
                    {(neighborhoods ?? []).map((neighborhood) => (
                      <option key={neighborhood.id} value={neighborhood.id}>
                        {neighborhood.name}
                      </option>
                    ))}
                  </select>
                </label>
                <div className={ui.formRow}>
                  <label>
                    Número de lote
                    <input name="lot_number" required maxLength={20} />
                  </label>
                  <label>
                    Calle
                    <input name="street_name" maxLength={80} />
                  </label>
                </div>
                <button className={ui.button} type="submit">
                  Guardar lote
                </button>
              </form>
            )}
          </section>
          <section className={ui.card}>
            <h2>Nuevo barrio</h2>
            <form action={createNeighborhood} className={ui.form}>
              <label>
                Nombre
                <input name="name" required maxLength={80} />
              </label>
              {(complexes ?? []).length > 0 ? (
                <label>
                  Complejo (opcional)
                  <select name="complex_id" defaultValue="">
                    <option value="">Sin complejo</option>
                    {(complexes ?? []).map((complex) => (
                      <option key={complex.id} value={complex.id}>
                        {complex.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <button className={ui.buttonSecondary} type="submit">
                Crear barrio
              </button>
            </form>
          </section>
        </div>
      ) : null}

      {(properties ?? []).length === 0 ? (
        <Empty
          title="No hay lotes en tu alcance"
          description="El administrador carga el lote y te lo asigna como propietario."
        />
      ) : (
        <ul className={ui.list} style={{ marginTop: 16 }}>
          {(properties ?? []).map((property) => {
            const neighborhood = asOne<{ name: string }>(
              property.neighborhoods,
            );

            return (
              <li className={ui.card} key={property.id}>
                {admin ? (
                  <form action={updateProperty} className={ui.form}>
                    <input type="hidden" name="id" value={property.id} />
                    <p className={ui.muted}>{neighborhood?.name ?? "Barrio"}</p>
                    <div className={ui.formRow}>
                      <label>
                        Número
                        <input
                          defaultValue={property.lot_number}
                          name="lot_number"
                          required
                        />
                      </label>
                      <label>
                        Calle
                        <input
                          defaultValue={property.street_name ?? ""}
                          name="street_name"
                        />
                      </label>
                    </div>
                    <button className={ui.buttonSecondary} type="submit">
                      Guardar cambios
                    </button>
                  </form>
                ) : (
                  <div>
                    <h2>{lotLabel(property)}</h2>
                    <p className={ui.muted}>
                      {neighborhood?.name ?? "Tu barrio"}
                    </p>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

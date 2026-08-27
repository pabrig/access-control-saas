import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";
import { asOne } from "@/lib/relations";
import { canCreateNeighborhood, isAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createNeighborhood, createProperty, updateProperty } from "./actions";

function AddBarrioForm({
  complexIds,
  complexes,
}: {
  complexIds: string[];
  complexes: { id: string; name: string }[];
}) {
  const hiddenComplexId =
    complexIds[0] ?? (complexes.length === 1 ? complexes[0]?.id : null);

  return (
    <form action={createNeighborhood} className={ui.form}>
      {hiddenComplexId ? (
        <input type="hidden" name="complex_id" value={hiddenComplexId} />
      ) : complexes.length > 1 ? (
        <label>
          Complejo
          <select name="complex_id" required defaultValue="">
            <option value="" disabled>
              Elegí el complejo
            </option>
            {complexes.map((complex) => (
              <option key={complex.id} value={complex.id}>
                {complex.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <label>
        Nombre del barrio
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Ej. Los Robles"
        />
      </label>
      <button className={ui.buttonSecondary} type="submit">
        Sumar barrio
      </button>
    </form>
  );
}

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string; barrio?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const createBarrio = canCreateNeighborhood(session);
  const managedComplexIds = session.roles
    .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
    .map((row) => row.complex_id as string);
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
    createBarrio
      ? supabase.from("complexes").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const lotsByBarrio = new Map<
    string,
    {
      name: string;
      properties: NonNullable<typeof properties>;
    }
  >();

  for (const property of properties ?? []) {
    const neighborhood = asOne<{ name: string }>(property.neighborhoods);
    const key = property.neighborhood_id;
    const current = lotsByBarrio.get(key) ?? {
      name: neighborhood?.name ?? "Barrio",
      properties: [],
    };
    current.properties.push(property);
    lotsByBarrio.set(key, current);
  }

  return (
    <>
      <PageHeader
        kicker="Comunidad"
        title={admin ? "Lotes" : "Mi lote"}
        description={
          createBarrio
            ? "Un lote siempre está dentro de un barrio. Si el barrio no está, sumalo en el mismo formulario y después cargá el lote."
            : admin
              ? "Los pases siempre van a un lote. Acá cargás o corregís la calle y el número."
              : "Este es el lote desde el que invitás visitas."
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Lote guardado.</Banner> : null}
      {flash.barrio ? (
        <Banner>Barrio listo. Ya podés cargar lotes ahí.</Banner>
      ) : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {admin ? (
        <section className={ui.card}>
          <h2>Nuevo lote</h2>
          {(neighborhoods ?? []).length === 0 ? (
            createBarrio ? (
              <div className={ui.inlineAdd}>
                <p className={ui.muted}>
                  Todavía no hay un barrio. Creá uno y después vas a poder
                  cargar lotes adentro.
                </p>
                <AddBarrioForm
                  complexIds={managedComplexIds}
                  complexes={complexes ?? []}
                />
              </div>
            ) : (
              <p className={ui.muted}>
                Todavía no hay un barrio asignado a tu rol.
              </p>
            )
          ) : (
            <form action={createProperty} className={ui.form}>
              <label>
                Barrio del lote
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
          {createBarrio && (neighborhoods ?? []).length > 0 ? (
            <details className={ui.inlineAdd}>
              <summary>¿No está el barrio? Sumalo acá</summary>
              <p className={ui.muted}>
                El nuevo barrio queda en tu complejo. Después aparece en la
                lista de arriba para cargar lotes.
              </p>
              <AddBarrioForm
                complexIds={managedComplexIds}
                complexes={complexes ?? []}
              />
            </details>
          ) : null}
        </section>
      ) : null}

      {(properties ?? []).length === 0 ? (
        <Empty
          title="No hay lotes en tu alcance"
          description="El administrador carga el lote y te lo asigna como propietario."
        />
      ) : (
        <div style={{ marginTop: 8 }}>
          {[...lotsByBarrio.entries()].map(([neighborhoodId, group]) => (
            <section key={neighborhoodId}>
              <h2 className={ui.groupTitle}>{group.name}</h2>
              <ul className={ui.list}>
                {group.properties.map((property) => (
                  <li className={ui.card} key={property.id}>
                    {admin ? (
                      <form action={updateProperty} className={ui.form}>
                        <input type="hidden" name="id" value={property.id} />
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
                        <p className={ui.muted}>{group.name}</p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}

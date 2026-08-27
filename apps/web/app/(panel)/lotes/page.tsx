import { Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { lotLabel, personName } from "@/lib/format";
import { asOne } from "@/lib/relations";
import {
  assignedNeighborhoodId,
  canCreateNeighborhood,
  isAdmin,
  isNeighborhoodAdmin,
  requireSession,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import {
  createNeighborhood,
  createProperty,
  updateProperty,
} from "./actions";

type LotFieldsValue = {
  lot_number?: string;
  street_name?: string | null;
  block_name?: string | null;
  phone?: string | null;
  notes?: string | null;
};

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

function LotFields({ value }: { value?: LotFieldsValue }) {
  return (
    <>
      <div className={ui.formRow}>
        <label>
          Número de lote
          <input
            name="lot_number"
            required
            maxLength={20}
            defaultValue={value?.lot_number}
          />
        </label>
        <label>
          Manzana
          <input
            name="block_name"
            maxLength={20}
            placeholder="Ej. A"
            defaultValue={value?.block_name ?? ""}
          />
        </label>
      </div>
      <div className={ui.formRow}>
        <label>
          Calle
          <input
            name="street_name"
            maxLength={80}
            defaultValue={value?.street_name ?? ""}
          />
        </label>
        <label>
          Teléfono
          <input
            name="phone"
            maxLength={30}
            inputMode="tel"
            placeholder="11 5555-0100"
            defaultValue={value?.phone ?? ""}
          />
        </label>
      </div>
      <label>
        Notas
        <textarea
          name="notes"
          maxLength={280}
          rows={2}
          placeholder="Titular, inquilino, obras…"
          defaultValue={value?.notes ?? ""}
        />
      </label>
    </>
  );
}

export default async function LotesPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    created?: string;
    barrio?: string;
  }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const barrio = isNeighborhoodAdmin(session);
  const assignedBarrioId = assignedNeighborhoodId(session);
  const createBarrio = canCreateNeighborhood(session);
  const managedComplexIds = session.roles
    .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
    .map((row) => row.complex_id as string);
  const supabase = await createClient();

  const [
    { data: properties, error },
    { data: neighborhoods },
    { data: complexes },
    { data: ownerRoles },
    { data: profiles },
  ] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, lot_number, street_name, neighborhood_id, block_name, phone, notes, neighborhoods(name)",
      )
      .order("lot_number"),
    supabase.from("neighborhoods").select("id, name, complex_id").order("name"),
    createBarrio
      ? supabase.from("complexes").select("id, name").order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    admin
      ? supabase
          .from("user_roles")
          .select("id, user_id, property_id, role")
          .eq("role", "OWNER")
      : Promise.resolve({
          data: [] as {
            id: string;
            user_id: string;
            property_id: string | null;
            role: string;
          }[],
        }),
    admin
      ? supabase.from("profiles").select("id, first_name, last_name")
      : Promise.resolve({
          data: [] as { id: string; first_name: string; last_name: string }[],
        }),
  ]);

  const people = (profiles ?? []).map((profile) => ({
    ...profile,
    label: personName(profile),
  }));
  const residentsByLot = new Map<string, string[]>();

  for (const row of ownerRoles ?? []) {
    if (row.role !== "OWNER" || !row.property_id) {
      continue;
    }
    const person = people.find((item) => item.id === row.user_id);
    const current = residentsByLot.get(row.property_id) ?? [];
    current.push(person?.label || "Residente");
    residentsByLot.set(row.property_id, current);
  }

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
            : barrio
              ? "Padrón de tu barrio: manzana, contacto y notas de administración."
              : admin
                ? "Los pases siempre van a un lote. Acá cargás o corregís la ficha."
                : "Este es el lote desde el que invitás a entrar."
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Lote guardado.</Banner> : null}
      {flash.barrio ? (
        <Banner>Barrio listo. Ya podés cargar lotes ahí.</Banner>
      ) : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      <div className={admin ? ui.deskSplit : undefined}>
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
              {barrio && assignedBarrioId ? (
                <input
                  type="hidden"
                  name="neighborhood_id"
                  value={assignedBarrioId}
                />
              ) : (
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
              )}
              <LotFields />
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
        <div>
          {[...lotsByBarrio.entries()].map(([neighborhoodId, group]) => (
            <section key={neighborhoodId}>
              {barrio ? null : (
                <h2 className={ui.groupTitle}>{group.name}</h2>
              )}
              <ul className={ui.list}>
                {group.properties.map((property) => {
                  const residents = residentsByLot.get(property.id) ?? [];

                  return (
                    <li className={ui.card} key={property.id}>
                      <div>
                        <h2>{lotLabel(property)}</h2>
                        <p className={ui.muted}>
                          {[
                            property.block_name
                              ? `Manzana ${property.block_name}`
                              : null,
                            admin ? null : group.name,
                            residents.length > 0
                              ? residents.join(", ")
                              : admin
                                ? "Sin residente"
                                : null,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {property.phone ? (
                          <p className={ui.muted}>{property.phone}</p>
                        ) : null}
                        {property.notes ? (
                          <p className={ui.muted}>{property.notes}</p>
                        ) : null}
                      </div>
                      {admin ? (
                        <details>
                          <summary>Editar lote</summary>
                          <form action={updateProperty} className={ui.form}>
                            <input
                              type="hidden"
                              name="id"
                              value={property.id}
                            />
                            <LotFields value={property} />
                            <button className={ui.button} type="submit">
                              Guardar
                            </button>
                          </form>
                        </details>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      </div>
    </>
  );
}

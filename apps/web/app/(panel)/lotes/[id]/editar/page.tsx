import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";
import { isNeighborhoodAdmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { updateProperty } from "../../actions";
import { LotFields } from "../../lot-fields";

export default async function EditarLotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  const barrioAdmin = isNeighborhoodAdmin(session);
  const supabase = await createClient();
  const [{ data: property }, { data: neighborhoods }] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, lot_number, street_name, block_name, phone, notes, neighborhood_id",
      )
      .eq("id", id)
      .maybeSingle(),
    barrioAdmin
      ? Promise.resolve({ data: [] as { id: string; name: string }[] })
      : supabase.from("neighborhoods").select("id, name").order("name"),
  ]);

  if (!property) {
    notFound();
  }

  return (
    <>
      <Link className={ui.backLink} href={`/lotes/${property.id}`}>
        <Icon name="back" size={18} />
        {lotLabel(property)}
      </Link>
      <PageHeader
        kicker="Lote"
        title="Editar lote"
        description="Cambios de número, calle, contacto o notas."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={updateProperty} className={ui.form}>
          <input type="hidden" name="id" value={property.id} />
          {barrioAdmin ? (
            <input
              type="hidden"
              name="neighborhood_id"
              value={property.neighborhood_id}
            />
          ) : (
            <label>
              Barrio
              <select
                name="neighborhood_id"
                required
                defaultValue={property.neighborhood_id}
              >
                {(neighborhoods ?? []).map((neighborhood) => (
                  <option key={neighborhood.id} value={neighborhood.id}>
                    {neighborhood.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <LotFields value={property} />
          <button className={ui.button} type="submit">
            Guardar
          </button>
        </form>
      </section>
    </>
  );
}

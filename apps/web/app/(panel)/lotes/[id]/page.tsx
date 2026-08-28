import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";
import { asOne } from "@/lib/relations";
import { isAdmin, isNeighborhoodAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { loadResidentsByLot } from "../residents";
import { deleteProperty } from "../actions";

export default async function LoteFichaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireSession();
  const admin = isAdmin(session);
  const barrioAdmin = isNeighborhoodAdmin(session);
  const supabase = await createClient();

  const [{ data: property }, residentsByLot] = await Promise.all([
    supabase
      .from("properties")
      .select(
        "id, lot_number, street_name, neighborhood_id, block_name, phone, notes, neighborhoods(name)",
      )
      .eq("id", id)
      .maybeSingle(),
    loadResidentsByLot(),
  ]);

  if (!property) {
    notFound();
  }

  const neighborhood = asOne<{ name: string }>(property.neighborhoods);
  const residents = residentsByLot.get(property.id) ?? [];
  const backHref =
    barrioAdmin || !admin ? "/lotes" : `/barrios/${property.neighborhood_id}`;
  const backLabel =
    barrioAdmin || !admin
      ? barrioAdmin
        ? "Lotes"
        : "Mi lote"
      : (neighborhood?.name ?? "Barrio");

  return (
    <>
      <Link className={ui.backLink} href={backHref}>
        <Icon name="back" size={18} />
        {backLabel}
      </Link>
      <PageHeader
        kicker={neighborhood?.name ?? "Lote"}
        title={lotLabel(property)}
        description="Ficha del lote: contacto, quién vive y notas de administración."
        actions={
          admin ? (
            <Link className={ui.button} href={`/lotes/${property.id}/editar`}>
              Editar
            </Link>
          ) : null
        }
      />
      {flash.created ? <Banner>Lote guardado.</Banner> : null}
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <dl className={ui.form}>
          {property.block_name ? (
            <div>
              <p className={ui.kicker}>Manzana</p>
              <p>{property.block_name}</p>
            </div>
          ) : null}
          {property.phone ? (
            <div>
              <p className={ui.kicker}>Teléfono</p>
              <p>{property.phone}</p>
            </div>
          ) : null}
          <div>
            <p className={ui.kicker}>Quién vive</p>
            <p>
              {residents.length > 0 ? residents.join(", ") : "Sin residente"}
            </p>
          </div>
          {property.notes ? (
            <div>
              <p className={ui.kicker}>Notas</p>
              <p>{property.notes}</p>
            </div>
          ) : null}
        </dl>
      </section>

      {admin ? (
        <section className={ui.card} style={{ marginTop: 24 }}>
          <h2>Eliminar lote</h2>
          <p className={ui.muted}>
            No se puede borrar si todavía tiene pases. Cancelalos o eliminalos
            antes.
          </p>
          <form action={deleteProperty}>
            <input type="hidden" name="id" value={property.id} />
            <button className={ui.buttonDanger} type="submit">
              Eliminar lote
            </button>
          </form>
        </section>
      ) : null}
    </>
  );
}

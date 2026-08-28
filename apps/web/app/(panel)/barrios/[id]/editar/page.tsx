import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isSuperadmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { updateNeighborhood } from "../../../lotes/actions";
import { BarrioFields } from "../../barrio-fields";

export default async function EditarBarrioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  const superadmin = isSuperadmin(session);
  const supabase = await createClient();
  const [{ data: neighborhood }, { data: complexes }] = await Promise.all([
    supabase
      .from("neighborhoods")
      .select("id, name, complex_id")
      .eq("id", id)
      .maybeSingle(),
    supabase.from("complexes").select("id, name").order("name"),
  ]);

  if (!neighborhood) {
    notFound();
  }

  const managedComplexIds = session.roles
    .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
    .map((row) => row.complex_id as string);
  const hiddenComplexId = superadmin
    ? null
    : (managedComplexIds[0] ?? neighborhood.complex_id);

  return (
    <>
      <Link className={ui.backLink} href={`/barrios/${neighborhood.id}`}>
        <Icon name="back" size={18} />
        {neighborhood.name}
      </Link>
      <PageHeader
        kicker="Barrio"
        title="Editar barrio"
        description="Nombre y, si aplica, el complejo al que pertenece."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={updateNeighborhood} className={ui.form}>
          <input type="hidden" name="id" value={neighborhood.id} />
          <BarrioFields
            complexes={complexes ?? []}
            hiddenComplexId={hiddenComplexId}
            superadmin={superadmin}
            defaultName={neighborhood.name}
            defaultComplexId={neighborhood.complex_id}
          />
          <button className={ui.button} type="submit">
            Guardar
          </button>
        </form>
      </section>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import {
  canCreateNeighborhood,
  isSuperadmin,
  requireAdmin,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { createNeighborhood } from "../../lotes/actions";
import { BarrioFields } from "../barrio-fields";

export default async function NuevoBarrioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; complejo?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();

  if (!canCreateNeighborhood(session)) {
    redirect("/lotes");
  }

  const supabase = await createClient();
  const { data: complexes } = await supabase
    .from("complexes")
    .select("id, name")
    .order("name");

  const managedComplexIds = session.roles
    .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
    .map((row) => row.complex_id as string);
  const superadmin = isSuperadmin(session);
  const hiddenComplexId = superadmin
    ? null
    : (managedComplexIds[0] ??
      ((complexes ?? []).length === 1 ? (complexes ?? [])[0]?.id : null) ??
      null);
  const defaultComplexId = hiddenComplexId ?? flash.complejo ?? null;
  const backHref = flash.complejo ? `/complejos/${flash.complejo}` : "/lotes";

  return (
    <>
      <Link className={ui.backLink} href={backHref}>
        <Icon name="back" size={18} />
        {flash.complejo ? "Complejo" : "Comunidad"}
      </Link>
      <PageHeader
        kicker="Comunidad"
        title="Nuevo barrio"
        description={
          superadmin
            ? "El barrio puede quedar suelto o dentro de un complejo. Después cargás los lotes."
            : "El barrio queda en tu complejo. Después cargás los lotes adentro."
        }
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createNeighborhood} className={ui.form}>
          <BarrioFields
            complexes={complexes ?? []}
            hiddenComplexId={hiddenComplexId}
            superadmin={superadmin}
            defaultComplexId={defaultComplexId ?? null}
          />
          <button className={ui.button} type="submit">
            Crear barrio
          </button>
        </form>
      </section>
    </>
  );
}

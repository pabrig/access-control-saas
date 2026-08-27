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

export default async function NuevoBarrioPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
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
  const hiddenComplexId =
    managedComplexIds[0] ??
    ((complexes ?? []).length === 1 ? (complexes ?? [])[0]?.id : null);

  return (
    <>
      <Link className={ui.backLink} href="/lotes">
        <Icon name="back" size={18} />
        Comunidad
      </Link>
      <PageHeader
        kicker="Comunidad"
        title="Nuevo barrio"
        description="El barrio queda en tu complejo. Después cargás los lotes adentro."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createNeighborhood} className={ui.form}>
          {hiddenComplexId ? (
            <input type="hidden" name="complex_id" value={hiddenComplexId} />
          ) : (complexes ?? []).length > 1 ? (
            <label>
              Complejo
              <select name="complex_id" required defaultValue="">
                <option value="" disabled>
                  Elegí el complejo
                </option>
                {(complexes ?? []).map((complex) => (
                  <option key={complex.id} value={complex.id}>
                    {complex.name}
                  </option>
                ))}
              </select>
            </label>
          ) : isSuperadmin(session) ? null : (
            <p className={ui.muted}>No hay un complejo asignado a tu rol.</p>
          )}
          <label>
            Nombre del barrio
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Ej. Los Robles"
            />
          </label>
          <button className={ui.button} type="submit">
            Crear barrio
          </button>
        </form>
      </section>
    </>
  );
}

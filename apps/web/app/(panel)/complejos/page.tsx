import Link from "next/link";
import { redirect } from "next/navigation";
import { Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { canManageStructure, isSuperadmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import ops from "../ops-overview.module.css";

export default async function ComplejosPage() {
  const session = await requireAdmin();
  const superadmin = isSuperadmin(session);
  if (!canManageStructure(session)) {
    redirect("/");
  }

  const supabase = await createClient();
  const [{ data: complexes }, { data: neighborhoods }] = await Promise.all([
    supabase.from("complexes").select("id, name").order("name"),
    supabase.from("neighborhoods").select("id, complex_id"),
  ]);

  if (!superadmin && (complexes ?? []).length === 1 && complexes?.[0]) {
    redirect(`/complejos/${complexes[0].id}`);
  }

  const barrioCount = new Map<string, number>();
  for (const neighborhood of neighborhoods ?? []) {
    if (!neighborhood.complex_id) {
      continue;
    }
    barrioCount.set(
      neighborhood.complex_id,
      (barrioCount.get(neighborhood.complex_id) ?? 0) + 1,
    );
  }

  return (
    <>
      <Link className={ui.backLink} href="/">
        <Icon name="back" size={18} />
        Inicio
      </Link>
      <PageHeader
        kicker="Estructura"
        title="Complejos"
        description={
          superadmin
            ? "Alta, edición y baja. Entrá a uno para ver sus barrios."
            : "Tu complejo. Entrá para editarlo y gestionar barrios y lotes."
        }
        actions={
          superadmin ? (
            <Link className={ui.button} href="/complejos/nuevo">
              <Icon name="plus" size={18} />
              Nuevo complejo
            </Link>
          ) : null
        }
      />

      {(complexes ?? []).length === 0 ? (
        <Empty
          title="Todavía no hay complejos"
          description="Creá el primero y después asignale barrios."
        />
      ) : (
        <ul className={ops.cards}>
          {(complexes ?? []).map((complex) => {
            const count = barrioCount.get(complex.id) ?? 0;
            return (
              <li key={complex.id}>
                <Link className={ops.card} href={`/complejos/${complex.id}`}>
                  <h2>{complex.name}</h2>
                  <p className={ops.cardMeta}>
                    {count} {count === 1 ? "barrio" : "barrios"}
                  </p>
                  <span className={ops.cardAction}>Abrir</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

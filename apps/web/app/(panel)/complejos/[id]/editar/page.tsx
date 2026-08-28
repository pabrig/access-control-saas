import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { canManageComplex, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { updateComplex } from "../../actions";

export default async function EditarComplejoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  if (!canManageComplex(session, id)) {
    redirect("/");
  }

  const supabase = await createClient();
  const { data: complex } = await supabase
    .from("complexes")
    .select("id, name")
    .eq("id", id)
    .maybeSingle();

  if (!complex) {
    notFound();
  }

  return (
    <>
      <Link className={ui.backLink} href={`/complejos/${complex.id}`}>
        <Icon name="back" size={18} />
        {complex.name}
      </Link>
      <PageHeader
        kicker="Complejo"
        title="Editar complejo"
        description="Cambiá el nombre. Los barrios siguen asociados."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={updateComplex} className={ui.form}>
          <input type="hidden" name="id" value={complex.id} />
          <label>
            Nombre del complejo
            <input
              name="name"
              required
              maxLength={80}
              defaultValue={complex.name}
            />
          </label>
          <button className={ui.button} type="submit">
            Guardar
          </button>
        </form>
      </section>
    </>
  );
}

import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isSuperadmin, requireAdmin } from "@/lib/session";
import { createComplex } from "../actions";

export default async function NuevoComplejoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();

  if (!isSuperadmin(session)) {
    redirect("/");
  }

  return (
    <>
      <Link className={ui.backLink} href="/">
        <Icon name="back" size={18} />
        Inicio
      </Link>
      <PageHeader
        kicker="Estructura"
        title="Nuevo complejo"
        description="El complejo agrupa barrios. Después cargás barrios y lotes adentro."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createComplex} className={ui.form}>
          <label>
            Nombre del complejo
            <input
              name="name"
              required
              maxLength={80}
              placeholder="Ej. Master Plan Norte"
            />
          </label>
          <button className={ui.button} type="submit">
            Crear complejo
          </button>
        </form>
      </section>
    </>
  );
}

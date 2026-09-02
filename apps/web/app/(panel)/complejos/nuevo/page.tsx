import Link from "next/link";
import { redirect } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isSuperadmin, requireAdmin } from "@/lib/session";
import { createComplex } from "../actions";
import { ComplexFields } from "../complex-fields";

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
        description="Completá los datos básicos. Después podés agregar barrios y lotes."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={createComplex} className={ui.form}>
          <ComplexFields />
          <button className={ui.button} type="submit">
            Crear complejo
          </button>
        </form>
      </section>
    </>
  );
}

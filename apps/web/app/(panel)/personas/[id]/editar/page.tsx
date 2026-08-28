import Link from "next/link";
import { notFound } from "next/navigation";
import { Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { personName } from "@/lib/format";
import { requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { updatePerson } from "../../actions";
import { PersonFields } from "../../person-fields";

export default async function EditarPersonaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const session = await requireAdmin();
  const supabase = await createClient();
  const { data: person } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, is_active")
    .eq("id", id)
    .maybeSingle();

  if (!person) {
    notFound();
  }

  const isSelf = person.id === session.userId;

  return (
    <>
      <Link className={ui.backLink} href={`/personas/${person.id}`}>
        <Icon name="back" size={18} />
        {personName(person)}
      </Link>
      <PageHeader
        kicker="Persona"
        title="Editar persona"
        description="Nombre y si la cuenta sigue activa. El email de acceso no se cambia acá."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={ui.card}>
        <form action={updatePerson} className={ui.form}>
          <input type="hidden" name="id" value={person.id} />
          <PersonFields value={person} />
          {isSelf ? (
            <input type="hidden" name="is_active" value="on" />
          ) : (
            <label className={ui.check}>
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={person.is_active}
              />
              Cuenta activa
            </label>
          )}
          <button className={ui.button} type="submit">
            Guardar
          </button>
        </form>
      </section>
    </>
  );
}

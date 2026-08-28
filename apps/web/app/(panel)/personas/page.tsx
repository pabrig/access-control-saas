import Link from "next/link";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isNeighborhoodAdmin, requireAdmin } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { PersonCard } from "./person-card";

export default async function PersonasPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireAdmin();
  const barrio = isNeighborhoodAdmin(session);
  const supabase = await createClient();

  const [
    { data: profiles, error },
    { data: roles },
    { data: properties },
    { data: neighborhoods },
    { data: complexes },
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, first_name, last_name, email, is_active")
      .order("last_name"),
    supabase
      .from("user_roles")
      .select("id, user_id, role, complex_id, neighborhood_id, property_id"),
    supabase.from("properties").select("id, lot_number, street_name"),
    supabase.from("neighborhoods").select("id, name"),
    supabase.from("complexes").select("id, name"),
  ]);

  const maps = {
    propertyById: new Map((properties ?? []).map((row) => [row.id, row])),
    neighborhoodById: new Map(
      (neighborhoods ?? []).map((row) => [row.id, row]),
    ),
    complexById: new Map((complexes ?? []).map((row) => [row.id, row])),
  };

  const people = (profiles ?? []).map((profile) => ({
    ...profile,
    roles: (roles ?? []).filter((role) => role.user_id === profile.id),
  }));

  return (
    <>
      <PageHeader
        kicker="Comunidad"
        title="Personas"
        description={
          barrio
            ? "Residentes y guardias de tu barrio. Creá la cuenta acá."
            : "Quién vive, quién administra y quién está de guardia, según lo que te deja ver tu rol."
        }
        actions={
          <Link className={ui.button} href="/personas/nuevo">
            <Icon name="plus" size={18} />
            Nueva persona
          </Link>
        }
      />

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.created ? <Banner>Persona guardada.</Banner> : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {people.length === 0 ? (
        <Empty
          title="No hay personas visibles"
          description="Cargá la primera persona de tu alcance."
        />
      ) : (
        <ul className={ui.list}>
          {people.map((person) => (
            <li key={person.id}>
              <PersonCard person={person} maps={maps} />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

import { personName } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";

export async function loadResidentsByLot() {
  const supabase = await createClient();
  const [{ data: roles }, { data: profiles }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("user_id, property_id, role")
      .eq("role", "OWNER"),
    supabase.from("profiles").select("id, first_name, last_name"),
  ]);

  const names = new Map(
    (profiles ?? []).map((profile) => [
      profile.id,
      personName(profile) || "Residente",
    ]),
  );
  const byLot = new Map<string, string[]>();

  for (const row of roles ?? []) {
    if (!row.property_id) {
      continue;
    }
    const current = byLot.get(row.property_id) ?? [];
    current.push(names.get(row.user_id) || "Residente");
    byLot.set(row.property_id, current);
  }

  return byLot;
}

export function lotCountLabel(count: number) {
  return `${count} ${count === 1 ? "lote" : "lotes"}`;
}

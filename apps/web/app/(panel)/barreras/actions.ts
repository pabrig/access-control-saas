"use server";

import { redirect } from "next/navigation";
import {
  assignedNeighborhoodId,
  isNeighborhoodAdmin,
  requireAdmin,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/barreras?error=${encodeURIComponent(message)}`);
}

export async function createGate(formData: FormData) {
  const session = await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  let type = String(formData.get("type") ?? "");
  let complexId = String(formData.get("complex_id") ?? "") || null;
  let neighborhoodId = String(formData.get("neighborhood_id") ?? "") || null;

  if (isNeighborhoodAdmin(session)) {
    const assigned = assignedNeighborhoodId(session);
    if (!assigned) {
      fail("No tenés un barrio asignado.");
    }
    type = "INTERNAL_NEIGHBORHOOD";
    neighborhoodId = assigned;
    complexId = null;
  }

  if (!name || !type) {
    fail("La barrera necesita nombre y tipo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gates").insert({
    name,
    type: type as "MAIN_COMPLEX" | "INTERNAL_NEIGHBORHOOD",
    complex_id: type === "MAIN_COMPLEX" ? complexId : null,
    neighborhood_id: type === "INTERNAL_NEIGHBORHOOD" ? neighborhoodId : null,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/barreras?created=1");
}

export async function renameGate(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();

  if (!id || !name) {
    fail("La barrera necesita un nombre.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("gates").update({ name }).eq("id", id);

  if (error) {
    fail(error.message);
  }

  redirect("/barreras");
}

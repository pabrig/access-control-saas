"use server";

import { redirect } from "next/navigation";
import type { Role } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/personas?error=${encodeURIComponent(message)}`);
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function assignRole(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const complexId = emptyToNull(formData.get("complex_id"));
  const neighborhoodId = emptyToNull(formData.get("neighborhood_id"));
  const propertyId = emptyToNull(formData.get("property_id"));

  if (!userId || !role) {
    fail("Elegí una persona y un rol.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role,
    complex_id: complexId,
    neighborhood_id: neighborhoodId,
    property_id: propertyId,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/personas?created=1");
}

export async function removeRole(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("Rol inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").delete().eq("id", id);

  if (error) {
    fail(error.message);
  }

  redirect("/personas");
}

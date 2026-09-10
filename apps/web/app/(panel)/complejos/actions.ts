"use server";

import { redirect } from "next/navigation";
import { requireLocation } from "@/lib/admin-form";
import { canManageComplex, isSuperadmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

export async function createComplex(formData: FormData) {
  const session = await requireSession();
  if (!isSuperadmin(session)) {
    fail("/", "Solo superadmin puede crear complejos.");
  }

  const name = String(formData.get("name") ?? "").trim();
  const location = requireLocation(formData.get("location"));
  if (!name) {
    fail("/complejos/nuevo", "El complejo necesita un nombre.");
  }
  if (!location) {
    fail(
      "/complejos/nuevo",
      "La ubicación es obligatoria (mínimo 3 caracteres).",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("complexes")
    .insert({ name, location })
    .select("id")
    .single();

  if (error || !data) {
    fail("/complejos/nuevo", error?.message ?? "No se pudo crear el complejo.");
  }

  redirect(`/complejos/${data.id}?created=1`);
}

export async function updateComplex(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const location = requireLocation(formData.get("location"));

  if (!id || !name) {
    fail(
      id ? `/complejos/${id}/editar` : "/complejos",
      "El complejo necesita un nombre.",
    );
  }
  if (!location) {
    fail(
      id ? `/complejos/${id}/editar` : "/complejos",
      "La ubicación es obligatoria (mínimo 3 caracteres).",
    );
  }

  if (!canManageComplex(session, id)) {
    fail(`/complejos/${id}/editar`, "No podés editar este complejo.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("complexes")
    .update({ name, location })
    .eq("id", id);

  if (error) {
    fail(`/complejos/${id}/editar`, error.message);
  }

  redirect(`/complejos/${id}`);
}

export async function deleteComplex(formData: FormData) {
  const session = await requireSession();
  if (!isSuperadmin(session)) {
    fail("/", "Solo superadmin puede eliminar un complejo.");
  }

  const id = String(formData.get("id") ?? "");
  if (!id) {
    fail("/complejos", "Complejo inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("complexes").delete().eq("id", id);

  if (error) {
    fail(`/complejos/${id}`, error.message);
  }

  redirect("/complejos");
}

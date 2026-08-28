"use server";

import { redirect } from "next/navigation";
import {
  assignableRoles,
  canRemoveAssignedRole,
  requireAdmin,
  type Role,
} from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function emptyToNull(value: FormDataEntryValue | null) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

function peopleNext(formData: FormData, fallback = "/personas") {
  const next = String(formData.get("next") ?? "").trim();
  if (next.startsWith("/personas")) {
    return next.split("?")[0] || "/personas";
  }
  return fallback;
}

function scopeForRole(role: Role, formData: FormData) {
  const complexId = emptyToNull(formData.get("complex_id"));
  const neighborhoodId = emptyToNull(formData.get("neighborhood_id"));
  const propertyId = emptyToNull(formData.get("property_id"));

  if (role === "COMPLEX_ADMIN") {
    return { complexId, neighborhoodId: null, propertyId: null };
  }
  if (role === "NEIGHBORHOOD_ADMIN") {
    return { complexId: null, neighborhoodId, propertyId: null };
  }
  if (role === "OWNER") {
    return { complexId: null, neighborhoodId: null, propertyId };
  }
  return { complexId: null, neighborhoodId: null, propertyId: null };
}

export async function createPerson(formData: FormData) {
  const session = await requireAdmin();
  const allowed = assignableRoles(session);
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const role = String(formData.get("role") ?? "") as Role;
  const scope = scopeForRole(role, formData);

  if (!email || !email.includes("@")) {
    fail("/personas/nuevo", "El email no es válido.");
  }
  if (password.length < 8) {
    fail(
      "/personas/nuevo",
      "La contraseña tiene que tener al menos 8 caracteres.",
    );
  }
  if (!firstName || !lastName) {
    fail("/personas/nuevo", "Nombre y apellido son obligatorios.");
  }
  if (!role || !allowed.includes(role)) {
    fail("/personas/nuevo", "Elegí un rol que puedas asignar.");
  }
  if (role === "OWNER" && !scope.propertyId) {
    fail("/personas/nuevo", "Elegí el lote de la persona.");
  }
  if (role === "NEIGHBORHOOD_ADMIN" && !scope.neighborhoodId) {
    fail("/personas/nuevo", "Elegí el barrio que administra.");
  }
  if (role === "COMPLEX_ADMIN" && !scope.complexId) {
    fail("/personas/nuevo", "Elegí el complejo que administra.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_create_person", {
    p_email: email,
    p_password: password,
    p_first_name: firstName,
    p_last_name: lastName,
    p_role: role,
    p_complex_id: scope.complexId,
    p_neighborhood_id: scope.neighborhoodId,
    p_property_id: scope.propertyId,
  });

  if (error || !data) {
    fail("/personas/nuevo", error?.message ?? "No se pudo crear la persona.");
  }

  redirect(`/personas/${data}?created=1`);
}

export async function updatePerson(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const isActive = formData.get("is_active") === "on";

  if (!id) {
    fail("/personas", "Persona inválida.");
  }
  if (!firstName || !lastName) {
    fail(`/personas/${id}/editar`, "Nombre y apellido son obligatorios.");
  }
  if (id === session.userId && !isActive) {
    fail(`/personas/${id}/editar`, "No podés desactivar tu propia cuenta.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({
      first_name: firstName,
      last_name: lastName,
      is_active: isActive,
    })
    .eq("id", id);

  if (error) {
    fail(`/personas/${id}/editar`, error.message);
  }

  redirect(`/personas/${id}`);
}

export async function deactivatePerson(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("/personas", "Persona inválida.");
  }
  if (id === session.userId) {
    fail(`/personas/${id}`, "No podés desactivar tu propia cuenta.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: false })
    .eq("id", id);

  if (error) {
    fail(`/personas/${id}`, error.message);
  }

  redirect(`/personas/${id}`);
}

export async function activatePerson(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("/personas", "Persona inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ is_active: true })
    .eq("id", id);

  if (error) {
    fail(`/personas/${id}`, error.message);
  }

  redirect(`/personas/${id}`);
}

export async function assignRole(formData: FormData) {
  const session = await requireAdmin();
  const allowed = assignableRoles(session);
  const userId = String(formData.get("user_id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const scope = scopeForRole(role, formData);
  const next = peopleNext(
    formData,
    userId ? `/personas/${userId}` : "/personas",
  );

  if (!userId || !role) {
    fail(next, "Elegí una persona y un rol.");
  }
  if (!allowed.includes(role)) {
    fail(next, "No podés asignar ese rol.");
  }
  if (role === "OWNER" && !scope.propertyId) {
    fail(next, "Elegí el lote.");
  }
  if (role === "NEIGHBORHOOD_ADMIN" && !scope.neighborhoodId) {
    fail(next, "Elegí el barrio.");
  }
  if (role === "COMPLEX_ADMIN" && !scope.complexId) {
    fail(next, "Elegí el complejo.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role,
    complex_id: scope.complexId,
    neighborhood_id: scope.neighborhoodId,
    property_id: scope.propertyId,
  });

  if (error) {
    fail(next, error.message);
  }

  const separator = next.includes("?") ? "&" : "?";
  redirect(`${next}${separator}rol=1`);
}

export async function removeRole(formData: FormData) {
  const session = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const role = String(formData.get("role") ?? "") as Role;
  const next = peopleNext(formData, "/personas");

  if (!id) {
    fail(next, "Rol inválido.");
  }
  if (role && !canRemoveAssignedRole(session, role)) {
    fail(next, "No podés quitar ese rol.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").delete().eq("id", id);

  if (error) {
    fail(next, error.message);
  }

  redirect(next);
}

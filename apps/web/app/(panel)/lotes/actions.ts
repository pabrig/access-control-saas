"use server";

import { redirect } from "next/navigation";
import {
  assignedNeighborhoodId,
  canAssignResidents,
  canCreateNeighborhood,
  isAdmin,
  isNeighborhoodAdmin,
  isSuperadmin,
  requireSession,
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

function nextPath(formData: FormData) {
  return String(formData.get("next") ?? "") === "/personas"
    ? "/personas"
    : "/lotes";
}

function lotFields(formData: FormData) {
  return {
    lot_number: String(formData.get("lot_number") ?? "").trim(),
    street_name: emptyToNull(formData.get("street_name")),
    block_name: emptyToNull(formData.get("block_name")),
    phone: emptyToNull(formData.get("phone")),
    notes: emptyToNull(formData.get("notes")),
  };
}

export async function createProperty(formData: FormData) {
  const session = await requireSession();
  let neighborhoodId = String(formData.get("neighborhood_id") ?? "");
  const fields = lotFields(formData);

  if (isNeighborhoodAdmin(session)) {
    neighborhoodId = assignedNeighborhoodId(session) ?? "";
  }

  if (!neighborhoodId || !fields.lot_number) {
    fail(
      "/lotes/nuevo",
      isNeighborhoodAdmin(session)
        ? "El lote necesita un número."
        : "Elegí el barrio y el número de lote.",
    );
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("properties")
    .insert({
      neighborhood_id: neighborhoodId,
      ...fields,
    })
    .select("id")
    .single();

  if (error || !data) {
    fail("/lotes/nuevo", error?.message ?? "No se pudo guardar el lote.");
  }

  redirect(`/lotes/${data.id}?created=1`);
}

export async function updateProperty(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const fields = lotFields(formData);
  const neighborhoodId = String(formData.get("neighborhood_id") ?? "");

  if (!id || !fields.lot_number) {
    fail(id ? `/lotes/${id}/editar` : "/lotes", "El lote necesita un número.");
  }

  const supabase = await createClient();
  const patch: ReturnType<typeof lotFields> & { neighborhood_id?: string } = {
    ...fields,
  };

  if (neighborhoodId && !isNeighborhoodAdmin(session)) {
    patch.neighborhood_id = neighborhoodId;
  }

  const { error } = await supabase
    .from("properties")
    .update(patch)
    .eq("id", id);

  if (error) {
    fail(`/lotes/${id}/editar`, error.message);
  }

  redirect(`/lotes/${id}`);
}

export async function createNeighborhood(formData: FormData) {
  const session = await requireSession();

  if (!canCreateNeighborhood(session)) {
    fail("/barrios/nuevo", "Solo el admin del complejo puede crear barrios.");
  }

  const name = String(formData.get("name") ?? "").trim();
  let complexId = String(formData.get("complex_id") ?? "") || null;

  if (!name) {
    fail("/barrios/nuevo", "El barrio necesita un nombre.");
  }

  if (!isSuperadmin(session)) {
    const allowed = session.roles
      .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
      .map((row) => row.complex_id as string);

    if (!complexId) {
      complexId = allowed[0] ?? null;
    }

    if (!complexId || !allowed.includes(complexId)) {
      fail(
        "/barrios/nuevo",
        "El barrio tiene que pertenecer a un complejo que administres.",
      );
    }
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("neighborhoods")
    .insert({
      name,
      complex_id: complexId,
    })
    .select("id")
    .single();

  if (error || !data) {
    fail("/barrios/nuevo", error?.message ?? "No se pudo crear el barrio.");
  }

  redirect(`/barrios/${data.id}`);
}

export async function updateNeighborhood(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  let complexId = String(formData.get("complex_id") ?? "") || null;

  if (!id || !name) {
    fail(
      id ? `/barrios/${id}/editar` : "/lotes",
      "El barrio necesita un nombre.",
    );
  }

  const patch: { name: string; complex_id?: string | null } = { name };

  if (isSuperadmin(session)) {
    patch.complex_id = complexId;
  } else if (canCreateNeighborhood(session)) {
    const allowed = session.roles
      .filter((row) => row.role === "COMPLEX_ADMIN" && row.complex_id)
      .map((row) => row.complex_id as string);

    if (!complexId) {
      complexId = allowed[0] ?? null;
    }
    if (!complexId || !allowed.includes(complexId)) {
      fail(
        `/barrios/${id}/editar`,
        "El barrio tiene que pertenecer a un complejo que administres.",
      );
    }
    patch.complex_id = complexId;
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("neighborhoods")
    .update(patch)
    .eq("id", id);

  if (error) {
    fail(`/barrios/${id}/editar`, error.message);
  }

  redirect(`/barrios/${id}`);
}

export async function deleteNeighborhood(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("/lotes", "Barrio inválido.");
  }

  if (!isSuperadmin(session) && !canCreateNeighborhood(session)) {
    fail(`/barrios/${id}`, "No podés eliminar este barrio.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("properties")
    .select("id", { count: "exact", head: true })
    .eq("neighborhood_id", id);

  if ((count ?? 0) > 0) {
    fail(`/barrios/${id}`, "Primero eliminá o mové los lotes de este barrio.");
  }

  const { error } = await supabase.from("neighborhoods").delete().eq("id", id);

  if (error) {
    fail(`/barrios/${id}`, error.message);
  }

  redirect("/lotes");
}

export async function deleteProperty(formData: FormData) {
  const session = await requireSession();
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("/lotes", "Lote inválido.");
  }

  if (!isAdmin(session)) {
    fail(`/lotes/${id}`, "No podés eliminar este lote.");
  }

  const supabase = await createClient();
  const { count } = await supabase
    .from("invitations")
    .select("id", { count: "exact", head: true })
    .eq("property_id", id);

  if ((count ?? 0) > 0) {
    fail(
      `/lotes/${id}`,
      "Este lote tiene pases. Cancelalos o eliminalos antes de borrar el lote.",
    );
  }

  const { data: property } = await supabase
    .from("properties")
    .select("neighborhood_id")
    .eq("id", id)
    .maybeSingle();

  const { error } = await supabase.from("properties").delete().eq("id", id);

  if (error) {
    fail(`/lotes/${id}`, error.message);
  }

  redirect(
    property?.neighborhood_id
      ? `/barrios/${property.neighborhood_id}`
      : "/lotes",
  );
}

export async function assignResident(formData: FormData) {
  const session = await requireSession();
  const next = nextPath(formData);

  if (!canAssignResidents(session)) {
    fail(next, "No podés asignar residentes.");
  }

  const userId = String(formData.get("user_id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");

  if (!userId || !propertyId) {
    fail(next, "Elegí una persona y un lote.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").insert({
    user_id: userId,
    role: "OWNER",
    property_id: propertyId,
    complex_id: null,
    neighborhood_id: null,
  });

  if (error) {
    fail(next, error.message);
  }

  const separator = next.includes("?") ? "&" : "?";
  redirect(`${next}${separator}residente=1`);
}

export async function unassignResident(formData: FormData) {
  const session = await requireSession();
  const next = nextPath(formData);
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail(next, "Residente inválido.");
  }

  if (!canAssignResidents(session) && !isSuperadmin(session)) {
    fail(next, "No podés quitar residentes.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("user_roles").delete().eq("id", id);

  if (error) {
    fail(next, error.message);
  }

  redirect(next);
}

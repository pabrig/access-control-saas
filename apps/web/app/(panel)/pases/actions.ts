"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function destination(next: string) {
  const path = next.split("?")[0] ?? next;
  if (path.startsWith("/reservas")) {
    return "/reservas";
  }

  if (path.startsWith("/movimientos")) {
    return "/movimientos";
  }

  if (/^\/pases\/[0-9a-f-]{36}$/i.test(path)) {
    return path;
  }

  return "/pases";
}

function fail(message: string, next = "/pases"): never {
  redirect(`${destination(next)}?error=${encodeURIComponent(message)}`);
}

async function loadOwnedProperty(propertyId: string) {
  const supabase = await createClient();
  const { data: property, error } = await supabase
    .from("properties")
    .select("id, neighborhood_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (error || !property) {
    fail("No podés crear una invitación para ese lote.");
  }

  return { supabase, property };
}

export async function createShareInvite(formData: FormData) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const propertyId = String(formData.get("property_id") ?? "");
  const validFromRaw = String(formData.get("valid_from") ?? "");
  const validToRaw = String(formData.get("valid_to") ?? "");
  const isSingleUse = formData.get("is_single_use") === "on";

  if (!propertyId || !validFromRaw || !validToRaw) {
    fail("Completá hasta cuándo vale la invitación.");
  }

  const validFrom = new Date(validFromRaw);
  const validTo = new Date(validToRaw);

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    fail("Las fechas no son válidas.");
  }

  if (!(validTo > validFrom)) {
    fail("La fecha hasta tiene que ser después de la de inicio.");
  }

  const { supabase, property } = await loadOwnedProperty(propertyId);
  const { error } = await supabase.from("invitations").insert({
    property_id: property.id,
    neighborhood_id: property.neighborhood_id,
    created_by_user_id: user.id,
    valid_from: validFrom.toISOString(),
    valid_to: validTo.toISOString(),
    is_single_use: isSingleUse,
    status: "DRAFT",
    qr_token: null,
    guest_name: null,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/pases?created=share");
}

export async function createDoorInvite(formData: FormData) {
  const supabaseAuth = await createClient();
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const guestName = String(formData.get("guest_name") ?? "").trim();
  const propertyId = String(formData.get("property_id") ?? "");
  const validFromRaw = String(formData.get("valid_from") ?? "");
  const validToRaw = String(formData.get("valid_to") ?? "");
  const isSingleUse = formData.get("is_single_use") === "on";

  if (!guestName || !propertyId || !validFromRaw || !validToRaw) {
    fail("Para generar el QR acá hace falta el nombre y hasta cuándo vale.");
  }

  const validFrom = new Date(validFromRaw);
  const validTo = new Date(validToRaw);

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    fail("Las fechas no son válidas.");
  }

  if (!(validTo > validFrom)) {
    fail("La fecha hasta tiene que ser después de la de inicio.");
  }

  const { supabase, property } = await loadOwnedProperty(propertyId);
  const { error } = await supabase.from("invitations").insert({
    guest_name: guestName,
    property_id: property.id,
    neighborhood_id: property.neighborhood_id,
    created_by_user_id: user.id,
    valid_from: validFrom.toISOString(),
    valid_to: validTo.toISOString(),
    is_single_use: isSingleUse,
    status: "READY",
    qr_token: crypto.randomUUID(),
  });

  if (error) {
    fail(error.message);
  }

  redirect("/pases?created=door");
}

export async function revokeInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "/pases");

  if (!id) {
    fail("Invitación inválida.", next);
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ is_revoked: true })
    .eq("id", id);

  if (error) {
    fail(error.message, next);
  }

  redirect(destination(next));
}

export async function updateInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "/pases");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const validFromRaw = String(formData.get("valid_from") ?? "");
  const validToRaw = String(formData.get("valid_to") ?? "");

  if (!id || !validFromRaw || !validToRaw) {
    fail("Completá las fechas de la invitación.", next);
  }

  const validFrom = new Date(validFromRaw);
  const validTo = new Date(validToRaw);

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    fail("Las fechas no son válidas.", next);
  }

  if (!(validTo > validFrom)) {
    fail("La fecha hasta tiene que ser después de la de inicio.", next);
  }

  const supabase = await createClient();
  const patch: {
    valid_from: string;
    valid_to: string;
    guest_name?: string;
  } = {
    valid_from: validFrom.toISOString(),
    valid_to: validTo.toISOString(),
  };

  if (guestName) {
    patch.guest_name = guestName;
  }

  const { error } = await supabase
    .from("invitations")
    .update(patch)
    .eq("id", id);

  if (error) {
    fail(error.message, next);
  }

  redirect(`${destination(next)}?updated=1`);
}

export async function deleteInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const next = String(formData.get("next") ?? "/pases");

  if (!id) {
    fail("Invitación inválida.", next);
  }

  const supabase = await createClient();
  const { error } = await supabase.from("invitations").delete().eq("id", id);

  if (error) {
    fail(error.message, next);
  }

  redirect("/pases");
}

"use server";

import { redirect } from "next/navigation";
import { parsePlate } from "@/lib/plates";
import { isOwner, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

function fail(path: string, message: string): never {
  const separator = path.includes("?") ? "&" : "?";
  redirect(`${path}${separator}error=${encodeURIComponent(message)}`);
}

function credencialPath(credentialId?: string) {
  return credentialId ? `/credencial?c=${credentialId}` : "/credencial";
}

export async function updateProfileDni(formData: FormData) {
  const session = await requireSession();
  if (!isOwner(session)) {
    fail("/credencial", "No podés editar la credencial.");
  }

  const dni = String(formData.get("dni") ?? "").trim() || null;
  const supabase = await createClient();
  const { error } = await supabase
    .from("profiles")
    .update({ dni })
    .eq("id", session.userId);

  if (error) {
    fail("/credencial", error.message);
  }

  redirect("/credencial?updated=1");
}

export async function addResidentVehicle(formData: FormData) {
  const session = await requireSession();
  const credentialId = String(formData.get("credential_id") ?? "");
  const plateRaw = String(formData.get("plate") ?? "");
  const color = String(formData.get("color") ?? "").trim() || null;
  const plate = parsePlate(plateRaw);

  if (!credentialId) {
    fail("/credencial", "Credencial inválida.");
  }

  if (!plate) {
    fail(credencialPath(credentialId), "La patente tiene que ser AAA 000 o AA000AA.");
  }

  const supabase = await createClient();
  const { data: credential } = await supabase
    .from("resident_credentials")
    .select("id")
    .eq("id", credentialId)
    .eq("profile_id", session.userId)
    .maybeSingle();

  if (!credential) {
    fail("/credencial", "No encontramos tu credencial.");
  }

  const { error } = await supabase.from("resident_vehicles").insert({
    credential_id: credentialId,
    plate_normalized: plate.normalized,
    plate_display: plate.display,
    plate_format: plate.format,
    color,
  });

  if (error) {
    fail(credencialPath(credentialId), error.message);
  }

  redirect(`${credencialPath(credentialId)}&updated=1`);
}

export async function removeResidentVehicle(formData: FormData) {
  const session = await requireSession();
  const vehicleId = String(formData.get("vehicle_id") ?? "");
  const credentialId = String(formData.get("credential_id") ?? "");

  if (!vehicleId) {
    fail("/credencial", "Vehículo inválido.");
  }

  const supabase = await createClient();
  const { data: vehicle } = await supabase
    .from("resident_vehicles")
    .select("id, credential_id, resident_credentials!inner(profile_id)")
    .eq("id", vehicleId)
    .maybeSingle();

  const ownerId = Array.isArray(vehicle?.resident_credentials)
    ? vehicle.resident_credentials[0]?.profile_id
    : (
        vehicle?.resident_credentials as { profile_id: string } | null | undefined
      )?.profile_id;

  if (!vehicle || ownerId !== session.userId) {
    fail("/credencial", "No podés quitar ese vehículo.");
  }

  const { error } = await supabase
    .from("resident_vehicles")
    .delete()
    .eq("id", vehicleId);

  if (error) {
    fail(credencialPath(credentialId), error.message);
  }

  redirect(`${credencialPath(credentialId || vehicle.credential_id)}&updated=1`);
}

export async function createCoOwnerInvite(formData: FormData) {
  const session = await requireSession();
  if (!isOwner(session)) {
    fail("/credencial", "No podés invitar co-propietarios.");
  }

  const propertyId = String(formData.get("property_id") ?? "");
  const inviteeDni = String(formData.get("invitee_dni") ?? "").trim() || null;
  const inviteeEmail = String(formData.get("invitee_email") ?? "").trim() || null;

  if (!propertyId) {
    fail("/credencial", "Elegí un lote.");
  }

  const supabase = await createClient();
  const { data: shareToken, error } = await supabase.rpc("create_resident_invite", {
    p_property_id: propertyId,
    p_invitee_dni: inviteeDni,
    p_invitee_email: inviteeEmail,
  });

  if (error || !shareToken) {
    fail("/credencial", error?.message ?? "No se pudo crear la invitación.");
  }

  redirect(`/credencial?invite=${shareToken}`);
}

export async function revokeCoOwnerInvite(formData: FormData) {
  const session = await requireSession();
  if (!isOwner(session)) {
    fail("/credencial", "No podés cancelar invitaciones.");
  }

  const inviteId = String(formData.get("invite_id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");

  if (!inviteId) {
    fail("/credencial", "Invitación inválida.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("resident_invites")
    .update({ status: "REVOKED" })
    .eq("id", inviteId)
    .eq("property_id", propertyId);

  if (error) {
    fail("/credencial", error.message);
  }

  redirect("/credencial?updated=1");
}

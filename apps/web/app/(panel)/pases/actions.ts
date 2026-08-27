"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/pases?error=${encodeURIComponent(message)}`);
}

export async function createInvitation(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestDni = String(formData.get("guest_dni") ?? "").trim() || null;
  const propertyId = String(formData.get("property_id") ?? "");
  const validFromRaw = String(formData.get("valid_from") ?? "");
  const validToRaw = String(formData.get("valid_to") ?? "");
  const isSingleUse = formData.get("is_single_use") === "on";

  if (!guestName || !propertyId || !validFromRaw || !validToRaw) {
    fail("Completá nombre, lote y hasta cuándo vale el pase.");
  }

  const validFrom = new Date(validFromRaw);
  const validTo = new Date(validToRaw);

  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) {
    fail("Las fechas no son válidas.");
  }

  if (!(validTo > validFrom)) {
    fail("La fecha hasta tiene que ser después de la de inicio.");
  }

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, neighborhood_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !property) {
    fail("No podés crear un pase para ese lote.");
  }

  const { error } = await supabase.from("invitations").insert({
    guest_name: guestName,
    guest_dni: guestDni,
    property_id: property.id,
    neighborhood_id: property.neighborhood_id,
    created_by_user_id: user.id,
    valid_from: validFrom.toISOString(),
    valid_to: validTo.toISOString(),
    is_single_use: isSingleUse,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/pases?created=1");
}

export async function revokeInvitation(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("Pase inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ is_revoked: true })
    .eq("id", id);

  if (error) {
    fail(error.message);
  }

  redirect("/pases");
}

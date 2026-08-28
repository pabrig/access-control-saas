"use server";

import { redirect } from "next/navigation";
import { amenityById, bookingLabel } from "@/lib/amenities";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/reservas?error=${encodeURIComponent(message)}`);
}

export async function createAmenityBooking(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const amenityId = String(formData.get("amenity_id") ?? "");
  const propertyId = String(formData.get("property_id") ?? "");
  const startRaw = String(formData.get("starts_at") ?? "");
  const guests = String(formData.get("guests") ?? "")
    .split("\n")
    .map((name) => name.trim())
    .filter(Boolean)
    .slice(0, 20);

  const amenity = amenityById(amenityId);
  const startsAt = new Date(startRaw);

  if (!propertyId || Number.isNaN(startsAt.getTime())) {
    fail("Elegí el espacio y un horario.");
  }

  const endsAt = new Date(startsAt.getTime() + amenity.hours * 60 * 60 * 1000);
  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id, neighborhood_id")
    .eq("id", propertyId)
    .maybeSingle();

  if (propertyError || !property) {
    fail("No podés crear el evento con ese lote.");
  }

  const label = bookingLabel(amenity.name);
  const { data: existing } = await supabase
    .from("invitations")
    .select("id, valid_from, valid_to")
    .eq("guest_name", label)
    .eq("is_revoked", false);

  const overlap = (existing ?? []).some((row) => {
    const from = new Date(row.valid_from).getTime();
    const to = new Date(row.valid_to).getTime();
    return startsAt.getTime() < to && endsAt.getTime() > from;
  });

  if (overlap) {
    fail("Ese horario ya está tomado.");
  }

  const { error: bookingError } = await supabase.from("invitations").insert({
    property_id: property.id,
    neighborhood_id: property.neighborhood_id,
    created_by_user_id: user.id,
    guest_name: label,
    valid_from: startsAt.toISOString(),
    valid_to: endsAt.toISOString(),
    is_single_use: false,
    status: "READY",
    qr_token: crypto.randomUUID(),
  });

  if (bookingError) {
    fail(bookingError.message);
  }

  if (guests.length > 0) {
    const { error: guestsError } = await supabase.from("invitations").insert(
      guests.map((guestName) => ({
        property_id: property.id,
        neighborhood_id: property.neighborhood_id,
        created_by_user_id: user.id,
        valid_from: startsAt.toISOString(),
        valid_to: endsAt.toISOString(),
        is_single_use: false,
        status: "DRAFT" as const,
        qr_token: null,
        guest_name: guestName,
      })),
    );

    if (guestsError) {
      fail(guestsError.message);
    }
  }

  redirect("/reservas?created=1");
}

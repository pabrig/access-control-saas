"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/lotes?error=${encodeURIComponent(message)}`);
}

export async function createProperty(formData: FormData) {
  const neighborhoodId = String(formData.get("neighborhood_id") ?? "");
  const lotNumber = String(formData.get("lot_number") ?? "").trim();
  const streetName = String(formData.get("street_name") ?? "").trim() || null;

  if (!neighborhoodId || !lotNumber) {
    fail("Elegí el barrio y el número de lote.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("properties").insert({
    neighborhood_id: neighborhoodId,
    lot_number: lotNumber,
    street_name: streetName,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/lotes?created=1");
}

export async function updateProperty(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const lotNumber = String(formData.get("lot_number") ?? "").trim();
  const streetName = String(formData.get("street_name") ?? "").trim() || null;

  if (!id || !lotNumber) {
    fail("El lote necesita un número.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("properties")
    .update({ lot_number: lotNumber, street_name: streetName })
    .eq("id", id);

  if (error) {
    fail(error.message);
  }

  redirect("/lotes");
}

export async function createNeighborhood(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const complexId = String(formData.get("complex_id") ?? "") || null;

  if (!name) {
    fail("El barrio necesita un nombre.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("neighborhoods").insert({
    name,
    complex_id: complexId,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/lotes?barrio=1");
}

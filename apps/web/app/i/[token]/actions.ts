"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { parseVehiclesFromForm } from "@/lib/vehicles-form";

function fail(token: string, message: string): never {
  redirect(`/i/${token}?error=${encodeURIComponent(message)}`);
}

export async function claimInvite(formData: FormData) {
  const token = String(formData.get("share_token") ?? "");
  const guestName = String(formData.get("guest_name") ?? "").trim();
  const guestDni = String(formData.get("guest_dni") ?? "").trim() || null;
  const vehicles = parseVehiclesFromForm(formData);

  if (!token) {
    redirect("/");
  }

  if (!guestName) {
    fail(token, "Poné tu nombre.");
  }

  if (typeof vehicles === "string") {
    fail(token, vehicles);
  }

  const supabase = await createClient();
  const { error } = await supabase.rpc("claim_invite", {
    p_share: token,
    p_guest_name: guestName,
    p_guest_dni: guestDni,
    p_vehicles: vehicles.map((vehicle) => ({
      plate_normalized: vehicle.plateNormalized,
      plate_display: vehicle.plateDisplay,
      plate_format: vehicle.plateFormat,
      color: vehicle.color,
      passengers: vehicle.passengers.map((passenger) => ({
        full_name: passenger.fullName,
        dni: passenger.dni,
        is_driver: passenger.isDriver,
      })),
    })),
  });

  if (error) {
    if (/ya tiene/i.test(error.message)) {
      redirect(`/i/${token}`);
    }
    fail(token, error.message.replace(/\bun pase\b/gi, "un QR"));
  }

  redirect(`/i/${token}`);
}

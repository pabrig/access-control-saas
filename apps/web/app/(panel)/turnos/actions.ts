"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(message: string): never {
  redirect(`/turnos?error=${encodeURIComponent(message)}`);
}

export async function startShift(formData: FormData) {
  const userId = String(formData.get("user_id") ?? "");
  const gateId = String(formData.get("gate_id") ?? "");

  if (!userId || !gateId) {
    fail("Elegí guardia y barrera.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("shifts").insert({
    user_id: userId,
    gate_id: gateId,
  });

  if (error) {
    fail(error.message);
  }

  redirect("/turnos?created=1");
}

export async function endShift(formData: FormData) {
  const id = String(formData.get("id") ?? "");

  if (!id) {
    fail("Turno inválido.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("shifts")
    .update({ ended_at: new Date().toISOString() })
    .eq("id", id);

  if (error) {
    fail(error.message);
  }

  redirect("/turnos");
}

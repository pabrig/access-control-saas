"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function fail(token: string, message: string): never {
  redirect(`/r/${token}?error=${encodeURIComponent(message)}`);
}

export async function claimResidentInvite(formData: FormData) {
  const token = String(formData.get("share_token") ?? "");
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const firstName = String(formData.get("first_name") ?? "").trim();
  const lastName = String(formData.get("last_name") ?? "").trim();
  const dni = String(formData.get("dni") ?? "").trim();

  if (!token) {
    redirect("/");
  }

  if (!firstName || !lastName || !dni || !email) {
    fail(token, "Completá nombre, DNI y email.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("claim_resident_invite", {
    p_share: token,
    p_email: email,
    p_password: password,
    p_first_name: firstName,
    p_last_name: lastName,
    p_dni: dni,
  });

  if (error) {
    fail(token, error.message);
  }

  const row = data?.[0];
  if (row?.user_id && password.length >= 8) {
    await supabase.auth.signInWithPassword({ email, password });
  }

  redirect("/credencial?joined=1");
}

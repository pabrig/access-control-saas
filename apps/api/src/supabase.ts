import { createClient } from "@supabase/supabase-js";
import type { Database } from "@repo/db";
import { env } from "./env.js";

export function createUserClient(accessToken: string) {
  return createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    global: {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export const serviceClient = createClient<Database>(
  env.supabaseUrl,
  env.supabaseServiceRoleKey,
  {
    auth: { persistSession: false, autoRefreshToken: false },
  },
);

import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { ScanConsole } from "./scan-console";
import styles from "./scan.module.css";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: roles } = await supabase.from("user_roles").select("role");
  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:4000";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Control de acceso</p>
          <h1>Escáner de barrera</h1>
          <p className={styles.meta}>
            {user?.email} ·{" "}
            {(roles ?? []).map((role) => role.role).join(", ") || "sin rol"}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit">Salir</button>
        </form>
      </header>
      <ScanConsole apiUrl={apiUrl} />
    </main>
  );
}

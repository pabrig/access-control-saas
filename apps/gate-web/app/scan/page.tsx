import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { ScanConsole } from "./scan-console";
import styles from "./scan.module.css";

export default async function ScanPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Control de acceso</p>
          <h1>Control de barrera</h1>
          <p className={styles.meta}>{user?.email}</p>
        </div>
        <form action={signOut}>
          <button type="submit">Salir</button>
        </form>
      </header>
      <ScanConsole apiUrl={apiUrl} />
    </main>
  );
}

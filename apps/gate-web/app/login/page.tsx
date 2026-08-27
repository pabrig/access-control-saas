import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signIn } from "./actions";
import styles from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/scan");
  }

  const { error } = await searchParams;

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <p className={styles.kicker}>Barrera</p>
        <h1>Turno de seguridad</h1>
        <p className={styles.lead}>
          Entrá con la cuenta del guardia. El escáner usa el JWT y el turno
          activo; la API valida el QR.
        </p>
        {error ? <p className={styles.error}>{error}</p> : null}
        <form action={signIn} className={styles.form}>
          <label>
            Email
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              defaultValue="security@example.com"
            />
          </label>
          <label>
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              defaultValue="password123"
            />
          </label>
          <button type="submit">Iniciar turno</button>
        </form>
        <p className={styles.hint}>Seed: security@example.com / password123</p>
      </section>
    </main>
  );
}

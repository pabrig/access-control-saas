import { redirect } from "next/navigation";
import { NexoLogo } from "@/components/brand/nexo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
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
      <div className={styles.top}>
        <p className={styles.wordmark}>
          <NexoLogo />
        </p>
        <ThemeToggle />
      </div>
      <section className={styles.card}>
        <p className={styles.brand}>Puerta</p>
        <h1>Entrá a tu turno</h1>
        <p className={styles.lead}>
          Con tu cuenta validás quién entra por esta puerta.
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
            Contraseña
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              defaultValue="password123"
            />
          </label>
          <button type="submit">Entrar</button>
        </form>
        <details className={styles.hint}>
          <summary>Cuenta de prueba</summary>
          <p>security@example.com</p>
          <p>Contraseña: password123</p>
        </details>
      </section>
    </main>
  );
}

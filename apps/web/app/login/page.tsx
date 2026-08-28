import { redirect } from "next/navigation";
import { NexoLogo } from "@/components/brand/nexo-logo";
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
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile || profile.is_active !== false) {
      redirect("/");
    }

    await supabase.auth.signOut();
  }

  const { error } = await searchParams;

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <p className={styles.brand}>
          <NexoLogo />
        </p>
        <h1>Entrá a tu comunidad</h1>
        <p className={styles.lead}>
          Con tu email ves solo lo de tu lote, tu barrio o el complejo, según
          quién seas.
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
              defaultValue="owner@example.com"
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
          <summary>Cuentas de prueba</summary>
          <p>
            owner@example.com · complex.admin@example.com ·
            neighborhood.admin@example.com · superadmin@example.com ·
            security@example.com
          </p>
          <p>Contraseña: password123</p>
        </details>
      </section>
    </main>
  );
}

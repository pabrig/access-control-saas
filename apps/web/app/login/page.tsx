import { signIn } from "./actions";
import styles from "./login.module.css";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className={styles.main}>
      <section className={styles.card}>
        <p className={styles.kicker}>Access Control</p>
        <h1>Entrar al panel</h1>
        <p className={styles.lead}>
          Usá tu cuenta de Supabase Auth. El listado de invitaciones se filtra
          solo con RLS, según tu rol.
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
            Password
            <input
              type="password"
              name="password"
              required
              autoComplete="current-password"
              defaultValue="password123"
            />
          </label>
          <button type="submit">Iniciar sesión</button>
        </form>
        <p className={styles.hint}>
          Seed local: owner@example.com, owner2@example.com,
          complex.admin@example.com, superadmin@example.com — password123
        </p>
      </section>
    </main>
  );
}

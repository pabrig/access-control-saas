"use client";

import { useFormStatus } from "react-dom";
import { signIn } from "./actions";
import styles from "./login.module.css";

function EntrarButton() {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </button>
  );
}

export function LoginForm({ defaultEmail }: { defaultEmail?: string }) {
  return (
    <form action={signIn} className={styles.form}>
      <label>
        Email
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          defaultValue={defaultEmail ?? "owner@example.com"}
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
      <EntrarButton />
    </form>
  );
}

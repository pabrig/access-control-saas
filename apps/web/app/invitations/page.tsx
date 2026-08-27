import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import styles from "./invitations.module.css";

const ROLE_COPY: Record<string, string> = {
  OWNER: "Property owner",
};

export default async function InvitationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: roles }, { data: invitations, error }] = await Promise.all([
    supabase
      .from("user_roles")
      .select("role, complex_id, neighborhood_id, property_id"),
    supabase
      .from("invitations")
      .select(
        "id, guest_name, guest_dni, valid_from, valid_to, is_revoked, qr_token, properties(lot_number, street_name)",
      )
      .order("created_at", { ascending: false }),
  ]);

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Invitaciones visibles para tu scope</p>
          <h1>Invitaciones</h1>
          <p className={styles.meta}>
            {user?.email} ·{" "}
            {(roles ?? [])
              .map((role) => ROLE_COPY[role.role] ?? role.role)
              .join(", ") || "sin rol"}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit">Salir</button>
        </form>
      </header>

      {error ? <p className={styles.error}>{error.message}</p> : null}

      <ul className={styles.list}>
        {(invitations ?? []).length === 0 ? (
          <li className={styles.empty}>No hay invitaciones en tu alcance.</li>
        ) : (
          (invitations ?? []).map((invitation) => {
            const property = invitation.properties;

            return (
              <li key={invitation.id} className={styles.item}>
                <div>
                  <strong>{invitation.guest_name}</strong>
                  <p>
                    Lot or house {property?.lot_number ?? "—"}
                    {property?.street_name ? ` · ${property.street_name}` : ""}
                  </p>
                </div>
                <div className={styles.aside}>
                  <span
                    className={
                      invitation.is_revoked ? styles.revoked : styles.active
                    }
                  >
                    {invitation.is_revoked ? "Revocada" : "Activa"}
                  </span>
                  <code>{invitation.qr_token.slice(0, 8)}</code>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}

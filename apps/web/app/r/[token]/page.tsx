import { notFound } from "next/navigation";
import { Banner } from "@/components/ui";
import { lotLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { claimResidentInvite } from "./actions";
import styles from "../../i/invite.module.css";
import ui from "@/components/ui.module.css";

export default async function ResidentInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const flash = await searchParams;

  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      token,
    )
  ) {
    notFound();
  }

  const supabase = await createClient();
  const { data: rows, error } = await supabase.rpc("preview_resident_invite", {
    p_share: token,
  });

  const invite = rows?.[0];

  if (error || !invite) {
    notFound();
  }

  if (
    invite.status !== "PENDING" ||
    new Date(invite.expires_at) <= new Date()
  ) {
    return (
      <main className={styles.page}>
        <p className={styles.kicker}>{invite.neighborhood_name}</p>
        <h1>Invitación no disponible</h1>
        <p className={styles.lead}>
          {lotLabel({
            lot_number: invite.lot_number,
            street_name: invite.street_name,
          })}
        </p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <p className={styles.kicker}>{invite.neighborhood_name}</p>
      <h1>Co-propietario</h1>
      <p className={styles.lead}>
        {invite.inviter_name} te invita al{" "}
        {lotLabel({
          lot_number: invite.lot_number,
          street_name: invite.street_name,
        })}
      </p>

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={styles.claim}>
        <form action={claimResidentInvite} className={ui.form}>
          <input type="hidden" name="share_token" value={token} />
          <label>
            Nombre
            <input
              name="first_name"
              required
              maxLength={80}
              autoComplete="given-name"
            />
          </label>
          <label>
            Apellido
            <input
              name="last_name"
              required
              maxLength={80}
              autoComplete="family-name"
            />
          </label>
          <label>
            DNI
            <input
              name="dni"
              required
              maxLength={32}
              inputMode="numeric"
              defaultValue={invite.invitee_dni ?? ""}
            />
          </label>
          <label>
            Email
            <input
              name="email"
              type="email"
              required
              autoComplete="email"
              defaultValue={invite.invitee_email ?? ""}
            />
          </label>
          <label>
            Contraseña
            <input
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
            />
          </label>
          <button className={ui.button} type="submit">
            Crear cuenta y obtener QR
          </button>
        </form>
      </section>
    </main>
  );
}

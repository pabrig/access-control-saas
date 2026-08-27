import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Banner } from "@/components/ui";
import ui from "@/components/ui.module.css";
import { formatDateTime, lotLabel } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import { VehicleFields } from "@/app/(panel)/pases/vehicle-fields";
import { CredentialPass } from "../credential-pass";
import { claimInvite } from "./actions";
import styles from "../invite.module.css";

export default async function GuestInvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string; listo?: string }>;
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
  const { data: rows, error } = await supabase.rpc("preview_invite", {
    p_share: token,
  });

  const invite = rows?.[0];

  if (error || !invite) {
    notFound();
  }

  const expired = new Date(invite.valid_to) <= new Date();
  const ready = invite.status === "READY" && Boolean(invite.qr_token);
  const qrDataUrl =
    ready && invite.qr_token
      ? await QRCode.toDataURL(invite.qr_token, {
          margin: 1,
          width: 280,
          color: { dark: "#0b1220", light: "#ffffff" },
        })
      : null;

  const neighborhoodName = invite.neighborhood_name || "Barrio";
  const lot = lotLabel({
    lot_number: invite.lot_number,
    street_name: invite.street_name,
  });

  if (invite.is_revoked || expired) {
    return (
      <main className={styles.page}>
        <p className={styles.kicker}>{neighborhoodName}</p>
        <h1>{invite.is_revoked ? "Invitación revocada" : "Pase vencido"}</h1>
        <p className={styles.lead}>{lot}</p>
      </main>
    );
  }

  if (ready && qrDataUrl) {
    return (
      <main className={styles.page}>
        <CredentialPass
          guestName={invite.guest_name ?? "Visita"}
          lotNumber={invite.lot_number}
          neighborhoodName={neighborhoodName}
          qrDataUrl={qrDataUrl}
          streetName={invite.street_name}
          validLabel={`${formatDateTime(invite.valid_from)} → ${formatDateTime(invite.valid_to)}`}
        />
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <p className={styles.kicker}>{neighborhoodName}</p>
      <h1>Completá tus datos</h1>
      <p className={styles.lead}>
        {lot}
        <br />
        {formatDateTime(invite.valid_from)} → {formatDateTime(invite.valid_to)}
      </p>

      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}

      <section className={styles.claim}>
        <form action={claimInvite} className={ui.form}>
          <input type="hidden" name="share_token" value={token} />
          <label>
            Tu nombre
            <input
              name="guest_name"
              required
              maxLength={120}
              autoComplete="name"
            />
          </label>
          <label>
            DNI (opcional)
            <input name="guest_dni" maxLength={32} inputMode="numeric" />
          </label>
          <VehicleFields />
          <button className={ui.button} type="submit">
            Generar mi QR
          </button>
        </form>
      </section>
    </main>
  );
}

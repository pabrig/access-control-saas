import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { Badge, Banner, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { isBookingLabel } from "@/lib/amenities";
import { formatDateTime, formatRange, lotLabel, personName } from "@/lib/format";
import { accessActionLabel, passStatus } from "@/lib/labels";
import {
  inviteShareUrl,
  mailShareHref,
  publicAppUrl,
  whatsappShareHref,
} from "@/lib/invite-url";
import { asOne } from "@/lib/relations";
import { canManageStructure, isAdmin, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "../copy-link-button";
import { PassEditForm } from "../pass-edit-form";
import { deleteInvitation, revokeInvitation } from "../actions";
import styles from "../pases.module.css";

export default async function InvitationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const { id } = await params;
  const flash = await searchParams;
  const origin = await publicAppUrl();
  const session = await requireSession();
  const supabase = await createClient();

  const { data: invitation } = await supabase
    .from("invitations")
    .select(
      "id, guest_name, guest_dni, valid_from, valid_to, is_revoked, is_single_use, qr_token, share_token, status, properties(lot_number, street_name), invitation_vehicles(id, plate_display, color, invitation_passengers(full_name, dni, is_driver))",
    )
    .eq("id", id)
    .maybeSingle();

  if (!invitation || isBookingLabel(invitation.guest_name)) {
    notFound();
  }

  const { data: logs } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, gates(name), profiles!access_logs_security_user_id_fkey(first_name, last_name)",
    )
    .eq("invitation_id", id)
    .order("timestamp", { ascending: true });

  const shareUrl = inviteShareUrl(origin, invitation.share_token);
  const qrDataUrl = invitation.qr_token
    ? await QRCode.toDataURL(invitation.qr_token, { margin: 1, width: 168 })
    : null;
  const status = passStatus(invitation);
  const ready = invitation.status === "READY";
  const name = invitation.guest_name ?? "Sin aceptar";
  const live =
    status === "active" || status === "scheduled" || status === "waiting";
  const editable = status !== "revoked";
  const admin = isAdmin(session);
  const property = asOne<{
    lot_number: string | null;
    street_name: string | null;
  }>(invitation.properties);

  return (
    <>
      <Link className={ui.backLink} href="/pases">
        <Icon name="back" size={18} />
        {admin ? "Pases" : "Invitados"}
      </Link>
      <PageHeader
        kicker={admin ? lotLabel(property ?? {}) : undefined}
        title={name}
        actions={<Badge status={status} />}
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.updated ? <Banner>Guardado.</Banner> : null}

      <section className={styles.summary}>
        <p className={styles.when}>
          <Icon name="clock" size={18} />
          {formatRange(invitation.valid_from, invitation.valid_to)}
        </p>
        {invitation.guest_dni ? (
          <p className={ui.muted}>DNI {invitation.guest_dni}</p>
        ) : null}
        {invitation.is_single_use ? (
          <p className={ui.muted}>Un solo ingreso</p>
        ) : null}

        {qrDataUrl ? (
          <figure className={styles.qr}>
            <Image
              alt={`QR de ${name}`}
              height={168}
              src={qrDataUrl}
              unoptimized
              width={168}
            />
          </figure>
        ) : (
          <p className={styles.waitingQr}>
            El QR aparece cuando acepte el link.
          </p>
        )}

        <div className={styles.share}>
          <a
            className={styles.shareAction}
            href={whatsappShareHref(shareUrl, ready)}
          >
            <Icon name="whatsapp" />
            WhatsApp
          </a>
          <CopyLinkButton url={shareUrl} compact />
          <a
            className={styles.shareAction}
            href={mailShareHref(shareUrl, ready)}
          >
            <Icon name="mail" />
            Mail
          </a>
        </div>
      </section>

      <div className={ui.stack}>
        {(invitation.invitation_vehicles ?? []).length > 0 ? (
          <section className={ui.card}>
            <h2>Autos</h2>
            <ul className={styles.vehicles}>
              {(invitation.invitation_vehicles ?? []).map((vehicle) => (
                <li key={vehicle.id}>
                  <strong>{vehicle.plate_display}</strong>
                  {vehicle.color ? ` · ${vehicle.color}` : ""}
                  <span>
                    {(vehicle.invitation_passengers ?? [])
                      .map((passenger) =>
                        passenger.is_driver
                          ? `${passenger.full_name} (conductor)`
                          : passenger.full_name,
                      )
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {editable ? (
          <section className={ui.card}>
            <h2>Horario</h2>
            <PassEditForm
              id={invitation.id}
              guestName={invitation.guest_name}
              validFrom={invitation.valid_from}
              validTo={invitation.valid_to}
              allowName={status === "waiting" || status === "expired"}
              next={`/pases/${invitation.id}`}
            />
          </section>
        ) : null}

        <details className={ui.card}>
          <summary>
            <Icon name="clock" size={18} />
            Ingresos
            {(logs ?? []).length > 0 ? ` · ${(logs ?? []).length}` : ""}
          </summary>
          {(logs ?? []).length === 0 ? (
            <p className={ui.muted}>
              {ready ? "Todavía no lo escanearon." : "Todavía no aceptó."}
            </p>
          ) : (
            <ol className={styles.timeline}>
              {(logs ?? []).map((log) => {
                const gate = asOne<{ name: string }>(log.gates);
                const guard = asOne<{
                  first_name: string;
                  last_name: string;
                }>(log.profiles);

                return (
                  <li key={log.id}>
                    <strong>{accessActionLabel(log.action_type)}</strong>
                    <span>
                      {formatDateTime(log.timestamp)}
                      {gate?.name ? ` · ${gate.name}` : ""}
                      {guard ? ` · ${personName(guard)}` : ""}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </details>

        {live ? (
          <form action={revokeInvitation} className={styles.cancel}>
            <input type="hidden" name="id" value={invitation.id} />
            <button className={ui.buttonDanger} type="submit">
              Cancelar
            </button>
          </form>
        ) : null}

        {canManageStructure(session) ? (
          <form action={deleteInvitation} className={styles.cancel}>
            <input type="hidden" name="id" value={invitation.id} />
            <button className={ui.buttonDanger} type="submit">
              Eliminar pase
            </button>
          </form>
        ) : null}
      </div>
    </>
  );
}

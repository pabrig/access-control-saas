import Image from "next/image";
import QRCode from "qrcode";
import { Badge, Banner, Empty, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import {
  formatDateTime,
  lotLabel,
  personName,
  toLocalInput,
} from "@/lib/format";
import { accessActionLabel, passStatus } from "@/lib/labels";
import {
  inviteShareUrl,
  mailShareHref,
  publicAppUrl,
  whatsappShareHref,
} from "@/lib/invite-url";
import { asOne } from "@/lib/relations";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "./copy-link-button";
import {
  createDoorInvite,
  createShareInvite,
  revokeInvitation,
} from "./actions";
import styles from "./pases.module.css";

export default async function PasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error: formError, created } = await searchParams;
  const origin = await publicAppUrl();
  const supabase = await createClient();

  const [{ data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("invitations")
        .select(
          "id, guest_name, guest_dni, valid_from, valid_to, is_revoked, is_single_use, qr_token, share_token, status, properties(lot_number, street_name), invitation_vehicles(id, plate_display, plate_format, color, invitation_passengers(full_name, dni, is_driver))",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("id, lot_number, street_name")
        .order("lot_number"),
    ]);

  type MovementLog = {
    id: string;
    action_type: string;
    timestamp: string;
    invitation_id: string | null;
    gates: unknown;
    profiles: unknown;
  };

  const invitationIds = (invitations ?? []).map((invitation) => invitation.id);
  const { data: logs } =
    invitationIds.length > 0
      ? await supabase
          .from("access_logs")
          .select(
            "id, action_type, timestamp, invitation_id, gates(name), profiles!access_logs_security_user_id_fkey(first_name, last_name)",
          )
          .in("invitation_id", invitationIds)
          .order("timestamp", { ascending: true })
      : { data: [] as MovementLog[] };

  const logsByInvitation = new Map<string, MovementLog[]>();
  for (const log of (logs ?? []) as MovementLog[]) {
    if (!log.invitation_id) {
      continue;
    }
    const current = logsByInvitation.get(log.invitation_id) ?? [];
    current.push(log);
    logsByInvitation.set(log.invitation_id, current);
  }

  const withQr = await Promise.all(
    (invitations ?? []).map(async (invitation) => ({
      ...invitation,
      shareUrl: inviteShareUrl(origin, invitation.share_token),
      qrDataUrl: invitation.qr_token
        ? await QRCode.toDataURL(invitation.qr_token, {
            margin: 1,
            width: 168,
          })
        : null,
    })),
  );

  const now = new Date();
  const defaultFrom = toLocalInput(now);
  const defaultTo = toLocalInput(new Date(now.getTime() + 24 * 60 * 60 * 1000));
  const canCreate = (properties ?? []).length > 0;
  const lots = properties ?? [];

  return (
    <>
      <PageHeader
        kicker="Visitas"
        title="Pases"
        description="Invitá con un link. Tu visita completa los datos y el QR aparece en su celular."
      />

      {formError ? <Banner tone="danger">{formError}</Banner> : null}
      {created === "share" ? (
        <Banner>
          Invitación lista. Mandala por WhatsApp o correo. El QR lo va a ver tu
          visita.
        </Banner>
      ) : null}
      {created === "door" ? (
        <Banner>Pase en puerta listo. Mostrá el QR en la barrera.</Banner>
      ) : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {canCreate ? (
        <section className={ui.card}>
          <h2>Invitar</h2>
          <p className={ui.muted}>
            Elegí hasta cuándo puede entrar. No hace falta el nombre ni la
            patente: eso lo carga quien viene.
          </p>
          <form action={createShareInvite} className={ui.form}>
            {lots.length === 1 ? (
              <>
                <input type="hidden" name="property_id" value={lots[0]!.id} />
                <p className={ui.muted}>{lotLabel(lots[0]!)}</p>
              </>
            ) : (
              <label>
                Lote
                <select name="property_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí el lote
                  </option>
                  {lots.map((property) => (
                    <option key={property.id} value={property.id}>
                      {lotLabel(property)}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <div className={ui.formRow}>
              <label>
                Desde
                <input
                  type="datetime-local"
                  name="valid_from"
                  required
                  defaultValue={defaultFrom}
                />
              </label>
              <label>
                Hasta
                <input
                  type="datetime-local"
                  name="valid_to"
                  required
                  defaultValue={defaultTo}
                />
              </label>
            </div>
            <label className={ui.check}>
              <input type="checkbox" name="is_single_use" />
              Un solo uso
            </label>
            <button className={ui.button} type="submit">
              Crear link para compartir
            </button>
          </form>
          <details className={styles.door}>
            <summary>La visita ya está en la puerta</summary>
            <p className={ui.muted}>
              Solo un nombre. El QR queda listo ahora, en este teléfono.
            </p>
            <form action={createDoorInvite} className={ui.form}>
              {lots.length === 1 ? (
                <input type="hidden" name="property_id" value={lots[0]!.id} />
              ) : (
                <label>
                  Lote
                  <select name="property_id" required defaultValue="">
                    <option value="" disabled>
                      Elegí el lote
                    </option>
                    {lots.map((property) => (
                      <option key={property.id} value={property.id}>
                        {lotLabel(property)}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Nombre
                <input name="guest_name" required maxLength={120} />
              </label>
              <div className={ui.formRow}>
                <label>
                  Desde
                  <input
                    type="datetime-local"
                    name="valid_from"
                    required
                    defaultValue={defaultFrom}
                  />
                </label>
                <label>
                  Hasta
                  <input
                    type="datetime-local"
                    name="valid_to"
                    required
                    defaultValue={defaultTo}
                  />
                </label>
              </div>
              <label className={ui.check}>
                <input type="checkbox" name="is_single_use" />
                Un solo uso
              </label>
              <button className={ui.buttonSecondary} type="submit">
                Crear QR ahora
              </button>
            </form>
          </details>
        </section>
      ) : (
        <Empty
          title="No hay un lote para invitar"
          description="Si sos propietario y no ves tu lote, pedile al admin que te lo asigne."
        />
      )}

      {withQr.length === 0 ? (
        <Empty
          title="Todavía no hay pases"
          description="Creá un link y mandáselo a tu visita."
        />
      ) : (
        <ul className={styles.list}>
          {withQr.map((invitation) => {
            const property = asOne<{
              lot_number: string;
              street_name: string | null;
            }>(invitation.properties);
            const movements = logsByInvitation.get(invitation.id) ?? [];
            const status = passStatus(invitation);
            const ready = invitation.status === "READY";

            return (
              <li className={styles.pass} key={invitation.id}>
                <div className={styles.meta}>
                  <div className={styles.passHead}>
                    <h2>{invitation.guest_name ?? "Esperando a la visita"}</h2>
                    <Badge status={status} />
                  </div>
                  <p>
                    {property ? lotLabel(property) : "Lot or house"}
                    {invitation.guest_dni
                      ? ` · DNI ${invitation.guest_dni}`
                      : ""}
                    {invitation.is_single_use ? " · un uso" : ""}
                  </p>
                  <p className={ui.muted}>
                    {formatDateTime(invitation.valid_from)} →{" "}
                    {formatDateTime(invitation.valid_to)}
                  </p>
                  <div className={styles.share}>
                    <a
                      className={ui.button}
                      href={whatsappShareHref(invitation.shareUrl, ready)}
                    >
                      WhatsApp
                    </a>
                    <a
                      className={ui.buttonSecondary}
                      href={mailShareHref(invitation.shareUrl, ready)}
                    >
                      Correo
                    </a>
                    <CopyLinkButton url={invitation.shareUrl} />
                  </div>
                  {(invitation.invitation_vehicles ?? []).length > 0 ? (
                    <section>
                      <h3>Autos</h3>
                      <ul className={styles.vehicles}>
                        {(invitation.invitation_vehicles ?? []).map(
                          (vehicle) => (
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
                          ),
                        )}
                      </ul>
                    </section>
                  ) : null}
                  {status === "active" ||
                  status === "scheduled" ||
                  status === "waiting" ? (
                    <form action={revokeInvitation}>
                      <input type="hidden" name="id" value={invitation.id} />
                      <button className={ui.buttonDanger} type="submit">
                        Revocar pase
                      </button>
                    </form>
                  ) : null}
                  <section>
                    <h3>Qué pasó</h3>
                    {movements.length === 0 ? (
                      <p className={ui.muted}>
                        {ready
                          ? "Todavía no lo escanearon."
                          : "La visita todavía no completó el pase."}
                      </p>
                    ) : (
                      <ol className={styles.timeline}>
                        {movements.map((log) => {
                          const gate = asOne<{ name: string }>(log.gates);
                          const guard = asOne<{
                            first_name: string;
                            last_name: string;
                          }>(log.profiles);

                          return (
                            <li key={log.id}>
                              <strong>
                                {accessActionLabel(log.action_type)}
                              </strong>
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
                  </section>
                </div>
                {invitation.qrDataUrl ? (
                  <figure className={styles.qr}>
                    <Image
                      alt={`QR de ${invitation.guest_name ?? "pase"}`}
                      height={168}
                      src={invitation.qrDataUrl}
                      unoptimized
                      width={168}
                    />
                    <figcaption>Mostrá este código en la barrera</figcaption>
                  </figure>
                ) : (
                  <p className={styles.waitingQr}>
                    El QR se genera en el celular de la visita cuando completa
                    el link.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

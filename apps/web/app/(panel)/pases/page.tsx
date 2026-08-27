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
import { asOne } from "@/lib/relations";
import { createClient } from "@/lib/supabase/server";
import { createInvitation, revokeInvitation } from "./actions";
import styles from "./pases.module.css";

export default async function PasesPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error: formError, created } = await searchParams;
  const supabase = await createClient();

  const [{ data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("invitations")
        .select(
          "id, guest_name, guest_dni, valid_from, valid_to, is_revoked, is_single_use, qr_token, properties(lot_number, street_name)",
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
      qrDataUrl: await QRCode.toDataURL(invitation.qr_token, {
        margin: 1,
        width: 168,
      }),
    })),
  );

  const now = new Date();
  const defaultFrom = toLocalInput(now);
  const defaultTo = toLocalInput(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const canCreate = (properties ?? []).length > 0;
  const lots = properties ?? [];

  return (
    <>
      <PageHeader
        kicker="Visitas"
        title="Pases"
        description="Un pase es el QR que mostrás en la barrera. Podés limitarlo a un horario o a un solo uso."
      />

      {formError ? <Banner tone="danger">{formError}</Banner> : null}
      {created ? (
        <Banner>Pase listo. Mostrá el QR o mandáselo a tu visita.</Banner>
      ) : null}
      {error ? <Banner tone="danger">{error.message}</Banner> : null}

      {canCreate ? (
        <section className={ui.card}>
          <h2>Nuevo pase</h2>
          <form action={createInvitation} className={ui.form}>
            <div className={ui.formRow}>
              <label>
                Nombre de la visita
                <input name="guest_name" required maxLength={120} />
              </label>
              <label>
                DNI (opcional)
                <input name="guest_dni" maxLength={32} />
              </label>
            </div>
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
              Un solo uso (se apaga al entrar al lote)
            </label>
            <button className={ui.button} type="submit">
              Crear QR
            </button>
          </form>
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
          description="Creá el primero con el nombre de tu visita."
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

            return (
              <li className={styles.pass} key={invitation.id}>
                <div className={styles.meta}>
                  <div className={styles.passHead}>
                    <h2>{invitation.guest_name}</h2>
                    <Badge status={status} />
                  </div>
                  <p>
                    {property ? lotLabel(property) : "Lote"}
                    {invitation.guest_dni
                      ? ` · DNI ${invitation.guest_dni}`
                      : ""}
                    {invitation.is_single_use ? " · un uso" : ""}
                  </p>
                  <p className={ui.muted}>
                    {formatDateTime(invitation.valid_from)} →{" "}
                    {formatDateTime(invitation.valid_to)}
                  </p>
                  {status === "active" || status === "scheduled" ? (
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
                      <p className={ui.muted}>Todavía no lo escanearon.</p>
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
                <figure className={styles.qr}>
                  <Image
                    alt={`QR de ${invitation.guest_name}`}
                    height={168}
                    src={invitation.qrDataUrl}
                    unoptimized
                    width={168}
                  />
                  <figcaption>Mostrá este código en la barrera</figcaption>
                </figure>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

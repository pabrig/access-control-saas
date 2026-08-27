import Image from "next/image";
import QRCode from "qrcode";
import { accessActionLabel } from "@/lib/access-labels";
import { createClient } from "@/lib/supabase/server";
import { signOut } from "../login/actions";
import { createInvitation, revokeInvitation } from "./actions";
import styles from "./invitations.module.css";

function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function asProperty(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || !("lot_number" in row)) {
    return null;
  }

  return row as { lot_number: string; street_name: string | null };
}

function asNamed(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as {
    name?: string;
    first_name?: string;
    last_name?: string;
  };
}

export default async function InvitationsPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; created?: string }>;
}) {
  const { error: formError, created } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ data: roles }, { data: invitations, error }, { data: properties }] =
    await Promise.all([
      supabase
        .from("user_roles")
        .select("role, complex_id, neighborhood_id, property_id"),
      supabase
        .from("invitations")
        .select(
          "id, guest_name, guest_dni, valid_from, valid_to, is_revoked, is_single_use, qr_token, properties(lot_number, street_name)",
        )
        .order("created_at", { ascending: false }),
      supabase
        .from("properties")
        .select("id, lot_number, street_name, neighborhood_id")
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
        width: 144,
      }),
    })),
  );

  const now = new Date();
  const defaultFrom = toLocalInput(now);
  const defaultTo = toLocalInput(
    new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
  );
  const canCreate = (properties ?? []).length > 0;

  return (
    <main className={styles.main}>
      <header className={styles.header}>
        <div>
          <p className={styles.kicker}>Invitaciones visibles para tu scope</p>
          <h1>Invitaciones</h1>
          <p className={styles.meta}>
            {user?.email} ·{" "}
            {(roles ?? []).map((role) => role.role).join(", ") || "sin rol"}
          </p>
        </div>
        <form action={signOut}>
          <button type="submit">Salir</button>
        </form>
      </header>

      {formError ? <p className={styles.error}>{formError}</p> : null}
      {created ? (
        <p className={styles.success}>
          Invitación creada. El QR ya está listo para mostrar.
        </p>
      ) : null}
      {error ? <p className={styles.error}>{error.message}</p> : null}

      {canCreate ? (
        <section className={styles.create}>
          <h2>Nueva invitación</h2>
          <form action={createInvitation} className={styles.form}>
            <label>
              Nombre del invitado
              <input name="guest_name" required maxLength={120} />
            </label>
            <label>
              DNI (opcional)
              <input name="guest_dni" maxLength={32} />
            </label>
            {(properties ?? []).length === 1 ? (
              <>
                <input
                  type="hidden"
                  name="property_id"
                  value={properties![0]!.id}
                />
                <p className={styles.meta}>
                  Lote {properties![0]!.lot_number}
                  {properties![0]!.street_name
                    ? ` · ${properties![0]!.street_name}`
                    : ""}
                </p>
              </>
            ) : (
              <label>
                Lote
                <select name="property_id" required defaultValue="">
                  <option value="" disabled>
                    Elegí un lote
                  </option>
                  {(properties ?? []).map((property) => (
                    <option key={property.id} value={property.id}>
                      Lote {property.lot_number}
                      {property.street_name ? ` · ${property.street_name}` : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label>
              Válida desde
              <input
                type="datetime-local"
                name="valid_from"
                required
                defaultValue={defaultFrom}
              />
            </label>
            <label>
              Válida hasta
              <input
                type="datetime-local"
                name="valid_to"
                required
                defaultValue={defaultTo}
              />
            </label>
            <label className={styles.check}>
              <input type="checkbox" name="is_single_use" />
              Un solo uso (se revoca al entrar a la propiedad)
            </label>
            <button type="submit">Crear QR</button>
          </form>
        </section>
      ) : null}

      <ul className={styles.list}>
        {withQr.length === 0 ? (
          <li className={styles.empty}>No hay invitaciones en tu alcance.</li>
        ) : (
          withQr.map((invitation) => {
            const property = asProperty(invitation.properties);
            const movements = logsByInvitation.get(invitation.id) ?? [];

            return (
              <li key={invitation.id} className={styles.item}>
                <div className={styles.itemTop}>
                  <div>
                    <strong>{invitation.guest_name}</strong>
                    <p>
                      Lote {property?.lot_number ?? "—"}
                      {property?.street_name
                        ? ` · ${property.street_name}`
                        : ""}
                      {invitation.guest_dni
                        ? ` · DNI ${invitation.guest_dni}`
                        : ""}
                    </p>
                    <p>
                      {new Date(invitation.valid_from).toLocaleString("es-AR")}{" "}
                      → {new Date(invitation.valid_to).toLocaleString("es-AR")}
                      {invitation.is_single_use ? " · un uso" : ""}
                    </p>
                    <code className={styles.token}>{invitation.qr_token}</code>
                  </div>
                  <div className={styles.aside}>
                    <span
                      className={
                        invitation.is_revoked ? styles.revoked : styles.active
                      }
                    >
                      {invitation.is_revoked ? "Revocada" : "Activa"}
                    </span>
                    <Image
                      src={invitation.qrDataUrl}
                      alt={`QR de ${invitation.guest_name}`}
                      width={144}
                      height={144}
                      unoptimized
                    />
                    {invitation.is_revoked ? null : (
                      <form action={revokeInvitation}>
                        <input type="hidden" name="id" value={invitation.id} />
                        <button type="submit">Revocar</button>
                      </form>
                    )}
                  </div>
                </div>
                <section className={styles.audit}>
                  <h3>Auditoría</h3>
                  {movements.length === 0 ? (
                    <p className={styles.empty}>Sin movimientos registrados.</p>
                  ) : (
                    <ol>
                      {movements.map((log) => {
                        const gate = asNamed(log.gates);
                        const guard = asNamed(log.profiles);
                        const guardName = [guard?.first_name, guard?.last_name]
                          .filter(Boolean)
                          .join(" ");

                        return (
                          <li key={log.id}>
                            <strong>
                              {accessActionLabel(log.action_type)}
                            </strong>
                            <span>
                              {new Date(log.timestamp).toLocaleString("es-AR")}
                              {gate?.name ? ` · ${gate.name}` : ""}
                              {guardName ? ` · ${guardName}` : ""}
                            </span>
                          </li>
                        );
                      })}
                    </ol>
                  )}
                </section>
              </li>
            );
          })
        )}
      </ul>
    </main>
  );
}

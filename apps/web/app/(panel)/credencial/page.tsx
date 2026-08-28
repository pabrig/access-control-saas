import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import QRCode from "qrcode";
import { Banner, PageHeader } from "@/components/ui";
import ui from "@/components/ui.module.css";
import {
  publicAppUrl,
  residentInviteShareUrl,
  residentWhatsappShareHref,
} from "@/lib/invite-url";
import { lotLabel, personName } from "@/lib/format";
import { asOne } from "@/lib/relations";
import { isOwner, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { CopyLinkButton } from "../pases/copy-link-button";
import {
  addResidentVehicle,
  createCoOwnerInvite,
  removeResidentVehicle,
  revokeCoOwnerInvite,
  updateProfileDni,
} from "./actions";
import styles from "./credencial.module.css";

type PropertyRel = {
  lot_number: string;
  street_name: string | null;
  neighborhoods: { name: string } | { name: string }[] | null;
};

type CredentialRow = {
  id: string;
  qr_token: string;
  is_revoked: boolean;
  property_id: string;
  properties: PropertyRel | PropertyRel[] | null;
  resident_vehicles: Array<{
    id: string;
    plate_display: string;
    color: string | null;
  }>;
};

export default async function CredencialPage({
  searchParams,
}: {
  searchParams: Promise<{
    c?: string;
    error?: string;
    updated?: string;
    invite?: string;
  }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();

  if (!isOwner(session)) {
    redirect("/");
  }

  const supabase = await createClient();
  const origin = await publicAppUrl();

  const [{ data: profile }, { data: credentials }, { data: invites }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("dni")
        .eq("id", session.userId)
        .maybeSingle(),
      supabase
        .from("resident_credentials")
        .select(
          "id, qr_token, is_revoked, property_id, properties(lot_number, street_name, neighborhoods(name)), resident_vehicles(id, plate_display, color)",
        )
        .eq("profile_id", session.userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("resident_invites")
        .select(
          "id, property_id, share_token, invitee_dni, invitee_email, status, expires_at, properties(lot_number)",
        )
        .in("status", ["PENDING"])
        .order("created_at", { ascending: false }),
    ]);

  const rows = (credentials ?? []) as CredentialRow[];
  const activeId = flash.c && rows.some((row) => row.id === flash.c)
    ? flash.c
    : rows[0]?.id;
  const active = rows.find((row) => row.id === activeId) ?? rows[0];

  if (!active) {
    return (
      <>
        <PageHeader title="Mi credencial" />
        <Banner tone="warn">
          Todavía no tenés una credencial activa. Pedile al administrador que te
          asigne el lote.
        </Banner>
      </>
    );
  }

  const property = asOne<PropertyRel>(active.properties);
  const neighborhood = asOne<{ name: string }>(property?.neighborhoods);
  const qrDataUrl = active.is_revoked
    ? null
    : await QRCode.toDataURL(active.qr_token, { margin: 1, width: 220 });

  const propertyIds = [...new Set(rows.map((row) => row.property_id))];
  const coOwnersByProperty = new Map<
    string,
    Array<{ id: string; name: string }>
  >();

  for (const propertyId of propertyIds) {
    const { data: owners } = await supabase
      .from("user_roles")
      .select("user_id, profiles(first_name, last_name)")
      .eq("role", "OWNER")
      .eq("property_id", propertyId)
      .neq("user_id", session.userId);

    coOwnersByProperty.set(
      propertyId,
      (owners ?? []).map((row) => {
        const person = asOne<{ first_name: string; last_name: string }>(
          row.profiles,
        );
        return {
          id: row.user_id,
          name: person ? personName(person) : "Residente",
        };
      }),
    );
  }

  const pendingInvites = (invites ?? []).filter(
    (row) => row.property_id === active.property_id,
  );
  const inviteUrl = flash.invite
    ? residentInviteShareUrl(origin, flash.invite)
    : null;

  return (
    <>
      <PageHeader
        kicker={neighborhood?.name ?? "Residente"}
        title="Mi credencial"
        description="QR permanente para la barrera, tus vehículos y co-propietarios del lote."
      />
      {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
      {flash.updated ? <Banner>Guardado.</Banner> : null}
      {inviteUrl ? (
        <Banner>
          Link listo para compartir.{" "}
          <Link href={residentWhatsappShareHref(inviteUrl)}>WhatsApp</Link>
        </Banner>
      ) : null}

      {rows.length > 1 ? (
        <nav className={styles.tabs} aria-label="Lotes">
          {rows.map((row) => {
            const lot = asOne<PropertyRel>(row.properties);
            return (
              <Link
                key={row.id}
                className={row.id === active.id ? styles.tabActive : styles.tab}
                href={`/credencial?c=${row.id}`}
              >
                {lotLabel(lot ?? {})}
              </Link>
            );
          })}
        </nav>
      ) : null}

      <section className={ui.card}>
        <h2>{lotLabel(property ?? {})}</h2>
        {active.is_revoked ? (
          <p className={ui.muted}>Credencial revocada. Contactá administración.</p>
        ) : qrDataUrl ? (
          <figure className={styles.qr}>
            <Image
              alt="QR de residente"
              height={220}
              src={qrDataUrl}
              unoptimized
              width={220}
            />
            <figcaption>Sin vencimiento · mostralo en la barrera</figcaption>
          </figure>
        ) : null}
      </section>

      <section className={ui.card} style={{ marginTop: 24 }}>
        <h2>Tus datos</h2>
        <form action={updateProfileDni} className={ui.form}>
          <label>
            DNI
            <input
              name="dni"
              defaultValue={profile?.dni ?? ""}
              maxLength={32}
              inputMode="numeric"
            />
          </label>
          <button className={ui.button} type="submit">
            Guardar DNI
          </button>
        </form>
      </section>

      <section className={ui.card} style={{ marginTop: 24 }}>
        <h2>Vehículos</h2>
        {active.resident_vehicles.length === 0 ? (
          <p className={ui.muted}>Sin patentes cargadas.</p>
        ) : (
          <ul className={styles.list}>
            {active.resident_vehicles.map((vehicle) => (
              <li key={vehicle.id}>
                <strong>{vehicle.plate_display}</strong>
                {vehicle.color ? ` · ${vehicle.color}` : ""}
                <form action={removeResidentVehicle}>
                  <input type="hidden" name="vehicle_id" value={vehicle.id} />
                  <input type="hidden" name="credential_id" value={active.id} />
                  <button className={ui.buttonSecondary} type="submit">
                    Quitar
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
        <form action={addResidentVehicle} className={ui.form}>
          <input type="hidden" name="credential_id" value={active.id} />
          <label>
            Patente
            <input name="plate" required autoCapitalize="characters" />
          </label>
          <label>
            Color
            <input name="color" maxLength={40} />
          </label>
          <button className={ui.button} type="submit">
            Agregar vehículo
          </button>
        </form>
      </section>

      <section className={ui.card} style={{ marginTop: 24 }}>
        <h2>Co-propietarios</h2>
        {(coOwnersByProperty.get(active.property_id) ?? []).length === 0 ? (
          <p className={ui.muted}>Solo vos en este lote por ahora.</p>
        ) : (
          <ul className={styles.list}>
            {(coOwnersByProperty.get(active.property_id) ?? []).map((owner) => (
              <li key={owner.id}>{owner.name}</li>
            ))}
          </ul>
        )}

        {pendingInvites.length > 0 ? (
          <>
            <h3 className={styles.subhead}>Invitaciones pendientes</h3>
            <ul className={styles.list}>
              {pendingInvites.map((invite) => (
                <li key={invite.id}>
                  {invite.invitee_dni ? `DNI ${invite.invitee_dni}` : "Sin DNI"}
                  {invite.invitee_email ? ` · ${invite.invitee_email}` : ""}
                  <div className={styles.inlineActions}>
                    <CopyLinkButton
                      url={residentInviteShareUrl(origin, invite.share_token)}
                    />
                    <form action={revokeCoOwnerInvite}>
                      <input type="hidden" name="invite_id" value={invite.id} />
                      <input
                        type="hidden"
                        name="property_id"
                        value={active.property_id}
                      />
                      <button className={ui.buttonSecondary} type="submit">
                        Cancelar
                      </button>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        <form action={createCoOwnerInvite} className={ui.form}>
          <input type="hidden" name="property_id" value={active.property_id} />
          <label>
            DNI del co-propietario (opcional)
            <input name="invitee_dni" maxLength={32} inputMode="numeric" />
          </label>
          <label>
            Email (opcional)
            <input name="invitee_email" type="email" autoComplete="email" />
          </label>
          <button className={ui.button} type="submit">
            Invitar co-propietario
          </button>
        </form>
      </section>
    </>
  );
}

import Link from "next/link";
import { DataTable } from "@/components/data-table";
import { Banner, Empty, PageHeader } from "@/components/ui";
import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import { eventSpaceName, isBookingLabel } from "@/lib/amenities";
import {
  formatDateTime,
  formatDayHeading,
  formatTime,
  personName,
} from "@/lib/format";
import {
  accessActionLabel,
  accessActionShort,
  isExitAction,
} from "@/lib/labels";
import { asOne } from "@/lib/relations";
import { isAdmin, isNeighborhoodAdmin, isOwner, requireSession } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; updated?: string }>;
}) {
  const flash = await searchParams;
  const session = await requireSession();
  const feedView =
    (isOwner(session) && !isAdmin(session)) || isNeighborhoodAdmin(session);
  const supabase = await createClient();
  const { data: logs } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, invitation_id, gates(name), invitations(id, guest_name), profiles!access_logs_security_user_id_fkey(first_name, last_name)",
    )
    .order("timestamp", { ascending: false })
    .limit(200);

  if (feedView) {
    const days: Array<{ heading: string; items: NonNullable<typeof logs> }> =
      [];

    for (const log of logs ?? []) {
      const heading = formatDayHeading(log.timestamp);
      const last = days.at(-1);
      if (last?.heading === heading) {
        last.items.push(log);
      } else {
        days.push({ heading, items: [log] });
      }
    }

    return (
      <>
        <PageHeader
          title={isNeighborhoodAdmin(session) ? "Movimientos" : "Historial"}
        />
        {flash.error ? <Banner tone="danger">{flash.error}</Banner> : null}
        {flash.updated ? <Banner>Guardado.</Banner> : null}
        {days.length === 0 ? (
          <p className={ui.quiet}>Cuando escaneen un QR, aparece acá.</p>
        ) : (
          days.map((day) => (
            <section key={day.heading}>
              <h2 className={ui.groupTitle}>{day.heading}</h2>
              <ul className={ui.feed}>
                {day.items.map((log) => {
                  const invitation = asOne<{
                    id: string;
                    guest_name: string | null;
                  }>(log.invitations);
                  const exited = isExitAction(log.action_type);
                  const content = (
                    <>
                      <span
                        className={`${ui.feedIcon} ${exited ? ui.feedOut : ""}`}
                      >
                        <Icon name={exited ? "exit" : "enter"} size={18} />
                      </span>
                      <span className={ui.feedBody}>
                        <strong>
                          {isBookingLabel(invitation?.guest_name)
                            ? eventSpaceName(invitation?.guest_name)
                            : (invitation?.guest_name ?? "Invitado")}
                        </strong>
                        <span className={ui.feedMeta}>
                          {accessActionShort(log.action_type)}
                        </span>
                      </span>
                      <span className={ui.feedTime}>
                        {formatTime(log.timestamp)}
                      </span>
                    </>
                  );

                  return (
                    <li key={log.id}>
                      {invitation?.id ? (
                        <Link
                          className={ui.feedItem}
                          href={`/pases/${invitation.id}`}
                        >
                          {content}
                        </Link>
                      ) : (
                        <div className={ui.feedItem}>{content}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </>
    );
  }

  const rows = (logs ?? []).map((log) => {
    const gate = asOne<{ name: string }>(log.gates);
    const invitation = asOne<{ guest_name: string }>(log.invitations);
    const guard = asOne<{ first_name: string; last_name: string }>(
      log.profiles,
    );

    return {
      id: log.id,
      guest: invitation?.guest_name ?? "Invitado",
      action: accessActionLabel(log.action_type),
      gate: gate?.name ?? "—",
      guard: guard ? personName(guard) : "—",
      when: formatDateTime(log.timestamp),
    };
  });

  return (
    <>
      <PageHeader
        kicker="Historial"
        title="Libro de guardia"
        description="Entradas y salidas según lo que ya se escaneó."
      />

      {rows.length === 0 ? (
        <Empty
          title="Todavía no hay movimientos"
          description="Cuando seguridad escanee una invitación, va a aparecer acá."
        />
      ) : (
        <DataTable
          filename="libro-de-guardia.csv"
          pageSize={15}
          rows={rows}
          searchPlaceholder="Filtrar por invitado, barrera o guardia"
          columns={[
            { key: "when", header: "Cuando" },
            { key: "guest", header: "Invitado" },
            { key: "action", header: "Movimiento" },
            { key: "gate", header: "Barrera" },
            { key: "guard", header: "Guardia" },
          ]}
        />
      )}
    </>
  );
}

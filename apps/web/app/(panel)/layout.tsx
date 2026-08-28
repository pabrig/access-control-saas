import { AppShell } from "@/components/shell";
import {
  isAdmin,
  isNeighborhoodAdmin,
  isOwner,
  primaryRole,
  requireSession,
} from "@/lib/session";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const admin = isAdmin(session);
  const resident = isOwner(session) && !admin;
  const barrio = isNeighborhoodAdmin(session);

  const nav = resident
    ? [
        { href: "/", label: "Inicio" },
        { href: "/pases", label: "Invitados" },
        { href: "/reservas", label: "Eventos" },
        { href: "/movimientos", label: "Historial" },
        { href: "/lotes", label: "Mi lote" },
      ]
    : barrio
      ? [
          { href: "/", label: "Inicio" },
          { href: "/pases", label: "Pases" },
          { href: "/reservas", label: "Reservas" },
          { href: "/movimientos", label: "Movimientos" },
          { href: "/lotes", label: "Lotes" },
          { href: "/personas", label: "Personas" },
        ]
      : [
          { href: "/", label: "Inicio" },
          { href: "/pases", label: "Pases" },
          { href: "/movimientos", label: "Libro de guardia" },
          {
            href: "/lotes",
            label:
              isOwner(session) && !admin
                ? "Mi lote"
                : admin
                  ? "Comunidad"
                  : "Lotes",
          },
          ...(admin
            ? [
                { href: "/personas", label: "Personas" },
                { href: "/barreras", label: "Barreras" },
                { href: "/turnos", label: "Turnos" },
              ]
            : []),
        ];

  return (
    <AppShell
      email={session.email}
      firstName={session.firstName}
      nav={nav}
      role={primaryRole(session)}
      variant={resident ? "resident" : "ops"}
    >
      {children}
    </AppShell>
  );
}

import { AppShell } from "@/components/shell";
import { isAdmin, isOwner, primaryRole, requireSession } from "@/lib/session";

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();
  const admin = isAdmin(session);
  const resident = isOwner(session) && !admin;

  const nav = resident
    ? [
        { href: "/", label: "Inicio" },
        { href: "/pases", label: "Pases" },
        { href: "/reservas", label: "Amenities" },
        { href: "/movimientos", label: "Actividad" },
        { href: "/lotes", label: "Mi lote" },
      ]
    : [
        { href: "/", label: "Inicio" },
        { href: "/pases", label: "Pases" },
        { href: "/movimientos", label: "Libro de guardia" },
        {
          href: "/lotes",
          label: isOwner(session) && !admin ? "Mi lote" : "Lotes",
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

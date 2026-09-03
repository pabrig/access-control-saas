import { AppShell } from "@/components/shell";
import { gateScanUrl } from "@/lib/gate-url";
import {
  isAdmin,
  isNeighborhoodAdmin,
  isOwner,
  isSecurity,
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
  const security = isSecurity(session) && !admin && !barrio;
  const scanUrl = gateScanUrl();

  const nav = security
    ? [
        { href: "/", label: "Inicio" },
        { href: scanUrl, label: "Escanear", external: true },
        { href: "/movimientos", label: "Movimientos" },
      ]
    : resident
      ? [
          { href: "/", label: "Inicio" },
          { href: "/pases", label: "Pases" },
          { href: "/reservas", label: "Reservas" },
          { href: "/movimientos", label: "Movimientos" },
          { href: "/lotes", label: "Lotes" },
          { href: "/personas", label: "Personas" },
          { href: "/barreras", label: "Barreras" },
          { href: "/turnos", label: "Turnos" },
        ]
      : [
          { href: "/", label: "Inicio" },
          { href: "/pases", label: "Pases" },
          { href: "/movimientos", label: "Movimientos" },
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
      variant={security ? "security" : resident ? "resident" : "ops"}
    >
      {children}
    </AppShell>
  );
}

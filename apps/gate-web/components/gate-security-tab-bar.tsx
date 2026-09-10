"use client";

import { SecurityTabBar } from "@repo/ui/security-tab-bar";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { panelUrl } from "@/lib/panel-url";

export function GateSecurityTabBar() {
  const pathname = usePathname();
  const activeId = pathname === "/scan" || pathname.startsWith("/scan/") ? "scan" : null;

  return (
    <SecurityTabBar
      activeId={activeId}
      tabs={[
        {
          id: "home",
          label: "Inicio",
          href: panelUrl("/"),
          external: true,
          icon: <Icon name="home" size={20} />,
        },
        {
          id: "scan",
          label: "Escanear",
          href: "/scan",
          primary: true,
          icon: <Icon name="qr" size={24} />,
        },
        {
          id: "movements",
          label: "Movimientos",
          href: panelUrl("/movimientos"),
          external: true,
          icon: <Icon name="clock" size={20} />,
        },
      ]}
    />
  );
}

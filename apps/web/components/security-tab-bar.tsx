"use client";

import { SecurityTabBar } from "@repo/ui/security-tab-bar";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { gateScanUrl } from "@/lib/gate-url";
import styles from "./security-tab-bar.module.css";

function securityActiveId(pathname: string) {
  if (pathname === "/movimientos" || pathname.startsWith("/movimientos/")) {
    return "movements";
  }

  if (
    pathname === "/" ||
    pathname.startsWith("/complejos") ||
    pathname.startsWith("/barrios")
  ) {
    return "home";
  }

  return null;
}

export function WebSecurityTabBar() {
  const pathname = usePathname();
  const scanUrl = gateScanUrl();

  return (
    <div className={styles.wrap}>
      <SecurityTabBar
        activeId={securityActiveId(pathname)}
        tabs={[
        {
          id: "home",
          label: "Inicio",
          href: "/",
          icon: <Icon name="home" size={20} />,
        },
        {
          id: "scan",
          label: "Escanear",
          href: scanUrl,
          external: scanUrl.startsWith("http"),
          primary: true,
          icon: <Icon name="qr" size={24} />,
        },
        {
          id: "movements",
          label: "Movimientos",
          href: "/movimientos",
          icon: <Icon name="clock" size={20} />,
        },
      ]}
      />
    </div>
  );
}

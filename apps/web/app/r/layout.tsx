import type { ReactNode } from "react";
import type { Metadata } from "next";
import { NexoLogo } from "@/components/brand/nexo-logo";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "../i/invite.module.css";

export const metadata: Metadata = {
  title: "Nexo",
  description: "Sumate como co-propietario",
};

export default function ResidentInviteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <p className={styles.brand}>
          <NexoLogo />
        </p>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}

import type { ReactNode } from "react";
import type { Metadata } from "next";
import { ThemeToggle } from "@/components/theme-toggle";
import styles from "./invite.module.css";

export const metadata: Metadata = {
  title: "Acceso",
  description: "Completá tus datos y mostrá el QR en la puerta",
};

export default function GuestInviteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <p className={styles.brand}>Acceso</p>
        <ThemeToggle />
      </header>
      {children}
    </div>
  );
}

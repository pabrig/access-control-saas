import type { ReactNode } from "react";
import type { Metadata } from "next";
import styles from "./invite.module.css";

export const metadata: Metadata = {
  title: "Tu invitación",
  description: "Completá tus datos y mostrá el QR en la barrera",
};

export default function GuestInviteLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <div className={styles.shell}>{children}</div>;
}

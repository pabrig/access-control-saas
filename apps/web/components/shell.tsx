"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@/lib/session";
import styles from "./shell.module.css";

type NavItem = { href: string; label: string };

export function AppShell({
  firstName,
  email,
  role,
  nav,
  children,
}: {
  firstName: string;
  email: string;
  role: Role | null;
  nav: NavItem[];
  children: ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className={styles.frame}>
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark} aria-hidden>
            A
          </span>
          Acceso
        </Link>
        <nav className={styles.nav} aria-label="Principal">
          {nav.map((item) => {
            const active =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                className={active ? styles.navActive : styles.navLink}
                href={item.href}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className={styles.user}>
          <p>
            <strong>{firstName}</strong>
            <span>{roleLabel(role)}</span>
            <span>{email}</span>
          </p>
          <form action={signOut}>
            <button type="submit">Salir</button>
          </form>
        </div>
      </aside>
      <div className={styles.body}>
        <header className={styles.top}>
          <Link className={styles.brandMobile} href="/">
            Acceso
          </Link>
          <form action={signOut}>
            <button className={styles.logout} type="submit">
              Salir
            </button>
          </form>
          <nav className={styles.mobileNav} aria-label="Secciones">
            {nav.map((item) => (
              <Link
                key={item.href}
                className={
                  (
                    item.href === "/"
                      ? pathname === "/"
                      : pathname.startsWith(item.href)
                  )
                    ? styles.chipActive
                    : styles.chip
                }
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </header>
        <main className={styles.main}>{children}</main>
      </div>
    </div>
  );
}

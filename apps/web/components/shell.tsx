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
  variant = "ops",
  children,
}: {
  firstName: string;
  email: string;
  role: Role | null;
  nav: NavItem[];
  variant?: "resident" | "ops";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const tabs =
    variant === "resident"
      ? nav.filter((item) => ["/", "/pases", "/reservas"].includes(item.href))
      : nav;

  function isActive(href: string) {
    return href === "/"
      ? pathname === "/"
      : pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className={
        variant === "resident"
          ? `${styles.frame} ${styles.resident}`
          : styles.frame
      }
    >
      <aside className={styles.sidebar}>
        <Link className={styles.brand} href="/">
          <span className={styles.mark} aria-hidden>
            A
          </span>
          Acceso
        </Link>
        <nav className={styles.nav} aria-label="Principal">
          {nav.map((item) => (
            <Link
              key={item.href}
              className={
                isActive(item.href) ? styles.navActive : styles.navLink
              }
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
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
          {variant === "ops" ? (
            <nav className={styles.mobileNav} aria-label="Secciones">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  className={
                    isActive(item.href) ? styles.chipActive : styles.chip
                  }
                  href={item.href}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          ) : null}
        </header>
        <main className={styles.main}>{children}</main>
        {variant === "resident" ? (
          <nav className={styles.tabBar} aria-label="Acciones frecuentes">
            {tabs.map((item) => (
              <Link
                key={item.href}
                className={isActive(item.href) ? styles.tabActive : styles.tab}
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        ) : null}
      </div>
    </div>
  );
}

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/app/login/actions";
import { NexoLogo } from "@/components/brand/nexo-logo";
import { WebSecurityTabBar } from "@/components/security-tab-bar";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { roleLabel } from "@/lib/labels";
import type { Role } from "@/lib/session";
import styles from "./shell.module.css";

type NavItem = { href: string; label: string; external?: boolean };

const NAV_ICON = {
  "/": "home",
  "/pases": "users",
  "/reservas": "calendar",
  "/movimientos": "clock",
  "/lotes": "home",
  "/barrios": "home",
  "/personas": "users",
  "/barreras": "car",
  "/turnos": "clock",
  "/credencial": "users",
  scan: "qr",
} as const;

function ShellLink({
  href,
  className,
  children,
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={className} prefetch>
      {children}
      <LinkPending />
    </Link>
  );
}

function LinkPending() {
  const { pending } = useLinkStatus();
  if (!pending) {
    return null;
  }

  return <span className={styles.linkPendingMark} data-pending="true" />;
}

function NavTab({
  item,
  active,
}: {
  item: NavItem;
  active: boolean;
}) {
  const className = active ? styles.tabActive : styles.tab;
  const icon =
    NAV_ICON[item.href as keyof typeof NAV_ICON] ??
    (item.label === "Escanear" ? NAV_ICON.scan : "home");

  if (item.external || item.href.startsWith("http")) {
    return (
      <a className={className} href={item.href} rel="noopener noreferrer">
        <Icon name={icon} />
        {item.label}
      </a>
    );
  }

  return (
    <ShellLink className={className} href={item.href}>
      <Icon name={icon} />
      {item.label}
    </ShellLink>
  );
}

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
  variant?: "resident" | "ops" | "security";
  children: ReactNode;
}) {
  const pathname = usePathname();
  const tabs =
    variant === "resident"
      ? nav.filter((item) =>
          ["/", "/pases", "/reservas", "/movimientos"].includes(item.href),
        )
      : nav;

  function isActive(href: string) {
    if (href.startsWith("http")) {
      return false;
    }

    if (href === "/") {
      return pathname === "/" || pathname.startsWith("/complejos");
    }
    if (href === "/lotes") {
      return (
        pathname === "/lotes" ||
        pathname.startsWith("/lotes/") ||
        pathname === "/barrios" ||
        pathname.startsWith("/barrios/")
      );
    }
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  return (
    <div
      className={
        variant === "resident"
          ? `${styles.frame} ${styles.resident}`
          : variant === "security"
            ? `${styles.frame} ${styles.security}`
            : styles.frame
      }
    >
      <aside className={styles.sidebar}>
        <ShellLink className={styles.brand} href="/">
          <NexoLogo />
        </ShellLink>
        <nav className={styles.nav} aria-label="Principal">
          {nav.map((item) =>
            item.external || item.href.startsWith("http") ? (
              <a
                key={item.href}
                className={styles.navLink}
                href={item.href}
                rel="noopener noreferrer"
              >
                <Icon
                  name={
                    item.label === "Escanear"
                      ? "qr"
                      : (NAV_ICON[item.href as keyof typeof NAV_ICON] ??
                        "home")
                  }
                  size={18}
                />
                {item.label}
              </a>
            ) : (
              <ShellLink
                key={item.href}
                className={
                  isActive(item.href) ? styles.navActive : styles.navLink
                }
                href={item.href}
              >
                <Icon
                  name={NAV_ICON[item.href as keyof typeof NAV_ICON] ?? "home"}
                  size={18}
                />
                {item.label}
              </ShellLink>
            ),
          )}
        </nav>
        <div className={styles.user}>
          <p>
            <strong>{firstName}</strong>
            <span>{roleLabel(role)}</span>
            <span>{email}</span>
          </p>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit">
              <Icon name="logout" size={16} />
              Salir
            </button>
          </form>
        </div>
      </aside>
      <div className={styles.body}>
        <div className={styles.progressTrack} aria-hidden />
        <header className={styles.top}>
          <ShellLink className={styles.brandMobile} href="/">
            <NexoLogo />
          </ShellLink>
          <div className={styles.topActions}>
            <ThemeToggle />
            <form action={signOut}>
              <button
                className={styles.logout}
                type="submit"
                aria-label="Salir"
              >
                <Icon name="logout" size={18} />
              </button>
            </form>
          </div>
          {variant === "ops" ? (
            <nav className={styles.mobileNav} aria-label="Secciones">
              {nav.map((item) => (
                <ShellLink
                  key={item.href}
                  className={
                    isActive(item.href) ? styles.chipActive : styles.chip
                  }
                  href={item.href}
                >
                  {item.label}
                </ShellLink>
              ))}
            </nav>
          ) : null}
        </header>
        <main className={styles.main}>{children}</main>
        {variant === "resident" ? (
          <nav className={styles.tabBar} aria-label="Acciones frecuentes">
            {tabs.map((item) => (
              <NavTab
                key={item.href}
                item={item}
                active={!item.external && isActive(item.href)}
              />
            ))}
          </nav>
        ) : null}
        {variant === "security" ? <WebSecurityTabBar /> : null}
      </div>
    </div>
  );
}

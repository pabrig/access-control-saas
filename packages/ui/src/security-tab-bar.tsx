"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./security-tab-bar.module.css";

export type SecurityTabItem = {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
  external?: boolean;
  primary?: boolean;
};

export function SecurityTabBar({
  tabs,
  activeId,
}: {
  tabs: SecurityTabItem[];
  activeId: string | null;
}) {
  return (
    <nav className={styles.bar} aria-label="Seguridad">
      {tabs.map((tab) => {
        const active = tab.id === activeId;
        const className = tab.primary
          ? active
            ? styles.tabPrimaryActive
            : styles.tabPrimary
          : active
            ? styles.tabActive
            : styles.tab;
        const iconWrap = tab.primary ? styles.primaryIcon : styles.icon;

        const content = (
          <>
            <span className={iconWrap}>{tab.icon}</span>
            {tab.label}
          </>
        );

        if (tab.external || tab.href.startsWith("http")) {
          return (
            <a
              key={tab.id}
              className={className}
              href={tab.href}
              rel="noopener noreferrer"
            >
              {content}
            </a>
          );
        }

        return (
          <Link key={tab.id} className={className} href={tab.href}>
            {content}
          </Link>
        );
      })}
    </nav>
  );
}

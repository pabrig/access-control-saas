import type { ReactNode } from "react";
import Link from "next/link";
import type { PassStatus } from "@/lib/labels";
import { PASS_STATUS_LABEL } from "@/lib/labels";
import styles from "./ui.module.css";

export function PageHeader({
  kicker,
  title,
  description,
  actions,
}: {
  kicker?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <div>
        {kicker ? <p className={styles.kicker}>{kicker}</p> : null}
        <h1 className={styles.title}>{title}</h1>
        {description ? (
          <p className={styles.description}>{description}</p>
        ) : null}
      </div>
      {actions ? <div className={styles.actions}>{actions}</div> : null}
    </header>
  );
}

export function Stat({
  label,
  value,
  href,
}: {
  label: string;
  value: string | number;
  href?: string;
}) {
  const content = (
    <>
      <span className={styles.statLabel}>{label}</span>
      <strong className={styles.statValue}>{value}</strong>
    </>
  );

  if (href) {
    return (
      <Link className={styles.stat} href={href}>
        {content}
      </Link>
    );
  }

  return <div className={styles.stat}>{content}</div>;
}

export function Banner({
  tone = "ok",
  children,
}: {
  tone?: "ok" | "danger" | "warn";
  children: ReactNode;
}) {
  return <p className={`${styles.banner} ${styles[tone]}`}>{children}</p>;
}

export function Empty({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className={styles.empty}>
      <strong>{title}</strong>
      {description ? <p>{description}</p> : null}
    </div>
  );
}

export function Badge({
  status,
  children,
}: {
  status?: PassStatus | "danger" | "muted";
  children?: ReactNode;
}) {
  const className =
    status === "active"
      ? styles.badgeActive
      : status === "waiting" || status === "scheduled"
        ? styles.badgeScheduled
        : status === "expired"
          ? styles.badgeExpired
          : status === "revoked" || status === "danger"
            ? styles.badgeRevoked
            : styles.badgeMuted;

  return (
    <span className={`${styles.badge} ${className}`}>
      {children ??
        (status && status in PASS_STATUS_LABEL
          ? PASS_STATUS_LABEL[status as PassStatus]
          : null)}
    </span>
  );
}

export function Skeleton({
  width,
  height = 16,
  radius,
  className,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  className?: string;
}) {
  return (
    <span
      className={`${styles.skeleton}${className ? ` ${className}` : ""}`}
      style={{
        width: width ?? "100%",
        height,
        borderRadius: radius ?? 10,
      }}
      aria-hidden
    />
  );
}

export function PageSkeleton() {
  return (
    <div className={styles.pageSkeleton} aria-busy="true" aria-live="polite">
      <span className={styles.skeletonLabel}>Cargando…</span>
      <div className={styles.skelHeader}>
        <Skeleton height={12} width="22%" />
        <Skeleton height={30} width="48%" />
        <Skeleton height={14} width="62%" />
      </div>
      <div className={styles.skelStats}>
        <Skeleton height={76} radius={16} />
        <Skeleton height={76} radius={16} />
        <Skeleton height={76} radius={16} />
      </div>
      <div className={styles.skelStack}>
        <Skeleton height={112} radius={16} />
        <Skeleton height={112} radius={16} />
        <Skeleton height={88} radius={16} />
      </div>
    </div>
  );
}

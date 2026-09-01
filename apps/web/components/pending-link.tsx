"use client";

import type { ComponentProps, ReactNode } from "react";
import Link from "next/link";
import { useLinkStatus } from "next/link";

/**
 * Link that dims while the destination RSC is loading.
 * Prefer for primary in-page CTAs (Invitar, Nuevo pase, etc.).
 */
export function PendingLink({
  children,
  className,
  ...props
}: ComponentProps<typeof Link> & { children: ReactNode }) {
  return (
    <Link className={className} prefetch {...props}>
      {children}
      <PendingHint />
    </Link>
  );
}

function PendingHint() {
  const { pending } = useLinkStatus();
  if (!pending) {
    return null;
  }

  return <span data-pending="true" hidden />;
}

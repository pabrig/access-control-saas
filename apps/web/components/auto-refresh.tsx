"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Soft-refresh the current RSC tree on an interval (no hard reload). */
export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = window.setInterval(() => {
      router.refresh();
    }, intervalMs);

    return () => window.clearInterval(id);
  }, [intervalMs, router]);

  return null;
}

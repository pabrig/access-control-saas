"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import styles from "./ops-overview.module.css";

export type ScopeOption = {
  id: string;
  name: string;
  count: number;
};

export function ScopeFilter({
  groups,
  independents = 0,
  param = "grupo",
  reset = [],
}: {
  groups: ScopeOption[];
  independents?: number;
  param?: string;
  reset?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = searchParams.get(param) ?? "all";
  const show = groups.length + (independents > 0 ? 1 : 0) > 1;

  if (!show) {
    return null;
  }

  function apply(next: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "all") {
      params.delete(param);
    } else {
      params.set(param, next);
    }
    for (const key of reset) {
      params.delete(key);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <div
      className={styles.filters}
      role="tablist"
      aria-label="Filtrar por complejo"
    >
      <button
        className={current === "all" ? styles.filterActive : styles.filter}
        type="button"
        role="tab"
        aria-selected={current === "all"}
        onClick={() => apply("all")}
      >
        Todos
      </button>
      {groups.map((group) => (
        <button
          className={current === group.id ? styles.filterActive : styles.filter}
          type="button"
          role="tab"
          aria-selected={current === group.id}
          onClick={() => apply(group.id)}
          key={group.id}
        >
          {group.name}
          <span className={styles.filterCount}>{group.count}</span>
        </button>
      ))}
      {independents > 0 ? (
        <button
          className={
            current === "independent" ? styles.filterActive : styles.filter
          }
          type="button"
          role="tab"
          aria-selected={current === "independent"}
          onClick={() => apply("independent")}
        >
          Independientes
          <span className={styles.filterCount}>{independents}</span>
        </button>
      ) : null}
    </div>
  );
}

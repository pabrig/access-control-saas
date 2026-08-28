"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import type { BarrioNode, ComplexNode } from "./types";
import styles from "./inicio.module.css";

const ALL = "all";
const INDEPENDENT = "independent";

export function StructureDataGrid({
  groups,
  independents,
  showBarrios,
  canCreateLot,
  canManageComplexes = false,
}: {
  groups: ComplexNode[];
  independents: BarrioNode[];
  showBarrios: boolean;
  canCreateLot: boolean;
  canManageComplexes?: boolean;
}) {
  const allBarrios = useMemo(
    () => [...groups.flatMap((group) => group.barrios), ...independents],
    [groups, independents],
  );
  const [filter, setFilter] = useState(ALL);
  const [barrioId, setBarrioId] = useState(allBarrios[0]?.id ?? "");

  const barrios = useMemo(() => {
    if (filter === INDEPENDENT) {
      return independents;
    }
    if (filter !== ALL) {
      return groups.find((group) => group.id === filter)?.barrios ?? [];
    }
    return allBarrios;
  }, [allBarrios, filter, groups, independents]);

  const selectedBarrio = useMemo(
    () => barrios.find((item) => item.id === barrioId) ?? barrios[0],
    [barrioId, barrios],
  );
  const lots = selectedBarrio?.lots ?? [];

  const groupCount = groups.length + (independents.length > 0 ? 1 : 0);
  const showFilters = showBarrios && groupCount > 1;
  const showFlags =
    groups.length > 0 && (groups.length > 1 || independents.length > 0);
  const paneClass = showBarrios ? styles.panes2 : styles.panes1;
  const activeComplexId =
    filter !== ALL && filter !== INDEPENDENT
      ? filter
      : groups.length === 1
        ? groups[0]?.id
        : null;

  function applyFilter(next: string) {
    setFilter(next);
    const nextBarrios =
      next === INDEPENDENT
        ? independents
        : next !== ALL
          ? (groups.find((group) => group.id === next)?.barrios ?? [])
          : allBarrios;
    setBarrioId(nextBarrios[0]?.id ?? "");
  }

  return (
    <section className={styles.structure} aria-label="Estructura">
      <div className={styles.toolbar}>
        <p className={styles.sectionLabel}>Estructura</p>
        {canManageComplexes && activeComplexId ? (
          <Link
            className={styles.paneLink}
            href={`/complejos/${activeComplexId}`}
          >
            Editar complejo
          </Link>
        ) : null}
      </div>
      {showFilters ? (
        <div
          className={styles.filters}
          role="tablist"
          aria-label="Filtrar por complejo"
        >
          <button
            className={filter === ALL ? styles.filterActive : styles.filter}
            type="button"
            role="tab"
            aria-selected={filter === ALL}
            onClick={() => applyFilter(ALL)}
          >
            Todos
          </button>
          {groups.map((group) => (
            <button
              className={
                filter === group.id ? styles.filterActive : styles.filter
              }
              type="button"
              role="tab"
              aria-selected={filter === group.id}
              onClick={() => applyFilter(group.id)}
              key={group.id}
            >
              {group.name}
              <span className={styles.filterCount}>{group.barrioCount}</span>
            </button>
          ))}
          {independents.length > 0 ? (
            <button
              className={
                filter === INDEPENDENT ? styles.filterActive : styles.filter
              }
              type="button"
              role="tab"
              aria-selected={filter === INDEPENDENT}
              onClick={() => applyFilter(INDEPENDENT)}
            >
              Independientes
              <span className={styles.filterCount}>{independents.length}</span>
            </button>
          ) : null}
        </div>
      ) : null}

      <div className={`${styles.panes} ${paneClass}`}>
        {showBarrios ? (
          <article className={styles.pane}>
            <header className={styles.paneHead}>
              <h2>Barrios</h2>
              {selectedBarrio ? (
                <Link
                  className={styles.paneLink}
                  href={`/barrios/${selectedBarrio.id}`}
                >
                  Abrir
                </Link>
              ) : null}
            </header>
            {barrios.length === 0 ? (
              <p className={styles.empty}>
                {filter !== ALL && filter !== INDEPENDENT
                  ? "Este complejo no tiene barrios."
                  : "Todavía no hay barrios."}
              </p>
            ) : (
              <ul className={styles.list}>
                {barrios.map((node) => (
                  <li key={node.id}>
                    <button
                      className={`${styles.row} ${node.id === selectedBarrio?.id ? styles.rowActive : ""}`}
                      type="button"
                      onClick={() => setBarrioId(node.id)}
                    >
                      <span className={styles.name}>
                        <span className={styles.titleRow}>
                          <strong>{node.name}</strong>
                          {showFlags ? (
                            <span
                              className={
                                node.complexName
                                  ? styles.flagComplex
                                  : styles.flagSolo
                              }
                            >
                              {node.complexName ?? "Independiente"}
                            </span>
                          ) : null}
                        </span>
                        <span className={styles.meta}>
                          {node.lotCount}{" "}
                          {node.lotCount === 1 ? "lote" : "lotes"}
                          {node.vacant > 0
                            ? ` · ${node.vacant} sin residente`
                            : ""}
                        </span>
                      </span>
                      <span className={styles.chevron}>
                        <Icon name="chevron" size={16} />
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </article>
        ) : null}

        <article className={styles.pane}>
          <header className={styles.paneHead}>
            <h2>Lotes</h2>
            {canCreateLot && selectedBarrio ? (
              <Link
                className={styles.paneLink}
                href={`/lotes/nuevo?barrio=${selectedBarrio.id}`}
              >
                Nuevo
              </Link>
            ) : null}
          </header>
          {lots.length === 0 ? (
            <p className={styles.empty}>
              {selectedBarrio
                ? "Este barrio no tiene lotes."
                : "Elegí un barrio para ver sus lotes."}
            </p>
          ) : (
            <ul className={styles.list}>
              {lots.map((lot) => (
                <li key={lot.id}>
                  <Link className={styles.lot} href={`/lotes/${lot.id}`}>
                    <span className={styles.name}>
                      <strong>{lot.label}</strong>
                      {lot.meta ? (
                        <span className={styles.meta}>{lot.meta}</span>
                      ) : null}
                    </span>
                    <span className={styles.chevron}>
                      <Icon name="chevron" size={16} />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </article>
      </div>
    </section>
  );
}

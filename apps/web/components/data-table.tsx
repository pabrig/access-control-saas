"use client";

import { useMemo, useState } from "react";
import ui from "./ui.module.css";

export type TableColumn<T> = {
  key: keyof T | string;
  header: string;
  value: (row: T) => string;
};

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  searchPlaceholder = "Filtrar",
  filename = "export.csv",
  pageSize = 12,
}: {
  rows: T[];
  columns: TableColumn<T>[];
  searchPlaceholder?: string;
  filename?: string;
  pageSize?: number;
}) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) {
      return rows;
    }

    return rows.filter((row) =>
      columns.some((column) =>
        column.value(row).toLowerCase().includes(needle),
      ),
    );
  }, [columns, query, rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(
    safePage * pageSize,
    safePage * pageSize + pageSize,
  );

  function exportCsv() {
    const header = columns.map((column) => column.header).join(",");
    const body = filtered
      .map((row) =>
        columns
          .map((column) => `"${column.value(row).replaceAll('"', '""')}"`)
          .join(","),
      )
      .join("\n");
    const blob = new Blob([`${header}\n${body}`], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className={ui.tableCard}>
      <div className={ui.tableToolbar}>
        <input
          aria-label={searchPlaceholder}
          placeholder={searchPlaceholder}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(0);
          }}
        />
        <button
          className={ui.buttonSecondary}
          type="button"
          onClick={exportCsv}
        >
          Exportar CSV
        </button>
      </div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={String(column.key)}>{column.header}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>No hay resultados.</td>
              </tr>
            ) : (
              visible.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={String(column.key)}>{column.value(row)}</td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className={ui.tablePager}>
        <button
          type="button"
          className={ui.buttonSecondary}
          disabled={safePage === 0}
          onClick={() => setPage((current) => Math.max(0, current - 1))}
        >
          Anterior
        </button>
        <span>
          {safePage + 1} / {pages}
        </span>
        <button
          type="button"
          className={ui.buttonSecondary}
          disabled={safePage >= pages - 1}
          onClick={() => setPage((current) => current + 1)}
        >
          Siguiente
        </button>
      </div>
    </div>
  );
}

import Link from "next/link";
import styles from "./inicio.module.css";

function Metric({
  label,
  value,
  hint,
  href,
}: {
  label: string;
  value: number;
  hint: string;
  href?: string;
}) {
  const content = (
    <>
      <span className={styles.kpiLabel}>{label}</span>
      <strong className={styles.kpiValue}>{value}</strong>
      <span className={styles.kpiHint}>{hint}</span>
    </>
  );

  if (href) {
    return (
      <Link className={styles.kpi} href={href}>
        {content}
      </Link>
    );
  }

  return <article className={styles.kpi}>{content}</article>;
}

export function DashboardMetrics({
  complexes,
  neighborhoods,
  lots,
  manageComplexes = false,
}: {
  complexes?: number | null;
  neighborhoods: number;
  lots: number;
  manageComplexes?: boolean;
}) {
  const showComplexes = complexes != null;

  return (
    <section
      className={showComplexes ? styles.kpis : styles.kpis2}
      aria-label="Resumen de estructura"
    >
      {showComplexes ? (
        <Metric
          label="Total de complejos"
          value={complexes}
          hint={manageComplexes ? "Abrir listado" : "Nivel superior"}
          href={manageComplexes ? "/complejos" : undefined}
        />
      ) : null}
      <Metric
        label="Total de barrios"
        value={neighborhoods}
        hint="Abrir comunidad"
        href="/lotes"
      />
      <Metric
        label="Total de lotes"
        value={lots}
        hint="Unidad de padrón"
        href="/lotes"
      />
    </section>
  );
}

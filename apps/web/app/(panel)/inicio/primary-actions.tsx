import Link from "next/link";
import { Icon } from "@/components/icons";
import styles from "./inicio.module.css";

export function PrimaryActions({
  canCreateComplex,
  canCreateBarrio,
  canCreateLot,
}: {
  canCreateComplex: boolean;
  canCreateBarrio: boolean;
  canCreateLot: boolean;
}) {
  return (
    <div className={styles.actions}>
      {canCreateComplex ? (
        <Link className={styles.primary} href="/complejos/nuevo">
          <Icon name="plus" size={16} />
          Nuevo complejo
        </Link>
      ) : null}
      {canCreateBarrio ? (
        <Link className={styles.primary} href="/barrios/nuevo">
          <Icon name="plus" size={16} />
          Nuevo barrio
        </Link>
      ) : null}
      {canCreateLot ? (
        <Link className={styles.primary} href="/lotes/nuevo">
          <Icon name="plus" size={16} />
          Nuevo lote
        </Link>
      ) : null}
      <details className={styles.more}>
        <summary aria-label="Más acciones">
          <Icon name="more" size={18} />
        </summary>
        <div className={styles.moreMenu}>
          <Link className={styles.ghost} href="/pases?nuevo=1">
            Crear pase
          </Link>
        </div>
      </details>
    </div>
  );
}

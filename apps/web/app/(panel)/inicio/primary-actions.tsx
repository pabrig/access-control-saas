import { Icon } from "@/components/icons";
import { PendingLink } from "@/components/pending-link";
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
        <PendingLink className={styles.primary} href="/complejos/nuevo">
          <Icon name="plus" size={16} />
          Nuevo complejo
        </PendingLink>
      ) : null}
      {canCreateBarrio ? (
        <PendingLink className={styles.primary} href="/barrios/nuevo">
          <Icon name="plus" size={16} />
          Nuevo barrio
        </PendingLink>
      ) : null}
      {canCreateLot ? (
        <PendingLink className={styles.primary} href="/lotes/nuevo">
          <Icon name="plus" size={16} />
          Nuevo lote
        </PendingLink>
      ) : null}
      <details className={styles.more}>
        <summary aria-label="Más acciones">
          <Icon name="more" size={18} />
        </summary>
        <div className={styles.moreMenu}>
          <PendingLink className={styles.ghost} href="/pases?nuevo=1">
            Crear pase
          </PendingLink>
        </div>
      </details>
    </div>
  );
}

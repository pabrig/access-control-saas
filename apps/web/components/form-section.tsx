import type { ReactNode } from "react";
import styles from "./ui.module.css";

export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <fieldset className={styles.formSection}>
      <legend className={styles.formSectionTitle}>{title}</legend>
      {description ? (
        <p className={styles.formSectionHint}>{description}</p>
      ) : null}
      <div className={styles.formSectionBody}>{children}</div>
    </fieldset>
  );
}

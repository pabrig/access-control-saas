import { NexoLogo } from "@/components/brand/nexo-logo";
import { Icon } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { signOut } from "../login/actions";
import { ScanConsole } from "./scan-console";
import styles from "./scan.module.css";

export default async function ScanPage() {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "";

  return (
    <div className={styles.shell}>
      <header className={styles.top}>
        <p className={styles.brand}>
          <NexoLogo />
        </p>
        <div className={styles.topActions}>
          <ThemeToggle />
          <form action={signOut}>
            <button type="submit" aria-label="Salir" className={styles.iconBtn}>
              <Icon name="logout" size={18} />
            </button>
          </form>
        </div>
      </header>
      <ScanConsole apiUrl={apiUrl} />
    </div>
  );
}

import Link from "next/link";
import { Badge } from "@/components/ui";
import { Icon } from "@/components/icons";
import { formatRange, initials } from "@/lib/format";
import { passStatus } from "@/lib/labels";
import styles from "./pases.module.css";

export type GuestRowValue = {
  id: string;
  guest_name: string | null;
  valid_from: string;
  valid_to: string;
  is_revoked: boolean;
  is_single_use: boolean;
  status: "DRAFT" | "READY";
};

export function GuestRow({ invitation }: { invitation: GuestRowValue }) {
  const status = passStatus(invitation);
  const name = invitation.guest_name ?? "Sin aceptar";

  return (
    <li>
      <Link className={styles.guest} href={`/pases/${invitation.id}`}>
        <span className={styles.avatar} aria-hidden>
          {initials(invitation.guest_name)}
        </span>
        <span className={styles.guestBody}>
          <span className={styles.guestTop}>
            <strong>{name}</strong>
            <Badge status={status} />
          </span>
          <span className={styles.guestMeta}>
            {formatRange(invitation.valid_from, invitation.valid_to)}
            {invitation.is_single_use ? " · 1 ingreso" : ""}
          </span>
        </span>
        <Icon name="chevron" size={18} />
      </Link>
    </li>
  );
}

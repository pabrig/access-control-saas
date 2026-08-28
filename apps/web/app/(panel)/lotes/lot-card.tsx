import Link from "next/link";
import ui from "@/components/ui.module.css";
import { lotLabel } from "@/lib/format";

export type LotCardValue = {
  id: string;
  lot_number: string;
  street_name: string | null;
  block_name: string | null;
  phone: string | null;
};

export function LotCard({
  property,
  residents,
  neighborhood,
  showVacant,
}: {
  property: LotCardValue;
  residents: string[];
  neighborhood?: string | null;
  showVacant?: boolean;
}) {
  const line = [
    property.block_name ? `Manzana ${property.block_name}` : null,
    neighborhood,
    residents.length > 0
      ? residents.join(", ")
      : showVacant
        ? "Sin residente"
        : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link className={ui.card} href={`/lotes/${property.id}`}>
      <h2>{lotLabel(property)}</h2>
      {line ? <p className={ui.muted}>{line}</p> : null}
      {property.phone ? <p className={ui.muted}>{property.phone}</p> : null}
    </Link>
  );
}

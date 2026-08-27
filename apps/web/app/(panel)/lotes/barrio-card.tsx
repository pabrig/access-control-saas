import Link from "next/link";
import ui from "@/components/ui.module.css";
import { lotCountLabel } from "./residents";

export function BarrioCard({
  id,
  name,
  lotCount,
  vacant,
}: {
  id: string;
  name: string;
  lotCount: number;
  vacant: number;
}) {
  const line = [
    lotCountLabel(lotCount),
    vacant > 0 ? `${vacant} sin residente` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link className={ui.card} href={`/barrios/${id}`}>
      <h2>{name}</h2>
      <p className={ui.muted}>{line}</p>
    </Link>
  );
}

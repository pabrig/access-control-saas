import Link from "next/link";
import ui from "@/components/ui.module.css";
import { lotCountLabel } from "./residents";
import ops from "../ops-overview.module.css";

export function BarrioCard({
  id,
  name,
  lotCount,
  vacant,
  flag,
}: {
  id: string;
  name: string;
  lotCount: number;
  vacant: number;
  flag?: string | null;
}) {
  const line = [
    lotCountLabel(lotCount),
    vacant > 0 ? `${vacant} sin residente` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link className={ui.card} href={`/barrios/${id}`}>
      <div className={ops.cardTop}>
        <h2>{name}</h2>
        {flag !== undefined ? (
          <span className={flag ? ops.flagComplex : ops.flagSolo}>
            {flag ?? "Independiente"}
          </span>
        ) : null}
      </div>
      <p className={ui.muted}>{line}</p>
      <span className={ops.cardAction}>Ver lotes</span>
    </Link>
  );
}

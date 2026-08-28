import type { HTMLAttributes } from "react";
import { NexoIcon } from "./nexo-icon";

export function NexoLogo({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={["nexo-logo", className].filter(Boolean).join(" ")}
      {...props}
    >
      <span
        aria-hidden
        style={{
          width: 32,
          height: 32,
          borderRadius: 10,
          background: "var(--nexo-surface, #171717)",
          color: "var(--nexo-azure, #7dd3fc)",
          border: "1px solid var(--nexo-border, #262626)",
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        <NexoIcon width={20} height={20} />
      </span>
      <span>
        Ne
        <span
          style={{
            color: "var(--nexo-azure, #7dd3fc)",
            filter: "drop-shadow(0 0 12px rgba(125, 211, 252, 0.35))",
          }}
        >
          xo
        </span>
      </span>
      <span
        aria-hidden
        className="nexo-logo-pulse"
        style={{
          width: 8,
          height: 8,
          borderRadius: 999,
          background: "var(--nexo-azure, #7dd3fc)",
          boxShadow: "0 0 12px rgba(125, 211, 252, 0.35)",
          flexShrink: 0,
        }}
      />
    </span>
  );
}

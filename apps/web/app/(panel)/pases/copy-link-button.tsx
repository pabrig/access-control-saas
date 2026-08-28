"use client";

import { Icon } from "@/components/icons";
import ui from "@/components/ui.module.css";
import styles from "./pases.module.css";

export function CopyLinkButton({
  url,
  compact = false,
}: {
  url: string;
  compact?: boolean;
}) {
  return (
    <button
      className={compact ? styles.shareAction : ui.buttonSecondary}
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url);
      }}
    >
      <Icon name="copy" />
      {compact ? "Copiar" : "Copiar link"}
    </button>
  );
}

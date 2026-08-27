"use client";

import ui from "@/components/ui.module.css";

export function CopyLinkButton({ url }: { url: string }) {
  return (
    <button
      className={ui.buttonSecondary}
      type="button"
      onClick={() => {
        void navigator.clipboard.writeText(url);
      }}
    >
      Copiar link
    </button>
  );
}

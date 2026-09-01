"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";
import ui from "@/components/ui.module.css";

type Tone = "primary" | "secondary" | "danger";

const TONE_CLASS: Record<Tone, string> = {
  primary: ui.button!,
  secondary: ui.buttonSecondary!,
  danger: ui.buttonDanger!,
};

export function SubmitButton({
  children,
  pendingLabel = "Guardando…",
  tone = "primary",
  className,
}: {
  children: ReactNode;
  pendingLabel?: string;
  tone?: Tone;
  className?: string;
}) {
  const { pending } = useFormStatus();
  const base = TONE_CLASS[tone];

  return (
    <button
      type="submit"
      className={className ? `${base} ${className}` : base}
      disabled={pending}
      aria-busy={pending}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}

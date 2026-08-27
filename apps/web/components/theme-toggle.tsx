"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/icons";
import styles from "./theme-toggle.module.css";

const STORAGE_KEY = "acceso-theme";

function readTheme(): "light" | "dark" {
  if (typeof window === "undefined") {
    return "light";
  }

  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "dark" || stored === "light") {
    return stored;
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    window.localStorage.setItem(STORAGE_KEY, next);
  }

  return (
    <button
      className={styles.toggle}
      type="button"
      onClick={toggle}
      aria-pressed={theme === "dark"}
      aria-label={theme === "dark" ? "Usar tema claro" : "Usar tema oscuro"}
      suppressHydrationWarning
    >
      <Icon name={theme === "dark" ? "sun" : "moon"} size={18} />
    </button>
  );
}

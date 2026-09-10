/** Panel admin URL for cross-links from the gate PWA (security mobile). */
export function panelUrl(path = "/") {
  const base = process.env.NEXT_PUBLIC_PANEL_URL?.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;

  if (base) {
    return `${base}${normalized}`;
  }

  if (process.env.NODE_ENV === "development") {
    return `http://localhost:3000${normalized}`;
  }

  return normalized;
}

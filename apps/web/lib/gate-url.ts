/** Gate PWA scan URL for security staff on mobile. */
export function gateScanUrl() {
  const base = process.env.NEXT_PUBLIC_GATE_URL?.replace(/\/$/, "");

  if (base) {
    return `${base}/scan`;
  }

  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3002/scan";
  }

  return "/scan";
}

/** Server-side API base URL for Next.js rewrites (gate-web → access API). */
export function getAccessApiUrl() {
  const configured = process.env.ACCESS_API_URL?.replace(/\/$/, "");
  if (configured) {
    return configured;
  }

  if (process.env.VERCEL) {
    throw new Error(
      "ACCESS_API_URL is required when deploying gate-web (e.g. https://nexo-api.onrender.com)",
    );
  }

  return "http://127.0.0.1:4000";
}

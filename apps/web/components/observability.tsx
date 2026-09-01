import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

/** Vercel Web Analytics + Speed Insights (no-op off Vercel). */
export function Observability() {
  return (
    <>
      <Analytics />
      <SpeedInsights />
    </>
  );
}

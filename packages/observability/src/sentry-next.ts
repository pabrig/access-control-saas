/** Shared Sentry init for Next.js server / edge runtimes. No-op without DSN. */
export function createSentryOptions(app: "web" | "gate-web") {
  const dsn =
    process.env.SENTRY_DSN ?? process.env.NEXT_PUBLIC_SENTRY_DSN ?? "";

  if (!dsn) {
    return null;
  }

  return {
    dsn,
    environment:
      process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1,
    initialScope: {
      tags: { app },
    },
  } as const;
}

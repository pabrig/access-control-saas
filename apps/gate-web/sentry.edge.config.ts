import * as Sentry from "@sentry/nextjs";
import { createSentryOptions } from "@repo/observability/sentry-next";

const options = createSentryOptions("gate-web");

if (options) {
  Sentry.init(options);
}

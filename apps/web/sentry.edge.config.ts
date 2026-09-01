import * as Sentry from "@sentry/nextjs";
import { createSentryOptions } from "@repo/observability/sentry-next";

const options = createSentryOptions("web");

if (options) {
  Sentry.init(options);
}

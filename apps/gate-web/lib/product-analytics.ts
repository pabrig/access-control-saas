import { track } from "@vercel/analytics";
import type { ProductEventName } from "@repo/observability/events";

export function trackProduct(
  name: ProductEventName,
  props?: Record<string, string | number | boolean | null | undefined>,
) {
  try {
    if (!props) {
      track(name);
      return;
    }

    const data: Record<string, string | number | boolean> = {};
    for (const [key, value] of Object.entries(props)) {
      if (value != null) {
        data[key] = value;
      }
    }

    track(name, data);
  } catch {
    // Optional: Vercel Analytics not loaded (local dev).
  }
}

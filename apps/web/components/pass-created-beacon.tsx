"use client";

import { useEffect } from "react";
import { PRODUCT_EVENTS } from "@repo/observability/events";
import { trackProduct } from "@/lib/product-analytics";

export function PassCreatedBeacon({ created }: { created?: string }) {
  useEffect(() => {
    if (created) {
      trackProduct(PRODUCT_EVENTS.passCreated);
    }
  }, [created]);

  return null;
}

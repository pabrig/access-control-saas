/** Product analytics event names (Vercel Analytics `track`). No PII in props. */
export const PRODUCT_EVENTS = {
  scanPreview: "scan_preview",
  scanCommit: "scan_commit",
  passCreated: "pass_created",
  loginSuccess: "login_success",
} as const;

export type ProductEventName =
  (typeof PRODUCT_EVENTS)[keyof typeof PRODUCT_EVENTS];

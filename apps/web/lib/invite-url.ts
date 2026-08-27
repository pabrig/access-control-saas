import { headers } from "next/headers";

export async function publicAppUrl() {
  const requestHeaders = await headers();
  const host =
    requestHeaders.get("x-forwarded-host") ??
    requestHeaders.get("host") ??
    "localhost:3000";
  const proto =
    requestHeaders.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return `${proto}://${host}`;
}

export function inviteShareUrl(origin: string, shareToken: string) {
  return `${origin}/i/${shareToken}`;
}

export function whatsappShareHref(url: string, ready: boolean) {
  const text = ready
    ? `Tu QR de acceso: ${url}`
    : `Te invité. Completá tus datos y mostrá el QR en la puerta: ${url}`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailShareHref(url: string, ready: boolean) {
  const subject = ready ? "Tu QR de acceso" : "Invitación";
  const body = ready
    ? `Mostrá este QR en la puerta:\n${url}`
    : `Abrí el link, completá tus datos y mostrá el QR en la puerta:\n${url}`;

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

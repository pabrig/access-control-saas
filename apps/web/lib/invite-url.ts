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
    ? `Tu pase de acceso: ${url}`
    : `Te invité al barrio. Completá tus datos y mostrá el QR en la barrera: ${url}`;

  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function mailShareHref(url: string, ready: boolean) {
  const subject = ready ? "Tu pase de acceso" : "Invitación al barrio";
  const body = ready
    ? `Acá está tu pase. Mostralo en la barrera:\n${url}`
    : `Te invité. Abrí el link, completá tus datos y mostrá el QR en la barrera:\n${url}`;

  return `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

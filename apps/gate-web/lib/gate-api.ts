const ERROR_COPY: Record<string, string> = {
  INVALID_BODY: "Datos inválidos",
  NO_SHIFT: "No hay un turno activo",
  INACTIVE_USER: "Tu usuario está inactivo",
  INVALID_QR: "QR inválido",
  REVOKED: "Cancelada",
  NOT_YET_VALID: "Todavía no vale",
  EXPIRED: "Venció",
  WRONG_GATE: "Este QR no vale en esta puerta",
  INVALID_TRANSITION: "Ese movimiento no corresponde",
  INVALID_PLATE: "La patente no es AAA 000 ni AA000AA",
  UNKNOWN_PLATE: "Esa patente no está en la invitación",
  NOT_READY: "Todavía no tiene QR",
  NOT_OWNER: "No es propietario de ese lote",
  INACTIVE_OWNER: "Propietario inactivo",
  UNAUTHENTICATED: "Sesión expirada",
};

export function gateErrorLabel(code: string, fallback: string) {
  return ERROR_COPY[code] ?? fallback;
}

export async function gateRequest<T>(
  apiUrl: string,
  path: string,
  accessToken: string,
  body: unknown,
): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });

  return (await response.json()) as T;
}

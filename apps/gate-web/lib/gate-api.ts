const ERROR_COPY: Record<string, string> = {
  INVALID_BODY: "Datos inválidos",
  NO_SHIFT: "No hay turno activo en esta barrera",
  INACTIVE_USER: "Tu usuario está inactivo",
  INVALID_QR: "QR inválido o desconocido",
  REVOKED: "Pase revocado",
  NOT_YET_VALID: "Todavía no vale este pase",
  EXPIRED: "Pase vencido",
  WRONG_GATE: "Este QR no vale en esta barrera",
  INVALID_TRANSITION: "Movimiento no válido para el estado actual",
  INVALID_PLATE: "La patente no es AAA 000 ni AA000AA",
  UNKNOWN_PLATE: "Esa patente no está en el pase",
  NOT_READY: "La visita todavía no completó el pase",
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

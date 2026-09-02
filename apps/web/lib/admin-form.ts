export function normalizeDni(value: FormDataEntryValue | null) {
  return String(value ?? "").replace(/\D/g, "");
}

export function requireDni(value: FormDataEntryValue | null) {
  const dni = normalizeDni(value);
  if (dni.length < 7 || dni.length > 12) {
    return null;
  }
  return dni;
}

export function requireLocation(value: FormDataEntryValue | null) {
  const location = String(value ?? "").trim();
  if (location.length < 3) {
    return null;
  }
  return location;
}

export function parseSurfaceM2(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim().replace(",", ".");
  if (!raw) {
    return null;
  }
  const num = Number(raw);
  if (!Number.isFinite(num) || num <= 0 || num > 1_000_000) {
    return null;
  }
  return Math.round(num * 100) / 100;
}

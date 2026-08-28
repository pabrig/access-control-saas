export function asOne<T extends object>(value: unknown): T | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as T;
}

type LogLevel = "info" | "warn" | "error";

export function logStructured(
  level: LogLevel,
  payload: Record<string, unknown>,
) {
  const line = JSON.stringify({
    level,
    ts: new Date().toISOString(),
    ...payload,
  });

  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

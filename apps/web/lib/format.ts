const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}

const dayMonth = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});
const timeOnly = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

export function formatRange(from: string | Date, to: string | Date) {
  const start = new Date(from);
  const end = new Date(to);
  if (start.toDateString() === end.toDateString()) {
    return `${dayMonth.format(start)} · ${timeOnly.format(start)}–${timeOnly.format(end)}`;
  }
  return `${dayMonth.format(start)} ${timeOnly.format(start)} → ${dayMonth.format(end)} ${timeOnly.format(end)}`;
}

export function formatTime(value: string | Date) {
  return timeOnly.format(new Date(value));
}

export function formatDayHeading(value: string | Date, now = new Date()) {
  const day = new Date(value);
  if (day.toDateString() === now.toDateString()) {
    return "Hoy";
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (day.toDateString() === yesterday.toDateString()) {
    return "Ayer";
  }

  return dayMonth.format(day);
}

export function initials(name: string | null | undefined) {
  if (!name?.trim()) {
    return "?";
  }
  const parts = name.trim().split(/\s+/);
  return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
}

export function toLocalInput(date: Date) {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function personName(input: {
  first_name?: string | null;
  last_name?: string | null;
}) {
  return [input.first_name, input.last_name].filter(Boolean).join(" ").trim();
}

export function lotLabel(input: {
  lot_number?: string | null;
  street_name?: string | null;
}) {
  const lot = input.lot_number ? `Lote ${input.lot_number}` : "Lote";
  return input.street_name ? `${lot} · ${input.street_name}` : lot;
}

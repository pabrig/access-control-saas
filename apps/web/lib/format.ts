const APP_TIME_ZONE = "America/Argentina/Buenos_Aires";

const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: APP_TIME_ZONE,
});

export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
}

const dayMonth = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
  timeZone: APP_TIME_ZONE,
});
const timeOnly = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: APP_TIME_ZONE,
});

export function formatRange(from: string | Date, to: string | Date) {
  const start = new Date(from);
  const end = new Date(to);
  if (sameCalendarDay(start, end)) {
    return `${dayMonth.format(start)} · ${timeOnly.format(start)}–${timeOnly.format(end)}`;
  }
  return `${dayMonth.format(start)} ${timeOnly.format(start)} → ${dayMonth.format(end)} ${timeOnly.format(end)}`;
}

export function formatTime(value: string | Date) {
  return timeOnly.format(new Date(value));
}

const dateOnly = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeZone: APP_TIME_ZONE,
});

export function formatDate(value: string | Date) {
  return dateOnly.format(new Date(value));
}

const dayKey = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function calendarDayKey(value: Date) {
  return dayKey.format(value);
}

function sameCalendarDay(a: Date, b: Date) {
  return calendarDayKey(a) === calendarDayKey(b);
}

export function formatDayHeading(value: string | Date, now = new Date()) {
  const day = new Date(value);
  if (sameCalendarDay(day, now)) {
    return "Hoy";
  }

  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (sameCalendarDay(day, yesterday)) {
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
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
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

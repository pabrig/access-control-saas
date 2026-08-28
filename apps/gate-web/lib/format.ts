const dayMonth = new Intl.DateTimeFormat("es-AR", {
  day: "numeric",
  month: "short",
});
const timeOnly = new Intl.DateTimeFormat("es-AR", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

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

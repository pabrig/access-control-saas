const dateTime = new Intl.DateTimeFormat("es-AR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatDateTime(value: string | Date) {
  return dateTime.format(new Date(value));
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
  const lot = input.lot_number
    ? `Lot or house ${input.lot_number}`
    : "Lot or house";
  return input.street_name ? `${lot} · ${input.street_name}` : lot;
}

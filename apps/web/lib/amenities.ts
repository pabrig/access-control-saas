export const AMENITIES = [
  { id: "sum", name: "SUM", hours: 4 },
  { id: "grill-1", name: "Parrilla 1", hours: 3 },
  { id: "grill-2", name: "Parrilla 2", hours: 3 },
] as const;

export type AmenityId = (typeof AMENITIES)[number]["id"];

export function amenityById(id: string) {
  return AMENITIES.find((item) => item.id === id) ?? AMENITIES[0];
}

export function bookingLabel(name: string) {
  return `Reserva · ${name}`;
}

export function isBookingLabel(name: string | null | undefined) {
  return Boolean(
    name && AMENITIES.some((item) => bookingLabel(item.name) === name),
  );
}

export function eventSpaceName(name: string | null | undefined) {
  if (!name) {
    return "Evento";
  }

  return name.replace(/^Reserva · /, "");
}

export function bookingSentence(residentName: string, space: string) {
  const article = space === "SUM" ? "el " : "";
  return `${residentName} reservó ${article}${space}`;
}

export function monthMatrix(year: number, month: number) {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(1 - ((first.getDay() + 6) % 7));
  const days: Date[] = [];
  for (let index = 0; index < 42; index += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + index);
    days.push(day);
  }
  return days;
}

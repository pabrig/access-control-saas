"use client";

import { useMemo, useState } from "react";
import ui from "@/components/ui.module.css";
import { AMENITIES, monthMatrix, type AmenityId } from "@/lib/amenities";
import { toLocalInput } from "@/lib/format";
import { createAmenityBooking } from "./actions";
import styles from "./reservas.module.css";

const SLOTS = ["10:00", "14:00", "18:00"];

export function BookingCalendar({
  propertyId,
  taken,
}: {
  propertyId: string;
  taken: Array<{ amenity: string; from: string; to: string }>;
}) {
  const today = new Date();
  const [amenityId, setAmenityId] = useState<AmenityId>("sum");
  const [cursor, setCursor] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );
  const [day, setDay] = useState(today);
  const [slot, setSlot] = useState("14:00");
  const amenity = AMENITIES.find((item) => item.id === amenityId)!;
  const days = useMemo(
    () => monthMatrix(cursor.getFullYear(), cursor.getMonth()),
    [cursor],
  );

  const startsAt = useMemo(() => {
    const next = new Date(day);
    const [hours, minutes] = slot.split(":").map(Number);
    next.setHours(hours ?? 14, minutes ?? 0, 0, 0);
    return next;
  }, [day, slot]);

  const amenityName = amenity.name;

  return (
    <form action={createAmenityBooking} className={styles.board}>
      <input type="hidden" name="property_id" value={propertyId} />
      <input type="hidden" name="amenity_id" value={amenityId} />
      <input type="hidden" name="starts_at" value={toLocalInput(startsAt)} />

      <div className={styles.amenities} role="list">
        {AMENITIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={
              item.id === amenityId ? styles.amenityActive : styles.amenity
            }
            onClick={() => setAmenityId(item.id)}
          >
            <strong>{item.name}</strong>
            <span>{item.hours} h</span>
          </button>
        ))}
      </div>

      <div className={styles.calendar}>
        <header>
          <button
            type="button"
            className={ui.buttonSecondary}
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1),
              )
            }
          >
            ‹
          </button>
          <strong>
            {cursor.toLocaleDateString("es-AR", {
              month: "long",
              year: "numeric",
            })}
          </strong>
          <button
            type="button"
            className={ui.buttonSecondary}
            onClick={() =>
              setCursor(
                new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1),
              )
            }
          >
            ›
          </button>
        </header>
        <div className={styles.weekdays}>
          {["L", "M", "M", "J", "V", "S", "D"].map((label, index) => (
            <span key={`${label}-${index}`}>{label}</span>
          ))}
        </div>
        <div className={styles.days}>
          {days.map((item) => {
            const sameMonth = item.getMonth() === cursor.getMonth();
            const selected = item.toDateString() === day.toDateString();
            const occupied = taken.some((row) => {
              if (row.amenity !== amenityName) {
                return false;
              }
              const from = new Date(row.from);
              return from.toDateString() === item.toDateString();
            });
            return (
              <button
                key={item.toISOString()}
                type="button"
                disabled={!sameMonth}
                className={
                  selected
                    ? styles.dayActive
                    : occupied
                      ? styles.dayBusy
                      : styles.day
                }
                onClick={() => setDay(item)}
              >
                {item.getDate()}
              </button>
            );
          })}
        </div>
      </div>

      <div className={styles.slots}>
        {SLOTS.map((value) => (
          <button
            key={value}
            type="button"
            className={value === slot ? styles.slotActive : styles.slot}
            onClick={() => setSlot(value)}
          >
            {value}
          </button>
        ))}
      </div>

      <label>
        Invitados (uno por línea)
        <textarea
          name="guests"
          rows={4}
          placeholder={"Ana Pérez\nCarlos Gómez"}
        />
      </label>
      <button className={ui.button} type="submit">
        Reservar {amenity.name} e invitar
      </button>
    </form>
  );
}

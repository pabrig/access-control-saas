"use client";

import ui from "@/components/ui.module.css";
import { toLocalInput } from "@/lib/format";
import { updateInvitation } from "./actions";

export function PassEditForm({
  id,
  guestName,
  validFrom,
  validTo,
  allowName,
  next = "/pases",
}: {
  id: string;
  guestName: string | null;
  validFrom: string;
  validTo: string;
  allowName: boolean;
  next?: string;
}) {
  return (
    <form action={updateInvitation} className={ui.form}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="next" value={next} />
      {allowName ? (
        <label>
          Nombre
          <input
            name="guest_name"
            defaultValue={guestName ?? ""}
            maxLength={120}
          />
        </label>
      ) : null}
      <div className={ui.formRow}>
        <label>
          Desde
          <input
            type="datetime-local"
            name="valid_from"
            required
            defaultValue={toLocalInput(new Date(validFrom))}
          />
        </label>
        <label>
          Hasta
          <input
            type="datetime-local"
            name="valid_to"
            required
            defaultValue={toLocalInput(new Date(validTo))}
          />
        </label>
      </div>
      <button className={ui.buttonSecondary} type="submit">
        Guardar
      </button>
    </form>
  );
}

"use client";

import { useMemo, useState } from "react";
import ui from "@/components/ui.module.css";
import { lotLabel, toLocalInput } from "@/lib/format";
import { createDoorInvite, createShareInvite } from "./actions";
import styles from "./pases.module.css";

type Lot = { id: string; lot_number: string; street_name: string | null };
type PassKind = "visit" | "provider" | "event";

const KINDS: Array<{ id: PassKind; label: string; hint: string }> = [
  { id: "visit", label: "Visita", hint: "Vale 24 horas" },
  { id: "provider", label: "Proveedor", hint: "Hoy, un solo ingreso" },
  { id: "event", label: "Evento", hint: "Elegí fecha y hora" },
];

function windowFor(kind: PassKind) {
  const now = new Date();
  if (kind === "provider") {
    const from = now;
    const to = new Date(now);
    to.setHours(18, 0, 0, 0);
    if (to <= from) {
      to.setDate(to.getDate() + 1);
    }
    return { from, to, singleUse: true };
  }

  if (kind === "event") {
    const from = new Date(now);
    from.setMinutes(0, 0, 0);
    from.setHours(from.getHours() + 1);
    const to = new Date(from.getTime() + 4 * 60 * 60 * 1000);
    return { from, to, singleUse: false };
  }

  return {
    from: now,
    to: new Date(now.getTime() + 24 * 60 * 60 * 1000),
    singleUse: false,
  };
}

export function PassComposer({
  lots,
  kind = "visit",
}: {
  lots: Lot[];
  kind?: PassKind;
}) {
  const [selected, setSelected] = useState<PassKind>(kind);
  const [door, setDoor] = useState(false);
  const preset = useMemo(() => windowFor(selected), [selected]);
  const [from, setFrom] = useState(toLocalInput(preset.from));
  const [to, setTo] = useState(toLocalInput(preset.to));
  const [singleUse, setSingleUse] = useState(preset.singleUse);

  function choose(next: PassKind) {
    const window = windowFor(next);
    setSelected(next);
    setFrom(toLocalInput(window.from));
    setTo(toLocalInput(window.to));
    setSingleUse(window.singleUse);
  }

  const action = door ? createDoorInvite : createShareInvite;

  return (
    <section className={ui.card}>
      <h2>Nuevo pase</h2>
      <p className={ui.muted}>
        Fecha, tipo y listo. El QR lo completa tu visita, salvo que ya esté en
        la puerta.
      </p>
      <div className={styles.kinds} role="tablist" aria-label="Tipo de pase">
        {KINDS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={selected === item.id}
            className={selected === item.id ? styles.kindActive : styles.kind}
            onClick={() => choose(item.id)}
          >
            <strong>{item.label}</strong>
            <span>{item.hint}</span>
          </button>
        ))}
      </div>
      <form action={action} className={ui.form}>
        {lots.length === 1 ? (
          <>
            <input type="hidden" name="property_id" value={lots[0]!.id} />
            <p className={ui.muted}>{lotLabel(lots[0]!)}</p>
          </>
        ) : (
          <label>
            Lote
            <select name="property_id" required defaultValue="">
              <option value="" disabled>
                Elegí el lote
              </option>
              {lots.map((property) => (
                <option key={property.id} value={property.id}>
                  {lotLabel(property)}
                </option>
              ))}
            </select>
          </label>
        )}
        <div className={ui.formRow}>
          <label>
            Desde
            <input
              type="datetime-local"
              name="valid_from"
              required
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
          </label>
          <label>
            Hasta
            <input
              type="datetime-local"
              name="valid_to"
              required
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
          </label>
        </div>
        {door ? (
          <label>
            Nombre de quien entra
            <input name="guest_name" required maxLength={120} />
          </label>
        ) : null}
        <input
          type="hidden"
          name="is_single_use"
          value={singleUse ? "on" : ""}
        />
        <label className={ui.check}>
          <input
            type="checkbox"
            checked={singleUse}
            onChange={(event) => setSingleUse(event.target.checked)}
          />
          Un solo uso
        </label>
        <label className={ui.check}>
          <input
            type="checkbox"
            checked={door}
            onChange={(event) => setDoor(event.target.checked)}
          />
          Ya está en la puerta
        </label>
        <button className={ui.button} type="submit">
          {door ? "Generar QR" : "Crear pase"}
        </button>
      </form>
    </section>
  );
}

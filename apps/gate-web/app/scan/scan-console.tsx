"use client";

import { useEffect, useRef, useState } from "react";
import { accessActionLabel } from "@/lib/access-labels";
import { createClient } from "@/lib/supabase/client";
import styles from "./scan.module.css";

type Gate = { id: string; name: string };

type ValidateResult =
  | {
      ok: true;
      actionType: string;
      invitation: { guestName: string };
    }
  | { ok: false; code: string; message: string };

type Movement = {
  id: string;
  actionType: string;
  timestamp: string;
  gateName: string | null;
  guestName: string | null;
};

function asGate(value: unknown): Gate | null {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object" || !("id" in row) || !("name" in row)) {
    return null;
  }

  return row as Gate;
}

function asNamed(value: unknown) {
  const row = Array.isArray(value) ? value[0] : value;
  if (!row || typeof row !== "object") {
    return null;
  }

  return row as { name?: string; guest_name?: string };
}

async function loadMovements() {
  const supabase = createClient();
  const { data } = await supabase
    .from("access_logs")
    .select("id, action_type, timestamp, gates(name), invitations(guest_name)")
    .order("timestamp", { ascending: false })
    .limit(30);

  return (data ?? []).map((row) => ({
    id: row.id,
    actionType: row.action_type,
    timestamp: row.timestamp,
    gateName: asNamed(row.gates)?.name ?? null,
    guestName: asNamed(row.invitations)?.guest_name ?? null,
  })) satisfies Movement[];
}

export function ScanConsole({ apiUrl }: { apiUrl: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [readyError, setReadyError] = useState<string | null>(null);
  const [result, setResult] = useState<ValidateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [movements, setMovements] = useState<Movement[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadShift() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return;
      }

      const { data, error } = await supabase
        .from("shifts")
        .select("gate_id, gates(id, name)")
        .eq("user_id", user.id)
        .is("ended_at", null)
        .maybeSingle();

      if (cancelled) {
        return;
      }

      if (error || !data) {
        setReadyError("No hay un turno activo en una barrera.");
        return;
      }

      const nextGate = asGate(data.gates);
      if (!nextGate) {
        setReadyError("El turno no tiene una barrera asignada.");
        return;
      }

      setGate(nextGate);
      setMovements(await loadMovements());
      inputRef.current?.focus();
    }

    void loadShift();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!gate || busy) {
      return;
    }

    const qrToken = inputRef.current?.value.trim() ?? "";
    if (!qrToken) {
      return;
    }

    setBusy(true);
    setResult(null);

    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) {
      setResult({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sesión expirada",
      });
      setBusy(false);
      return;
    }

    const response = await fetch(`${apiUrl}/access/validate`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ qrToken, gateId: gate.id }),
    });

    const payload = (await response.json()) as ValidateResult;
    setResult(payload);

    if (payload.ok) {
      setMovements(await loadMovements());
    }

    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.focus();
    }

    setBusy(false);
  }

  return (
    <section className={styles.console}>
      {gate ? (
        <p className={styles.gate}>
          Barrera activa: <strong>{gate.name}</strong>
        </p>
      ) : (
        <p className={styles.gate}>{readyError ?? "Buscando turno…"}</p>
      )}

      <form onSubmit={onSubmit} className={styles.form}>
        <label>
          Escanear QR
          <input
            ref={inputRef}
            name="qrToken"
            inputMode="text"
            autoComplete="off"
            autoFocus
            disabled={!gate || busy}
            placeholder="El lector escribe el UUID y Enter"
          />
        </label>
        <button type="submit" disabled={!gate || busy}>
          Validar
        </button>
      </form>

      {result ? (
        <p className={result.ok ? styles.ok : styles.fail}>
          {result.ok
            ? `${accessActionLabel(result.actionType)} · ${result.invitation.guestName}`
            : `${result.code}: ${result.message}`}
        </p>
      ) : null}

      <section className={styles.audit}>
        <h2>Auditoría del turno</h2>
        {movements.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay movimientos en este alcance.
          </p>
        ) : (
          <ol>
            {movements.map((movement) => (
              <li key={movement.id}>
                <strong>{accessActionLabel(movement.actionType)}</strong>
                <span>
                  {new Date(movement.timestamp).toLocaleString("es-AR")}
                  {movement.gateName ? ` · ${movement.gateName}` : ""}
                  {movement.guestName ? ` · ${movement.guestName}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </section>
    </section>
  );
}

"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { accessActionLabel } from "@/lib/access-labels";
import { gateErrorLabel, gateRequest } from "@/lib/gate-api";
import { createClient } from "@/lib/supabase/client";
import { QrCamera } from "./qr-camera";
import styles from "./scan.module.css";

type Gate = { id: string; name: string };

type InvitationVehicle = {
  plateDisplay: string;
  plateFormat: string;
  color: string | null;
  passengers: Array<{
    fullName: string;
    dni: string | null;
    isDriver: boolean;
  }>;
};

type Identity = {
  qrToken: string;
  guestName: string;
  guestDni: string | null;
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
  actionType: string;
  vehicles: InvitationVehicle[];
  matchedPlate: string | null;
};

type ValidateOk = {
  ok: true;
  actionType: string;
  invitation: {
    guestName: string;
    guestDni: string | null;
    lotNumber: string;
    streetName: string | null;
    neighborhoodName: string;
  };
  vehicles: InvitationVehicle[];
  matchedPlate: string | null;
  committed: boolean;
};

type ValidateFail = { ok: false; code: string; message: string };
type ValidateResult = ValidateOk | ValidateFail;

type LookupMatch = {
  qrToken: string;
  guestName: string;
  guestDni: string | null;
  plateDisplay: string | null;
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
};

type LookupResult = { ok: true; matches: LookupMatch[] } | ValidateFail;

type Movement = {
  id: string;
  actionType: string;
  timestamp: string;
  gateName: string | null;
  guestName: string | null;
};

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function extractQrToken(raw: string) {
  const trimmed = raw.trim();
  if (UUID.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(
    /[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i,
  );
  return match?.[0] ?? null;
}

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

function lotLine(identity: {
  lotNumber: string;
  streetName: string | null;
  neighborhoodName: string;
}) {
  const lot = identity.lotNumber ? `Lote ${identity.lotNumber}` : "Lote";
  const street = identity.streetName ? ` · ${identity.streetName}` : "";
  return `${identity.neighborhoodName} · ${lot}${street}`;
}

function outcomeCopy(actionType: string) {
  if (actionType === "EXITED") {
    return { title: "SALIDA", verb: "Registrar salida" };
  }

  return { title: "ENTRADA", verb: "Aprobar ingreso" };
}

async function loadMovements() {
  const supabase = createClient();
  const { data } = await supabase
    .from("access_logs")
    .select("id, action_type, timestamp, gates(name), invitations(guest_name)")
    .order("timestamp", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => ({
    id: row.id,
    actionType: row.action_type,
    timestamp: row.timestamp,
    gateName: asNamed(row.gates)?.name ?? null,
    guestName: asNamed(row.invitations)?.guest_name ?? null,
  })) satisfies Movement[];
}

export function ScanConsole({ apiUrl }: { apiUrl: string }) {
  const searchRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<HTMLInputElement>(null);
  const lookupTimer = useRef<number | null>(null);
  const [gate, setGate] = useState<Gate | null>(null);
  const [readyError, setReadyError] = useState<string | null>(null);
  const [identity, setIdentity] = useState<Identity | null>(null);
  const [flash, setFlash] = useState<ValidateResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<LookupMatch[]>([]);
  const [cameraOn, setCameraOn] = useState(true);
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
      searchRef.current?.focus();
    }

    void loadShift();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flash) {
      return;
    }

    const timer = window.setTimeout(() => {
      setFlash(null);
      searchRef.current?.focus();
    }, 2800);

    return () => window.clearTimeout(timer);
  }, [flash]);

  const sessionToken = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }, []);

  const previewQr = useCallback(
    async (rawToken: string) => {
      if (!gate || busy) {
        return;
      }

      const qrToken = extractQrToken(rawToken);
      if (!qrToken) {
        setIdentity(null);
        setFlash({
          ok: false,
          code: "INVALID_QR",
          message: "QR inválido o desconocido",
        });
        return;
      }

      setBusy(true);
      setFlash(null);
      setMatches([]);

      const token = await sessionToken();
      if (!token) {
        setFlash({
          ok: false,
          code: "UNAUTHENTICATED",
          message: "Sesión expirada",
        });
        setBusy(false);
        return;
      }

      const payload = await gateRequest<ValidateResult>(
        apiUrl,
        "/access/validate",
        token,
        { qrToken, gateId: gate.id, commit: false },
      );

      if (payload.ok) {
        setIdentity({
          qrToken,
          guestName: payload.invitation.guestName,
          guestDni: payload.invitation.guestDni,
          lotNumber: payload.invitation.lotNumber,
          streetName: payload.invitation.streetName,
          neighborhoodName: payload.invitation.neighborhoodName,
          actionType: payload.actionType,
          vehicles: payload.vehicles,
          matchedPlate: payload.matchedPlate,
        });
      } else {
        setIdentity(null);
        setFlash(payload);
      }

      setBusy(false);
    },
    [apiUrl, busy, gate, sessionToken],
  );

  const lookup = useCallback(
    async (value: string) => {
      if (!gate || value.trim().length < 2) {
        setMatches([]);
        return;
      }

      if (UUID.test(value.trim())) {
        await previewQr(value.trim());
        return;
      }

      const token = await sessionToken();
      if (!token) {
        return;
      }

      const payload = await gateRequest<LookupResult>(
        apiUrl,
        "/access/lookup",
        token,
        { gateId: gate.id, query: value.trim() },
      );

      if (payload.ok) {
        setMatches(payload.matches);
        if (
          payload.matches.length === 1 &&
          payload.matches[0] &&
          value.trim().length >= 4
        ) {
          await previewQr(payload.matches[0].qrToken);
        }
      }
    },
    [apiUrl, gate, previewQr, sessionToken],
  );

  function onSearchChange(value: string) {
    setQuery(value);
    if (lookupTimer.current) {
      window.clearTimeout(lookupTimer.current);
    }
    lookupTimer.current = window.setTimeout(() => {
      void lookup(value);
    }, 180);
  }

  async function approve() {
    if (!gate || !identity || busy) {
      return;
    }

    setBusy(true);
    const token = await sessionToken();
    if (!token) {
      setFlash({
        ok: false,
        code: "UNAUTHENTICATED",
        message: "Sesión expirada",
      });
      setBusy(false);
      return;
    }

    const payload = await gateRequest<ValidateResult>(
      apiUrl,
      "/access/validate",
      token,
      { qrToken: identity.qrToken, gateId: gate.id, commit: true },
    );

    setFlash(payload);
    if (payload.ok) {
      setIdentity(null);
      setQuery("");
      setMatches([]);
      setMovements(await loadMovements());
    }
    setBusy(false);
  }

  const locked = !gate || busy;
  const outcome = identity ? outcomeCopy(identity.actionType) : null;

  return (
    <section className={styles.console}>
      <div className={styles.statusBar} role="status">
        <span className={gate ? styles.live : styles.offline} />
        {gate ? gate.name : (readyError ?? "Buscando turno…")}
      </div>

      {cameraOn && gate ? (
        <QrCamera
          active={!busy && !identity}
          onCode={(code) => void previewQr(code)}
        />
      ) : null}

      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          void lookup(query);
        }}
      >
        <label htmlFor="gate-search">Buscar patente o DNI</label>
        <input
          id="gate-search"
          ref={searchRef}
          value={query}
          onChange={(event) => onSearchChange(event.target.value)}
          inputMode="search"
          autoComplete="off"
          autoCapitalize="characters"
          disabled={locked}
          placeholder="ABC 123 · DNI · nombre"
        />
      </form>

      {matches.length > 1 ? (
        <ul className={styles.suggestions}>
          {matches.map((match) => (
            <li key={match.qrToken}>
              <button
                type="button"
                disabled={busy}
                onClick={() => void previewQr(match.qrToken)}
              >
                <strong>{match.guestName}</strong>
                <span>
                  {match.plateDisplay ? `${match.plateDisplay} · ` : ""}
                  {match.guestDni ? `DNI ${match.guestDni} · ` : ""}
                  Lote {match.lotNumber}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <label className={styles.hiddenScan}>
        Lector USB
        <input
          ref={scannerRef}
          inputMode="none"
          autoComplete="off"
          disabled={locked}
          placeholder="El lector escribe el UUID"
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void previewQr(event.currentTarget.value.trim());
              event.currentTarget.value = "";
            }
          }}
        />
      </label>

      <div className={styles.toolbar}>
        <button
          type="button"
          className={styles.ghost}
          onClick={() => setCameraOn((value) => !value)}
        >
          {cameraOn ? "Ocultar cámara" : "Mostrar cámara"}
        </button>
      </div>

      {identity && outcome ? (
        <article className={styles.identity} aria-live="polite">
          <p className={styles.identityKicker}>Verificar identidad</p>
          <h2>{identity.guestName}</h2>
          <p className={styles.identityMeta}>{lotLine(identity)}</p>
          {identity.guestDni ? (
            <p className={styles.identityMeta}>DNI {identity.guestDni}</p>
          ) : null}
          {identity.matchedPlate ? (
            <p className={styles.identityMeta}>
              Patente leída: {identity.matchedPlate}
            </p>
          ) : null}
          {identity.vehicles.length > 0 ? (
            <ul className={styles.party}>
              {identity.vehicles.map((vehicle) => (
                <li key={vehicle.plateDisplay}>
                  <strong>
                    {vehicle.plateDisplay}
                    {vehicle.color ? ` · ${vehicle.color}` : ""}
                  </strong>
                  <span>
                    {vehicle.passengers
                      .map((passenger) =>
                        passenger.isDriver
                          ? `${passenger.fullName} (conductor)`
                          : passenger.fullName,
                      )
                      .join(" · ")}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
          <button
            className={styles.approve}
            type="button"
            disabled={busy}
            onClick={() => void approve()}
          >
            {outcome.verb}
          </button>
          <button
            className={styles.reject}
            type="button"
            disabled={busy}
            onClick={() => {
              setIdentity(null);
              searchRef.current?.focus();
            }}
          >
            Cancelar
          </button>
        </article>
      ) : (
        <p className={styles.idle}>
          Escaneá el QR o buscá la patente. El ingreso se confirma en un toque.
        </p>
      )}

      <details className={styles.audit}>
        <summary>Libro de guardia</summary>
        {movements.length === 0 ? (
          <p className={styles.empty}>
            Todavía no hay movimientos en este turno.
          </p>
        ) : (
          <ol>
            {movements.map((movement) => (
              <li key={movement.id}>
                <strong>{accessActionLabel(movement.actionType)}</strong>
                <span>
                  {new Date(movement.timestamp).toLocaleString("es-AR")}
                  {movement.guestName ? ` · ${movement.guestName}` : ""}
                </span>
              </li>
            ))}
          </ol>
        )}
      </details>

      {flash ? (
        <button
          type="button"
          className={flash.ok ? styles.flashOk : styles.flashFail}
          onClick={() => setFlash(null)}
        >
          <span>{flash.ok ? "APROBADO" : "RECHAZADO"}</span>
          <strong>
            {flash.ok
              ? `${outcomeCopy(flash.actionType).title} · ${flash.invitation.guestName}`
              : gateErrorLabel(flash.code, flash.message)}
          </strong>
        </button>
      ) : null}
    </section>
  );
}

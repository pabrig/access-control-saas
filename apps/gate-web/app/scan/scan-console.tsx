"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PRODUCT_EVENTS } from "@repo/observability/events";
import { Icon } from "@/components/icons";
import { accessActionShort, isExitAction } from "@/lib/access-labels";
import { formatDayHeading, formatTime } from "@/lib/format";
import { gateErrorLabel, gateRequest } from "@/lib/gate-api";
import { trackProduct } from "@/lib/product-analytics";
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

type Identity =
  | {
      kind: "invitation";
      qrToken: string;
      guestName: string;
      guestDni: string | null;
      lotNumber: string;
      streetName: string | null;
      neighborhoodName: string;
      actionType: string;
      vehicles: InvitationVehicle[];
      matchedPlate: string | null;
    }
  | {
      kind: "owner";
      qrToken: string;
      profileId: string;
      propertyId: string;
      guestName: string;
      guestDni: null;
      lotNumber: string;
      streetName: string | null;
      neighborhoodName: string;
      actionType: string;
      vehicles: InvitationVehicle[];
      matchedPlate: string | null;
    };

type ValidateOk =
  | {
      ok: true;
      kind: "invitation";
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
    }
  | {
      ok: true;
      kind: "owner";
      actionType: string;
      owner: {
        profileId: string;
        propertyId: string;
        firstName: string;
        lastName: string;
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

type LookupMatch =
  | {
      kind: "invitation";
      qrToken: string;
      guestName: string;
      guestDni: string | null;
      plateDisplay: string | null;
      lotNumber: string;
      streetName: string | null;
      neighborhoodName: string;
    }
  | {
      kind: "owner";
      qrToken: string;
      profileId: string;
      propertyId: string;
      ownerName: string;
      email: string | null;
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

function trackScan(
  event: typeof PRODUCT_EVENTS.scanPreview | typeof PRODUCT_EVENTS.scanCommit,
  payload: { ok: boolean; code?: string; ms: number; kind?: string },
) {
  trackProduct(event, {
    ok: payload.ok,
    code: payload.code,
    ms: payload.ms,
    kind: payload.kind,
  });
}

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

function lotLine(identity: { lotNumber: string; streetName: string | null }) {
  const lot = identity.lotNumber ? `Lote ${identity.lotNumber}` : "Lote";
  return identity.streetName ? `${identity.streetName} · ${lot}` : lot;
}

function outcomeCopy(actionType: string) {
  if (actionType === "EXITED") {
    return { title: "Salió", verb: "Salir", out: true };
  }

  return { title: "Entró", verb: "Entrar", out: false };
}

function personName(firstName: string, lastName: string) {
  return `${firstName} ${lastName}`.trim();
}

async function loadMovements() {
  const supabase = createClient();
  const { data } = await supabase
    .from("access_logs")
    .select(
      "id, action_type, timestamp, gates(name), invitations(guest_name), profiles!access_logs_profile_id_fkey(first_name, last_name)",
    )
    .order("timestamp", { ascending: false })
    .limit(20);

  return (data ?? []).map((row) => {
    const resident = asNamed(row.profiles) as {
      first_name?: string;
      last_name?: string;
    } | null;
    const residentName =
      resident?.first_name && resident?.last_name
        ? personName(resident.first_name, resident.last_name)
        : null;

    return {
      id: row.id,
      actionType: row.action_type,
      timestamp: row.timestamp,
      gateName: asNamed(row.gates)?.name ?? null,
      guestName: asNamed(row.invitations)?.guest_name ?? residentName,
    };
  }) satisfies Movement[];
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
        setReadyError("No hay un turno activo.");
        return;
      }

      const nextGate = asGate(data.gates);
      if (!nextGate) {
        setReadyError("El turno no tiene una puerta asignada.");
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
          message: "QR inválido",
        });
        return;
      }

      setBusy(true);
      setFlash(null);
      setMatches([]);

      const started = performance.now();
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

      if (payload.ok && "invitation" in payload) {
        setIdentity({
          kind: "invitation",
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
      } else if (payload.ok && payload.kind === "owner") {
        setIdentity({
          kind: "owner",
          qrToken,
          profileId: payload.owner.profileId,
          propertyId: payload.owner.propertyId,
          guestName: personName(
            payload.owner.firstName,
            payload.owner.lastName,
          ),
          guestDni: null,
          lotNumber: payload.owner.lotNumber,
          streetName: payload.owner.streetName,
          neighborhoodName: payload.owner.neighborhoodName,
          actionType: payload.actionType,
          vehicles: payload.vehicles.map((vehicle) => ({
            plateDisplay: vehicle.plateDisplay,
            plateFormat: vehicle.plateFormat,
            color: vehicle.color,
            passengers: [],
          })),
          matchedPlate: payload.matchedPlate,
        });
      } else {
        setIdentity(null);
        setFlash(payload);
      }

      const ms = Math.round(performance.now() - started);
      trackScan(PRODUCT_EVENTS.scanPreview, {
        ok: payload.ok,
        code: payload.ok
          ? undefined
          : "code" in payload
            ? payload.code
            : undefined,
        ms,
        kind:
          payload.ok && "kind" in payload && typeof payload.kind === "string"
            ? payload.kind
            : undefined,
      });

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
        if (payload.matches.length === 1 && value.trim().length >= 4) {
          const match = payload.matches[0];
          if (match?.kind === "owner") {
            await previewQr(match.qrToken);
          } else if (match?.kind === "invitation") {
            await previewQr(match.qrToken);
          }
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
    const started = performance.now();
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

    const ms = Math.round(performance.now() - started);
    trackScan(PRODUCT_EVENTS.scanCommit, {
      ok: payload.ok,
      code: payload.ok
        ? undefined
        : "code" in payload
          ? payload.code
          : undefined,
      ms,
      kind:
        payload.ok && "kind" in payload && typeof payload.kind === "string"
          ? payload.kind
          : undefined,
    });

    setBusy(false);
  }

  const locked = !gate || busy;
  const outcome = identity ? outcomeCopy(identity.actionType) : null;
  const days = useMemo(() => {
    const groups: Array<{ heading: string; items: Movement[] }> = [];
    for (const movement of movements) {
      const heading = formatDayHeading(movement.timestamp);
      const last = groups.at(-1);
      if (last?.heading === heading) {
        last.items.push(movement);
      } else {
        groups.push({ heading, items: [movement] });
      }
    }
    return groups;
  }, [movements]);

  return (
    <section className={styles.console}>
      <p className={styles.kicker}>
        {identity?.neighborhoodName ?? gate?.name ?? "Puerta"}
      </p>
      <h1>{identity?.guestName ?? "En la puerta"}</h1>
      <p className={styles.lead}>
        {identity ? lotLine(identity) : "Escaneá el QR o buscá quién entra."}
      </p>
      <p className={styles.status} role="status">
        <span className={gate ? styles.live : styles.offline} />
        {gate ? "Turno activo" : (readyError ?? "Buscando turno…")}
      </p>

      {identity && outcome ? (
        <article className={styles.identity} aria-live="polite">
          {identity.kind === "owner" ? (
            <p className={styles.identityMeta}>Propietario</p>
          ) : null}
          {identity.guestDni ? (
            <p className={styles.identityMeta}>DNI {identity.guestDni}</p>
          ) : null}
          {identity.matchedPlate ? (
            <p className={styles.identityMeta}>
              Patente {identity.matchedPlate}
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
            className={
              outcome.out ? `${styles.approve} ${styles.out}` : styles.approve
            }
            type="button"
            disabled={busy}
            onClick={() => void approve()}
          >
            <Icon name={outcome.out ? "exit" : "enter"} size={18} />
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
        <>
          {cameraOn && gate ? (
            <QrCamera active={!busy} onCode={(code) => void previewQr(code)} />
          ) : null}

          <form
            className={styles.search}
            onSubmit={(event) => {
              event.preventDefault();
              void lookup(query);
            }}
          >
            <label htmlFor="gate-search">Patente, DNI, nombre o lote</label>
            <input
              id="gate-search"
              ref={searchRef}
              value={query}
              onChange={(event) => onSearchChange(event.target.value)}
              inputMode="search"
              autoComplete="off"
              autoCapitalize="characters"
              disabled={locked}
              placeholder="ABC 123"
            />
          </form>

          {matches.length > 1 ? (
            <ul className={styles.suggestions}>
              {matches.map((match) => (
                <li
                  key={
                    match.kind === "owner"
                      ? `${match.profileId}:${match.propertyId}`
                      : match.qrToken
                  }
                >
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void previewQr(match.qrToken)}
                  >
                    <strong>
                      {match.kind === "owner"
                        ? match.ownerName
                        : match.guestName}
                    </strong>
                    <span>
                      {match.kind === "owner" ? "Propietario · " : ""}
                      {match.kind === "invitation" && match.plateDisplay
                        ? `${match.plateDisplay} · `
                        : ""}
                      {match.kind === "invitation" && match.guestDni
                        ? `DNI ${match.guestDni} · `
                        : ""}
                      {match.kind === "owner" && match.email
                        ? `${match.email} · `
                        : ""}
                      Lote {match.lotNumber}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <label className={styles.srOnly}>
            Lector USB
            <input
              ref={scannerRef}
              inputMode="none"
              autoComplete="off"
              disabled={locked}
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
              <Icon name="qr" size={18} />
              {cameraOn ? "Ocultar cámara" : "Cámara"}
            </button>
          </div>
        </>
      )}

      {!identity ? (
        days.length === 0 ? (
          <p className={styles.quiet}>Cuando escanees un QR, aparece acá.</p>
        ) : (
          days.map((day) => (
            <section key={day.heading}>
              <h2 className={styles.groupTitle}>{day.heading}</h2>
              <ul className={styles.feed}>
                {day.items.map((movement) => {
                  const exited = isExitAction(movement.actionType);
                  return (
                    <li className={styles.feedItem} key={movement.id}>
                      <span
                        className={`${styles.feedIcon} ${exited ? styles.feedOut : ""}`}
                      >
                        <Icon name={exited ? "exit" : "enter"} size={18} />
                      </span>
                      <span className={styles.feedBody}>
                        <strong>{movement.guestName ?? "Invitado"}</strong>
                        <span className={styles.feedMeta}>
                          {accessActionShort(movement.actionType)}
                        </span>
                      </span>
                      <span className={styles.feedTime}>
                        {formatTime(movement.timestamp)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )
      ) : null}

      {flash ? (
        <button
          type="button"
          className={flash.ok ? styles.flashOk : styles.flashFail}
          onClick={() => setFlash(null)}
        >
          <span>
            {flash.ok ? outcomeCopy(flash.actionType).title : "No entra"}
          </span>
          <strong>
            {flash.ok
              ? flash.kind === "owner"
                ? personName(flash.owner.firstName, flash.owner.lastName)
                : flash.invitation.guestName
              : gateErrorLabel(flash.code, flash.message)}
          </strong>
        </button>
      ) : null}
    </section>
  );
}

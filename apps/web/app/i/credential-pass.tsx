"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Icon } from "@/components/icons";
import styles from "./invite.module.css";

function mapsQuery(input: {
  neighborhoodName: string;
  lotNumber: string;
  streetName: string | null;
}) {
  return [input.streetName, `lote ${input.lotNumber}`, input.neighborhoodName]
    .filter(Boolean)
    .join(", ");
}

export function CredentialPass({
  qrDataUrl,
  guestName,
  neighborhoodName,
  lotNumber,
  streetName,
  validLabel,
}: {
  qrDataUrl: string;
  guestName: string;
  neighborhoodName: string;
  lotNumber: string;
  streetName: string | null;
  validLabel: string;
}) {
  const [wake, setWake] = useState("Subí el brillo para el QR.");
  const place = mapsQuery({ neighborhoodName, lotNumber, streetName });
  const encoded = encodeURIComponent(place);

  useEffect(() => {
    let sentinel: WakeLockSentinel | null = null;

    async function lock() {
      try {
        sentinel = await navigator.wakeLock?.request("screen");
        if (sentinel) {
          setWake("Pantalla activa.");
        }
      } catch {
        setWake("Subí el brillo para el QR.");
      }
    }

    void lock();

    return () => {
      void sentinel?.release();
    };
  }, []);

  async function saveQr() {
    if (navigator.share) {
      await navigator.share({
        title: `Acceso · ${neighborhoodName}`,
        text: `${guestName} · ${place}`,
      });
      return;
    }

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `acceso-${lotNumber}.png`;
    link.click();
  }

  return (
    <article className={styles.credential}>
      <p className={styles.kicker}>{neighborhoodName}</p>
      <h1>{guestName}</h1>
      <p className={styles.lead}>
        {streetName ? `${streetName} · ` : ""}Lote {lotNumber}
      </p>
      <p className={styles.when}>
        <Icon name="clock" size={18} />
        {validLabel}
      </p>
      <figure className={styles.qr}>
        <Image
          alt="QR de acceso"
          height={280}
          src={qrDataUrl}
          unoptimized
          width={280}
        />
        <figcaption>{wake}</figcaption>
      </figure>
      <div className={styles.actions}>
        <a
          className={styles.action}
          href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
          rel="noreferrer"
          target="_blank"
        >
          <Icon name="pin" />
          Maps
        </a>
        <a
          className={styles.action}
          href={`https://waze.com/ul?q=${encoded}&navigate=yes`}
          rel="noreferrer"
          target="_blank"
        >
          <Icon name="car" />
          Waze
        </a>
        <button
          className={styles.action}
          type="button"
          onClick={() => void saveQr()}
        >
          <Icon name="qr" />
          Guardar
        </button>
      </div>
    </article>
  );
}

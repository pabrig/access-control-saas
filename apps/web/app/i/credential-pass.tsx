"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
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
  const [wake, setWake] = useState("Mantené el brillo al máximo");
  const place = mapsQuery({ neighborhoodName, lotNumber, streetName });
  const encoded = encodeURIComponent(place);

  useEffect(() => {
    document.documentElement.dataset.pass = "ready";
    let sentinel: WakeLockSentinel | null = null;

    async function lock() {
      try {
        sentinel = await navigator.wakeLock?.request("screen");
        if (sentinel) {
          setWake("Pantalla activa. Subí el brillo si el QR no se lee.");
        }
      } catch {
        setWake("Subí el brillo al máximo para que se lea el QR.");
      }
    }

    void lock();

    return () => {
      delete document.documentElement.dataset.pass;
      void sentinel?.release();
    };
  }, []);

  async function sharePass() {
    if (navigator.share) {
      await navigator.share({
        title: `Pase · ${neighborhoodName}`,
        text: `${guestName} · ${place}`,
      });
      return;
    }

    const link = document.createElement("a");
    link.href = qrDataUrl;
    link.download = `pase-${lotNumber}.png`;
    link.click();
  }

  return (
    <article className={styles.credential}>
      <p className={styles.place}>{neighborhoodName}</p>
      <h1>{guestName}</h1>
      <p className={styles.lead}>
        {streetName ? `${streetName} · ` : ""}Lote {lotNumber}
        <br />
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
          className={styles.primary}
          href={`https://www.google.com/maps/search/?api=1&query=${encoded}`}
          rel="noreferrer"
          target="_blank"
        >
          Google Maps
        </a>
        <a
          className={styles.secondary}
          href={`https://waze.com/ul?q=${encoded}&navigate=yes`}
          rel="noreferrer"
          target="_blank"
        >
          Waze
        </a>
        <button
          className={styles.wallet}
          type="button"
          onClick={() => void sharePass()}
        >
          Apple Wallet / Google Wallet
        </button>
      </div>
      <p className={styles.walletHint}>
        Guardá o compartí el QR. En la web no se emite un pase nativo de Wallet
        sin la cuenta del barrio.
      </p>
    </article>
  );
}

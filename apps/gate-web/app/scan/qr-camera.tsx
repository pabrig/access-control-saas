"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import styles from "./scan.module.css";

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>;
};

function createDetector(): BarcodeDetectorLike | null {
  const Ctor = (
    globalThis as typeof globalThis & {
      BarcodeDetector?: new (options?: {
        formats: string[];
      }) => BarcodeDetectorLike;
    }
  ).BarcodeDetector;

  if (!Ctor) {
    return null;
  }

  try {
    return new Ctor({ formats: ["qr_code"] });
  } catch {
    return null;
  }
}

function cameraBlockReason(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  if (!window.isSecureContext) {
    return "La cámara pide HTTPS. En la Mac, localhost alcanza; si no, usá el buscador.";
  }

  if (!navigator.mediaDevices?.getUserMedia) {
    return "Este navegador no permite usar la cámara.";
  }

  return null;
}

export function QrCamera({
  active,
  onCode,
}: {
  active: boolean;
  onCode: (value: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const onCodeRef = useRef(onCode);
  onCodeRef.current = onCode;
  const [armed, setArmed] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  useEffect(() => {
    setStatus(cameraBlockReason());
  }, []);

  useEffect(() => {
    if (!active || !armed) {
      return;
    }

    const blocked = cameraBlockReason();
    if (blocked) {
      setStatus(blocked);
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const detector = createDetector();
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { willReadFrequently: true });
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    let lastValue = "";
    let lastAt = 0;

    function emit(value: string) {
      const now = Date.now();
      if (value !== lastValue || now - lastAt > 2500) {
        lastValue = value;
        lastAt = now;
        onCodeRef.current(value);
      }
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
      } catch (error) {
        const name = error instanceof DOMException ? error.name : "";
        if (name === "NotAllowedError") {
          setStatus("Negaste la cámara. Activalo en Ajustes del navegador.");
        } else if (name === "NotFoundError") {
          setStatus("No hay una cámara disponible en este dispositivo.");
        } else {
          setStatus("No se pudo abrir la cámara. Usá el buscador o HTTPS.");
        }
        return;
      }

      if (cancelled || !video) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }

      setStatus(null);
      video.srcObject = stream;
      video.setAttribute("playsinline", "true");
      await video.play().catch(() => undefined);

      const tick = async () => {
        if (cancelled || !video) {
          return;
        }

        if (video.readyState >= 2) {
          try {
            if (detector) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue?.trim();
              if (value) {
                emit(value);
              }
            } else if (canvas && context) {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0);
              const image = context.getImageData(
                0,
                0,
                canvas.width,
                canvas.height,
              );
              const code = jsQR(image.data, image.width, image.height);
              if (code?.data) {
                emit(code.data.trim());
              }
            }
          } catch {
            // The frame is not readable yet.
          }
        }

        frame = window.requestAnimationFrame(() => {
          void tick();
        });
      };

      void tick();
    }

    void start();

    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [active, armed]);

  const blocked = status ?? cameraBlockReason();

  return (
    <div className={styles.viewfinder}>
      <video
        ref={videoRef}
        className={styles.video}
        autoPlay
        muted
        playsInline
      />
      <canvas ref={canvasRef} className={styles.qrCanvas} />
      <div className={styles.reticle} aria-hidden />
      {blocked ? (
        <div className={styles.cameraMsg} role="status">
          <p>{blocked}</p>
        </div>
      ) : null}
      {!armed && !blocked ? (
        <button
          className={styles.cameraArm}
          type="button"
          onClick={() => setArmed(true)}
        >
          Activar cámara
        </button>
      ) : null}
      <p className={styles.viewfinderHint}>
        {armed ? "Apuntá al QR" : "Tocá para usar la cámara"}
      </p>
    </div>
  );
}

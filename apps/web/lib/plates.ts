export type PlateFormat = "AR_OLD" | "AR_MERCOSUR";

export type ParsedPlate = {
  format: PlateFormat;
  normalized: string;
  display: string;
};

const OLD = /^[A-Z]{3}[0-9]{3}$/;
const MERCOSUR = /^[A-Z]{2}[0-9]{3}[A-Z]{2}$/;

export function parsePlate(raw: string): ParsedPlate | null {
  const normalized = raw.trim().toUpperCase().replace(/[\s-]/g, "");

  if (OLD.test(normalized)) {
    return {
      format: "AR_OLD",
      normalized,
      display: `${normalized.slice(0, 3)} ${normalized.slice(3)}`,
    };
  }

  if (MERCOSUR.test(normalized)) {
    return {
      format: "AR_MERCOSUR",
      normalized,
      display: `${normalized.slice(0, 2)} ${normalized.slice(2, 5)} ${normalized.slice(5)}`,
    };
  }

  return null;
}

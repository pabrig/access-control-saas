import { FormSection } from "@/components/form-section";
import ui from "@/components/ui.module.css";

export type LotFieldsValue = {
  lot_number?: string;
  street_name?: string | null;
  block_name?: string | null;
  surface_m2?: number | string | null;
  phone?: string | null;
  notes?: string | null;
};

function surfaceDefault(value?: number | string | null) {
  if (value === null || value === undefined || value === "") {
    return "";
  }
  return String(value);
}

export function LotFields({ value }: { value?: LotFieldsValue }) {
  return (
    <>
      <FormSection
        title="Ubicación del lote"
        description="Número, manzana y calle dentro del barrio."
      >
        <div className={ui.formRow}>
          <label>
            Número de lote
            <input
              name="lot_number"
              required
              maxLength={20}
              placeholder="Ej. 14"
              defaultValue={value?.lot_number}
            />
          </label>
          <label>
            Manzana
            <input
              name="block_name"
              required
              maxLength={20}
              placeholder="Ej. A"
              defaultValue={value?.block_name ?? ""}
            />
          </label>
        </div>
        <label>
          Calle
          <input
            name="street_name"
            required
            maxLength={80}
            placeholder="Ej. Los Tilos"
            defaultValue={value?.street_name ?? ""}
          />
        </label>
      </FormSection>
      <FormSection
        title="Características"
        description="Superficie y contacto del lote."
      >
        <div className={ui.formRow}>
          <label>
            Superficie (m²)
            <input
              name="surface_m2"
              required
              inputMode="decimal"
              min={1}
              max={1000000}
              step="0.01"
              placeholder="Ej. 450"
              defaultValue={surfaceDefault(value?.surface_m2)}
            />
          </label>
          <label>
            Teléfono
            <input
              name="phone"
              maxLength={30}
              inputMode="tel"
              placeholder="11 5555-0100"
              defaultValue={value?.phone ?? ""}
            />
          </label>
        </div>
        <label>
          Notas
          <textarea
            name="notes"
            maxLength={280}
            rows={2}
            placeholder="Obras, inquilino, observaciones…"
            defaultValue={value?.notes ?? ""}
          />
        </label>
      </FormSection>
    </>
  );
}

import ui from "@/components/ui.module.css";

export type LotFieldsValue = {
  lot_number?: string;
  street_name?: string | null;
  block_name?: string | null;
  phone?: string | null;
  notes?: string | null;
};

export function LotFields({ value }: { value?: LotFieldsValue }) {
  return (
    <>
      <div className={ui.formRow}>
        <label>
          Número de lote
          <input
            name="lot_number"
            required
            maxLength={20}
            defaultValue={value?.lot_number}
          />
        </label>
        <label>
          Manzana
          <input
            name="block_name"
            maxLength={20}
            placeholder="Ej. A"
            defaultValue={value?.block_name ?? ""}
          />
        </label>
      </div>
      <div className={ui.formRow}>
        <label>
          Calle
          <input
            name="street_name"
            maxLength={80}
            defaultValue={value?.street_name ?? ""}
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
          placeholder="Titular, inquilino, obras…"
          defaultValue={value?.notes ?? ""}
        />
      </label>
    </>
  );
}

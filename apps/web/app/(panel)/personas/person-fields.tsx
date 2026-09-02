import { FormSection } from "@/components/form-section";
import ui from "@/components/ui.module.css";

export type PersonFieldsValue = {
  first_name?: string;
  last_name?: string;
  dni?: string | null;
};

export function PersonFields({
  value,
  requireDni = false,
}: {
  value?: PersonFieldsValue;
  requireDni?: boolean;
}) {
  return (
    <FormSection
      title="Datos personales"
      description="Nombre completo y documento de identidad."
    >
      <div className={ui.formRow}>
        <label>
          Nombre
          <input
            name="first_name"
            required
            maxLength={80}
            autoComplete="given-name"
            placeholder="Ej. María"
            defaultValue={value?.first_name}
          />
        </label>
        <label>
          Apellido
          <input
            name="last_name"
            required
            maxLength={80}
            autoComplete="family-name"
            placeholder="Ej. Gómez"
            defaultValue={value?.last_name}
          />
        </label>
      </div>
      <label>
        DNI
        <input
          name="dni"
          required={requireDni}
          inputMode="numeric"
          minLength={7}
          maxLength={12}
          pattern="[0-9]{7,12}"
          placeholder="Ej. 30123456"
          defaultValue={value?.dni ?? ""}
        />
      </label>
    </FormSection>
  );
}

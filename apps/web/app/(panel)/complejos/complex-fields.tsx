import { FormSection } from "@/components/form-section";

export function ComplexFields({
  defaultName,
  defaultLocation,
}: {
  defaultName?: string;
  defaultLocation?: string | null;
}) {
  return (
    <FormSection
      title="Datos básicos"
      description="Nombre e ubicación general del complejo."
    >
      <label>
        Nombre
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Ej. Master Plan Norte"
          defaultValue={defaultName}
        />
      </label>
      <label>
        Ubicación
        <input
          name="location"
          required
          maxLength={120}
          placeholder="Ej. Pilar, Buenos Aires"
          defaultValue={defaultLocation ?? ""}
        />
      </label>
    </FormSection>
  );
}

import { FormSection } from "@/components/form-section";
import ui from "@/components/ui.module.css";

export function BarrioFields({
  complexes,
  hiddenComplexId,
  superadmin,
  defaultName,
  defaultComplexId,
  defaultLocation,
}: {
  complexes: { id: string; name: string }[];
  hiddenComplexId: string | null;
  superadmin: boolean;
  defaultName?: string;
  defaultComplexId?: string | null;
  defaultLocation?: string | null;
}) {
  return (
    <>
      <FormSection
        title="Identificación"
        description="Nombre del barrio y, si aplica, el complejo al que pertenece."
      >
        {hiddenComplexId ? (
          <input type="hidden" name="complex_id" value={hiddenComplexId} />
        ) : superadmin && complexes.length > 0 ? (
          <label>
            Complejo
            <select name="complex_id" defaultValue={defaultComplexId ?? ""}>
              <option value="">Ninguno (barrio independiente)</option>
              {complexes.map((complex) => (
                <option key={complex.id} value={complex.id}>
                  {complex.name}
                </option>
              ))}
            </select>
          </label>
        ) : complexes.length > 1 ? (
          <label>
            Complejo
            <select
              name="complex_id"
              required
              defaultValue={defaultComplexId ?? ""}
            >
              <option value="" disabled>
                Elegí el complejo
              </option>
              {complexes.map((complex) => (
                <option key={complex.id} value={complex.id}>
                  {complex.name}
                </option>
              ))}
            </select>
          </label>
        ) : superadmin ? null : (
          <p className={ui.muted}>No hay un complejo asignado a tu rol.</p>
        )}
        <label>
          Nombre del barrio
          <input
            name="name"
            required
            maxLength={80}
            placeholder="Ej. Los Robles"
            defaultValue={defaultName}
          />
        </label>
      </FormSection>
      <FormSection
        title="Ubicación"
        description="Ciudad, localidad o referencia para ubicar el barrio."
      >
        <label>
          Ubicación
          <input
            name="location"
            required
            maxLength={120}
            placeholder="Ej. Escobar, Buenos Aires"
            defaultValue={defaultLocation ?? ""}
          />
        </label>
      </FormSection>
    </>
  );
}

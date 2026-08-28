import ui from "@/components/ui.module.css";

export function BarrioFields({
  complexes,
  hiddenComplexId,
  superadmin,
  defaultName,
  defaultComplexId,
}: {
  complexes: { id: string; name: string }[];
  hiddenComplexId: string | null;
  superadmin: boolean;
  defaultName?: string;
  defaultComplexId?: string | null;
}) {
  return (
    <>
      {hiddenComplexId ? (
        <input type="hidden" name="complex_id" value={hiddenComplexId} />
      ) : superadmin && complexes.length > 0 ? (
        <label>
          Complejo
          <select name="complex_id" defaultValue={defaultComplexId ?? ""}>
            <option value="">Ninguno</option>
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
    </>
  );
}

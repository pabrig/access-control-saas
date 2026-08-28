import ui from "@/components/ui.module.css";

export type PersonFieldsValue = {
  first_name?: string;
  last_name?: string;
};

export function PersonFields({ value }: { value?: PersonFieldsValue }) {
  return (
    <div className={ui.formRow}>
      <label>
        Nombre
        <input
          name="first_name"
          required
          maxLength={80}
          autoComplete="given-name"
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
          defaultValue={value?.last_name}
        />
      </label>
    </div>
  );
}

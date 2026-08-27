export const ACCESS_ACTION_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_COMPLEX: "Entrada al complejo",
  IN_PROPERTY: "Entrada a la propiedad",
  EXITED: "Salida",
  EXPIRED: "Expirada",
};

export function accessActionLabel(actionType: string) {
  return ACCESS_ACTION_LABEL[actionType] ?? actionType;
}

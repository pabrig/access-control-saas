export const ACCESS_ACTION_LABEL: Record<string, string> = {
  PENDING: "Pendiente",
  IN_COMPLEX: "Entrada",
  IN_PROPERTY: "Entrada",
  EXITED: "Salida",
  EXPIRED: "Expirada",
};

export function accessActionLabel(actionType: string) {
  return ACCESS_ACTION_LABEL[actionType] ?? actionType;
}

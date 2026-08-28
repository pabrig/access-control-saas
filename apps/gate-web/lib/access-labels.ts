export function accessActionShort(actionType: string) {
  if (actionType === "IN_COMPLEX" || actionType === "IN_PROPERTY") {
    return "Entró";
  }
  if (actionType === "EXITED") {
    return "Salió";
  }
  return actionType;
}

export function isExitAction(actionType: string) {
  return actionType === "EXITED";
}

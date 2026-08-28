import { parsePlate } from "@/lib/plates";

export type VehicleDraft = {
  plate: string;
  color: string;
  passengers: Array<{ name: string; dni: string; isDriver: boolean }>;
};

export type ParsedVehicle = {
  plateNormalized: string;
  plateDisplay: string;
  plateFormat: "AR_OLD" | "AR_MERCOSUR";
  color: string | null;
  passengers: Array<{
    fullName: string;
    dni: string | null;
    isDriver: boolean;
  }>;
};

export function parseVehiclesFromForm(
  formData: FormData,
): ParsedVehicle[] | string {
  const count = Number(formData.get("vehicle_count") ?? 0);
  if (!Number.isInteger(count) || count < 0 || count > 8) {
    return "Demasiados autos.";
  }

  const vehicles: ParsedVehicle[] = [];

  for (let index = 0; index < count; index += 1) {
    const plateRaw = String(
      formData.get(`vehicle_${index}_plate`) ?? "",
    ).trim();
    const color = String(formData.get(`vehicle_${index}_color`) ?? "").trim();
    const passengerCount = Number(
      formData.get(`vehicle_${index}_passenger_count`) ?? 0,
    );

    if (!plateRaw) {
      continue;
    }

    const plate = parsePlate(plateRaw);
    if (!plate) {
      return `La patente "${plateRaw}" no es AAA 000 ni AA000AA.`;
    }

    if (vehicles.some((row) => row.plateNormalized === plate.normalized)) {
      return `La patente ${plate.display} está repetida.`;
    }

    const passengers: ParsedVehicle["passengers"] = [];
    for (
      let passengerIndex = 0;
      passengerIndex < passengerCount;
      passengerIndex += 1
    ) {
      const fullName = String(
        formData.get(`vehicle_${index}_passenger_${passengerIndex}_name`) ?? "",
      ).trim();
      const dni =
        String(
          formData.get(`vehicle_${index}_passenger_${passengerIndex}_dni`) ??
            "",
        ).trim() || null;
      const isDriver =
        formData.get(`vehicle_${index}_passenger_${passengerIndex}_driver`) ===
        "on";

      if (!fullName) {
        continue;
      }

      passengers.push({ fullName, dni, isDriver });
    }

    const guestName = String(formData.get("guest_name") ?? "").trim();
    const guestDni = String(formData.get("guest_dni") ?? "").trim() || null;
    const guestAlreadyListed = passengers.some(
      (passenger) =>
        passenger.fullName.localeCompare(guestName, undefined, {
          sensitivity: "base",
        }) === 0,
    );

    if (guestName && !guestAlreadyListed) {
      passengers.unshift({
        fullName: guestName,
        dni: guestDni,
        isDriver: !passengers.some((passenger) => passenger.isDriver),
      });
    }

    if (passengers.length === 0) {
      return `El auto ${plate.display} necesita al menos un pasajero.`;
    }

    if (!passengers.some((passenger) => passenger.isDriver)) {
      passengers[0]!.isDriver = true;
    }

    const drivers = passengers.filter((passenger) => passenger.isDriver);
    if (drivers.length > 1) {
      return `El auto ${plate.display} puede tener un solo conductor.`;
    }

    vehicles.push({
      plateNormalized: plate.normalized,
      plateDisplay: plate.display,
      plateFormat: plate.format,
      color: color || null,
      passengers,
    });
  }

  return vehicles;
}

"use client";

import { useState } from "react";
import ui from "@/components/ui.module.css";
import styles from "./vehicle-fields.module.css";

type PassengerDraft = { name: string; dni: string; isDriver: boolean };
type VehicleDraft = {
  plate: string;
  color: string;
  passengers: PassengerDraft[];
};

const emptyPassenger = (isDriver: boolean): PassengerDraft => ({
  name: "",
  dni: "",
  isDriver,
});

const emptyVehicle = (): VehicleDraft => ({
  plate: "",
  color: "",
  passengers: [emptyPassenger(true)],
});

export function VehicleFields() {
  const [vehicles, setVehicles] = useState<VehicleDraft[]>([emptyVehicle()]);

  function updateVehicle(index: number, patch: Partial<VehicleDraft>) {
    setVehicles((current) =>
      current.map((vehicle, currentIndex) =>
        currentIndex === index ? { ...vehicle, ...patch } : vehicle,
      ),
    );
  }

  function updatePassenger(
    vehicleIndex: number,
    passengerIndex: number,
    patch: Partial<PassengerDraft>,
  ) {
    setVehicles((current) =>
      current.map((vehicle, currentIndex) => {
        if (currentIndex !== vehicleIndex) {
          return vehicle;
        }

        return {
          ...vehicle,
          passengers: vehicle.passengers.map((passenger, currentPassenger) => {
            if (patch.isDriver && currentPassenger !== passengerIndex) {
              return { ...passenger, isDriver: false };
            }

            return currentPassenger === passengerIndex
              ? { ...passenger, ...patch }
              : passenger;
          }),
        };
      }),
    );
  }

  return (
    <fieldset className={styles.fieldset}>
      <legend>Autos y pasajeros</legend>
      <p className={ui.muted}>
        Si venís en auto, cargá la patente (AAA 000 o AA000AA) y quién viaja.
      </p>
      <input type="hidden" name="vehicle_count" value={vehicles.length} />

      {vehicles.map((vehicle, vehicleIndex) => (
        <section className={styles.vehicle} key={vehicleIndex}>
          <header>
            <strong>Auto {vehicleIndex + 1}</strong>
            {vehicles.length > 1 ? (
              <button
                className={ui.buttonDanger}
                type="button"
                onClick={() =>
                  setVehicles((current) =>
                    current.filter((_, index) => index !== vehicleIndex),
                  )
                }
              >
                Quitar auto
              </button>
            ) : null}
          </header>
          <div className={ui.formRow}>
            <label>
              Patente
              <input
                name={`vehicle_${vehicleIndex}_plate`}
                value={vehicle.plate}
                onChange={(event) =>
                  updateVehicle(vehicleIndex, { plate: event.target.value })
                }
                placeholder="ABC 123 o AB 123 CD"
                maxLength={10}
                autoComplete="off"
              />
            </label>
            <label>
              Color (opcional)
              <input
                name={`vehicle_${vehicleIndex}_color`}
                value={vehicle.color}
                onChange={(event) =>
                  updateVehicle(vehicleIndex, { color: event.target.value })
                }
                maxLength={32}
              />
            </label>
          </div>
          <input
            type="hidden"
            name={`vehicle_${vehicleIndex}_passenger_count`}
            value={vehicle.passengers.length}
          />
          {vehicle.passengers.map((passenger, passengerIndex) => (
            <div className={styles.passenger} key={passengerIndex}>
              <label>
                Pasajero
                <input
                  name={`vehicle_${vehicleIndex}_passenger_${passengerIndex}_name`}
                  value={passenger.name}
                  onChange={(event) =>
                    updatePassenger(vehicleIndex, passengerIndex, {
                      name: event.target.value,
                    })
                  }
                  maxLength={120}
                />
              </label>
              <label>
                DNI
                <input
                  name={`vehicle_${vehicleIndex}_passenger_${passengerIndex}_dni`}
                  value={passenger.dni}
                  onChange={(event) =>
                    updatePassenger(vehicleIndex, passengerIndex, {
                      dni: event.target.value,
                    })
                  }
                  maxLength={32}
                />
              </label>
              <label className={ui.check}>
                <input
                  type="checkbox"
                  name={`vehicle_${vehicleIndex}_passenger_${passengerIndex}_driver`}
                  checked={passenger.isDriver}
                  onChange={(event) =>
                    updatePassenger(vehicleIndex, passengerIndex, {
                      isDriver: event.target.checked,
                    })
                  }
                />
                Conductor
              </label>
              {vehicle.passengers.length > 1 ? (
                <button
                  className={ui.buttonSecondary}
                  type="button"
                  onClick={() =>
                    updateVehicle(vehicleIndex, {
                      passengers: vehicle.passengers.filter(
                        (_, index) => index !== passengerIndex,
                      ),
                    })
                  }
                >
                  Quitar
                </button>
              ) : null}
            </div>
          ))}
          <button
            className={ui.buttonSecondary}
            type="button"
            onClick={() =>
              updateVehicle(vehicleIndex, {
                passengers: [...vehicle.passengers, emptyPassenger(false)],
              })
            }
          >
            Sumar pasajero
          </button>
        </section>
      ))}

      {vehicles.length < 8 ? (
        <button
          className={ui.buttonSecondary}
          type="button"
          onClick={() => setVehicles((current) => [...current, emptyVehicle()])}
        >
          Sumar otro auto
        </button>
      ) : null}
    </fieldset>
  );
}

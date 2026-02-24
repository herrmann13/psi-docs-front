import { useCallback, useEffect, useMemo, useState } from "react";
import { loadPatients, savePatients } from "../storage/patients";

function createId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `patient-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export default function usePatients() {
  const [patients, setPatients] = useState(() => loadPatients());

  useEffect(() => {
    savePatients(patients);
  }, [patients]);

  const addPatient = useCallback((data) => {
    const nextPatient = { id: createId(), ...data };
    setPatients((current) => [nextPatient, ...current]);
    return nextPatient;
  }, []);

  const updatePatient = useCallback((id, data) => {
    let updatedPatient = null;
    setPatients((current) =>
      current.map((patient) => {
        if (patient.id !== id) return patient;
        updatedPatient = { ...patient, ...data, id: patient.id };
        return updatedPatient;
      })
    );
    return updatedPatient;
  }, []);

  const value = useMemo(
    () => ({
      patients,
      addPatient,
      updatePatient,
    }),
    [patients, addPatient, updatePatient]
  );

  return value;
}

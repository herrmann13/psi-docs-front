import { useCallback, useEffect, useMemo, useState } from "react";
import { loadPatientsCache, savePatientsCache } from "../storage/patients";
import { patientsService } from "../services/api/patients";

const normalizeEmergencyContacts = (patient, cached) => {
  const contacts = Array.isArray(patient.emergencyContacts)
    ? patient.emergencyContacts
    : [];
  const contact1 = contacts[0] || {};
  const contact2 = contacts[1] || {};

  return {
    emergencyContact1Name:
      contact1.name || cached?.emergencyContact1Name || "",
    emergencyContact1Phone:
      contact1.phone || cached?.emergencyContact1Phone || "",
    emergencyContact2Name:
      contact2.name || cached?.emergencyContact2Name || "",
    emergencyContact2Phone:
      contact2.phone || cached?.emergencyContact2Phone || "",
  };
};

const normalizePatient = (patient, cached) => {
  if (!patient || typeof patient !== "object") return cached || {};
  const base = {
    ...cached,
    ...patient,
    name: patient.fullName || patient.name || cached?.name || "",
  };

  return {
    ...base,
    ...normalizeEmergencyContacts(patient, cached),
    addressStreet: patient.addressStreet || cached?.addressStreet || "",
    addressNumber: patient.addressNumber || cached?.addressNumber || "",
    addressNeighborhood: patient.addressNeighborhood || cached?.addressNeighborhood || "",
    addressCity: patient.addressCity || cached?.addressCity || "",
    addressState: patient.addressState || cached?.addressState || "",
  };
};

const buildPayload = (data = {}) => ({
  fullName: data.name || data.fullName || "",
  cpf: data.cpf || "",
  birthDate: data.birthDate || null,
  phone: data.phone || "",
});

export default function usePatients() {
  const cached = loadPatientsCache();
  const [patients, setPatients] = useState(() => cached.patients || []);
  const [isLoading, setIsLoading] = useState(true);
  const [isOffline, setIsOffline] = useState(false);
  const [error, setError] = useState("");

  const refreshPatients = useCallback(async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await patientsService.list();
      const latestCache = loadPatientsCache();
      const cachedById = new Map(
        (latestCache.patients || []).map((patient) => [String(patient.id), patient])
      );
      const normalized = Array.isArray(data)
        ? data.map((patient) =>
            normalizePatient(patient, cachedById.get(String(patient.id)))
          )
        : [];
      setPatients(normalized);
      savePatientsCache(normalized);
      setIsOffline(false);
    } catch (err) {
      setError(err.message || "Erro ao carregar pacientes.");
      setIsOffline(true);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPatients();
  }, [refreshPatients]);

  const addPatient = useCallback(
    async (data) => {
      setError("");
      const payload = buildPayload(data);
      try {
        const created = await patientsService.create(payload);
        const normalized = normalizePatient(created, data);
        setPatients((current) => {
          const next = [normalized, ...current];
          savePatientsCache(next);
          return next;
        });
        return normalized;
      } catch (err) {
        setError(err.message || "Erro ao criar paciente.");
        throw err;
      }
    },
    []
  );

  const updatePatient = useCallback(
    async (id, data) => {
      setError("");
      const payload = buildPayload(data);
      try {
        const updated = await patientsService.update(id, payload);
        const normalized = normalizePatient(updated, data);
        setPatients((current) => {
          const next = current.map((patient) =>
            String(patient.id) === String(id) ? normalized : patient
          );
          savePatientsCache(next);
          return next;
        });
        return normalized;
      } catch (err) {
        setError(err.message || "Erro ao atualizar paciente.");
        throw err;
      }
    },
    []
  );

  const mergePatients = useCallback(
    async (incoming) => {
      if (!Array.isArray(incoming) || incoming.length === 0) return;
      setError("");
      try {
        await Promise.all(
          incoming.map((patient) => {
            const payload = buildPayload(patient);
            if (patient.id) {
              return patientsService.update(patient.id, payload);
            }
            return patientsService.create(payload);
          })
        );
        await refreshPatients();
      } catch (err) {
        setError(err.message || "Erro ao importar pacientes.");
        throw err;
      }
    },
    [refreshPatients]
  );

  const value = useMemo(
    () => ({
      patients,
      addPatient,
      updatePatient,
      mergePatients,
      isLoading,
      isOffline,
      error,
      refreshPatients,
    }),
    [patients, addPatient, updatePatient, mergePatients, isLoading, isOffline, error, refreshPatients]
  );

  return value;
}

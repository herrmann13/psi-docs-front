const STORAGE_KEY = "psi-docs-patients-cache-v1";

export function loadPatientsCache() {
  if (typeof window === "undefined") return { patients: [], updatedAt: null };

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { patients: [], updatedAt: null };
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return { patients: parsed, updatedAt: null };
    }
    if (!parsed || !Array.isArray(parsed.patients)) {
      return { patients: [], updatedAt: null };
    }
    return {
      patients: parsed.patients,
      updatedAt: parsed.updatedAt || null,
    };
  } catch {
    return { patients: [], updatedAt: null };
  }
}

export function savePatientsCache(patients) {
  if (typeof window === "undefined") return;
  const payload = {
    updatedAt: new Date().toISOString(),
    patients,
  };
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

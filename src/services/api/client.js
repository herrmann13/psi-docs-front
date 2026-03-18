import { STORAGE_TOKEN_KEY, STORAGE_USER_KEY } from "../../constants/auth";
import { showAlert } from "../../utils/uiFeedback";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:3000";

const buildUrl = (path) => {
  if (path.startsWith("http")) return path;
  return `${API_BASE_URL}${path}`;
};

const parseResponse = async (response) => {
  if (response.status === 204) return null;
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
};

const buildErrorMessage = (data) => {
  if (!data) return "Erro ao comunicar com o servidor.";
  if (typeof data === "string") return data;

  const errorCode = data.code;
  const codeMessages = {
    INVALID_APPOINTMENT_INTERVAL:
      "Intervalo de consulta invalido. Verifique se o inicio e menor que o fim.",
    APPOINTMENT_PATIENT_MISMATCH:
      "Todas as consultas do plano devem ser do mesmo paciente selecionado.",
    APPOINTMENT_SERIES_CREATE_REQUIRES_SERIES_ENDPOINT:
      "Consultas vinculadas a plano devem ser criadas pelo fluxo de plano de consultas.",
    APPOINTMENT_SERIES_PATIENT_IMMUTABLE:
      "Nao e permitido trocar o paciente de consulta vinculada a plano.",
    APPOINTMENT_SERIES_ASSOCIATION_IMMUTABLE:
      "Nao e permitido alterar a associacao de uma consulta com plano.",
    FORBIDDEN_PATIENT_OWNER:
      "Voce nao tem permissao para usar esse paciente.",
    FORBIDDEN_APPOINTMENT_OWNER:
      "Voce nao tem permissao para operar sobre esta consulta.",
  };
  if (errorCode && codeMessages[errorCode]) {
    return codeMessages[errorCode];
  }

  const baseMessage = data.message || "Erro ao comunicar com o servidor.";
  const fieldErrors = data?.errors?.fieldErrors;

  if (!fieldErrors || typeof fieldErrors !== "object") {
    return baseMessage;
  }

  const details = Object.entries(fieldErrors).flatMap(([field, messages]) => {
    if (!Array.isArray(messages)) return [];
    return messages.map((message) => `${field}: ${message}`);
  });

  if (details.length === 0) {
    return baseMessage;
  }

  return `${baseMessage}\n${details.join("\n")}`;
};

const request = async (path, options = {}) => {
  const storedToken = localStorage.getItem(STORAGE_TOKEN_KEY);
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(storedToken ? { Authorization: `Bearer ${storedToken}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    if (response.status === 401) {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      localStorage.removeItem(STORAGE_USER_KEY);
      window.dispatchEvent(new Event("auth:logout"));
    }
    const message = buildErrorMessage(data);
    showAlert(message);
    throw new Error(message);
  }

  return data;
};

export const apiClient = {
  get: (path) => request(path),
  post: (path, body) =>
    request(path, { method: "POST", body: JSON.stringify(body) }),
  put: (path, body) =>
    request(path, { method: "PUT", body: JSON.stringify(body) }),
  patch: (path, body) =>
    request(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: (path) => request(path, { method: "DELETE" }),
};

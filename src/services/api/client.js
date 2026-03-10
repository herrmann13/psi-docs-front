import { STORAGE_TOKEN_KEY, STORAGE_USER_KEY } from "../../constants/auth";

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
    if (typeof window !== "undefined") {
      window.alert(message);
    }
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

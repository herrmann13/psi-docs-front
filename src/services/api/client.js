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

const request = async (path, options = {}) => {
  const response = await fetch(buildUrl(path), {
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  const data = await parseResponse(response);
  if (!response.ok) {
    const message =
      (data && data.message) ||
      (typeof data === "string" ? data : "Erro ao comunicar com o servidor.");
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
  del: (path) => request(path, { method: "DELETE" }),
};

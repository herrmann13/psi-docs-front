import { apiClient } from "./client";

const buildQuery = (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return;
    searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
};

export const patientsService = {
  list: (params) => apiClient.get(`/patients${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/patients?id=${id}`),
  create: (data) => apiClient.post("/patients", data),
  update: (id, data) => apiClient.put(`/patients/${id}`, data),
  remove: (id) => apiClient.del(`/patients/${id}`),
};

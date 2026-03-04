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

export const appointmentsService = {
  list: (params) => apiClient.get(`/appointments${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/appointments?id=${id}`),
  create: (data) => apiClient.post("/appointments", data),
  update: (id, data) => apiClient.put(`/appointments/${id}`, data),
  remove: (id) => apiClient.del(`/appointments/${id}`),
};

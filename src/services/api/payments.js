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

export const paymentsService = {
  list: (params) => apiClient.get(`/payments${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/payments?id=${id}`),
  create: (data) => apiClient.post("/payments", data),
  update: (id, data) => apiClient.put(`/payments/${id}`, data),
  remove: (id) => apiClient.del(`/payments/${id}`),
};

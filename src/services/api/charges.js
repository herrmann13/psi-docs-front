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

export const chargesService = {
  list: (params) => apiClient.get(`/charges${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/charges?id=${id}`),
  create: (data) => apiClient.post("/charges", data),
  addPayment: (id, data) => apiClient.post(`/charges/${id}/payments`, data),
  update: (id, data) => apiClient.put(`/charges/${id}`, data),
  remove: (id) => apiClient.del(`/charges/${id}`),
};

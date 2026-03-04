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

export const paymentChargesService = {
  list: (params) => apiClient.get(`/payment-charges${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/payment-charges?id=${id}`),
  create: (data) => apiClient.post("/payment-charges", data),
  update: (id, data) => apiClient.put(`/payment-charges/${id}`, data),
  remove: (id) => apiClient.del(`/payment-charges/${id}`),
};

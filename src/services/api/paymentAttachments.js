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

export const paymentAttachmentsService = {
  list: (params) => apiClient.get(`/payment-attachments${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/payment-attachments?id=${id}`),
  create: (data) => apiClient.post("/payment-attachments", data),
  update: (id, data) => apiClient.put(`/payment-attachments/${id}`, data),
  remove: (id) => apiClient.del(`/payment-attachments/${id}`),
};

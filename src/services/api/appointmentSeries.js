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

export const appointmentSeriesService = {
  list: (params) => apiClient.get(`/appointment-series${buildQuery(params)}`),
  getById: (id) => apiClient.get(`/appointment-series?id=${id}`),
  create: (data) => apiClient.post("/appointment-series", data),
};

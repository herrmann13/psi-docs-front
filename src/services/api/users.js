import { apiClient } from "./client";

export const usersService = {
  updateDefaultSessionValue: (id, defaultSessionValue) =>
    apiClient.patch(`/users/${id}`, { defaultSessionValue }),
};

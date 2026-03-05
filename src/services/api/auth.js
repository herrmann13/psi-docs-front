import { apiClient } from "./client";

export const authService = {
  loginWithGoogle: (idToken) => apiClient.post("/auth/google", { idToken }),
};

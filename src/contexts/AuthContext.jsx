import { createContext, useCallback, useContext, useMemo, useState } from "react";

const AuthContext = createContext(null);
const STORAGE_KEY = "psi-docs-auth-token";

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_KEY));

  const setToken = useCallback((nextToken) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_KEY, nextToken);
      setTokenState(nextToken);
      return;
    }

    localStorage.removeItem(STORAGE_KEY);
    setTokenState(null);
  }, []);

  const logout = useCallback(() => setToken(null), [setToken]);

  const value = useMemo(
    () => ({
      token,
      setToken,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, setToken, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}

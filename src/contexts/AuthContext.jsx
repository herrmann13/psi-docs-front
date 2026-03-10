import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { STORAGE_TOKEN_KEY, STORAGE_USER_KEY } from "../constants/auth";

const AuthContext = createContext(null);

const readStoredUser = () => {
  const raw = localStorage.getItem(STORAGE_USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setTokenState] = useState(() => localStorage.getItem(STORAGE_TOKEN_KEY));
  const [user, setUserState] = useState(() => readStoredUser());

  const setSession = useCallback((nextToken, nextUser) => {
    if (nextToken) {
      localStorage.setItem(STORAGE_TOKEN_KEY, nextToken);
      setTokenState(nextToken);
    } else {
      localStorage.removeItem(STORAGE_TOKEN_KEY);
      setTokenState(null);
    }

    if (nextUser) {
      localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
      setUserState(nextUser);
    } else {
      localStorage.removeItem(STORAGE_USER_KEY);
      setUserState(null);
    }
  }, []);

  const logout = useCallback(() => setSession(null, null), [setSession]);

  const updateUser = useCallback((nextUser) => {
    if (!nextUser) {
      localStorage.removeItem(STORAGE_USER_KEY);
      setUserState(null);
      return;
    }

    localStorage.setItem(STORAGE_USER_KEY, JSON.stringify(nextUser));
    setUserState(nextUser);
  }, []);

  useEffect(() => {
    const handleLogout = () => setSession(null, null);
    window.addEventListener("auth:logout", handleLogout);
    return () => window.removeEventListener("auth:logout", handleLogout);
  }, [setSession]);

  const value = useMemo(
    () => ({
      token,
      user,
      setSession,
      updateUser,
      logout,
      isAuthenticated: Boolean(token),
    }),
    [token, user, setSession, updateUser, logout]
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

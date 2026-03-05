import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { authService } from "../services/api/auth";
import { useAuth } from "../contexts/AuthContext";

export default function Login() {
  const navigate = useNavigate();
  const { setSession, isAuthenticated } = useAuth();
  const buttonRef = useRef(null);
  const hasRendered = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const handleGoogleCredential = useCallback(
    async (response) => {
      const idToken = response?.credential;
      if (!idToken) {
        setError("Nao foi possivel validar o login com o Google.");
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const data = await authService.loginWithGoogle(idToken);
        if (!data?.token) {
          throw new Error("Token nao retornado pelo servidor.");
        }
        setSession(data.token, data.user || null);
        navigate("/");
      } catch (err) {
        setError(err.message || "Erro ao autenticar.");
      } finally {
        setIsLoading(false);
      }
    },
    [setSession, navigate]
  );

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
      return;
    }

    if (!clientId) {
      setError("VITE_GOOGLE_CLIENT_ID nao configurado.");
      return;
    }

    let intervalId = null;

    const setupGoogle = () => {
      if (hasRendered.current) return;
      if (!window.google?.accounts?.id || !buttonRef.current) return;

      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleGoogleCredential,
      });

      window.google.accounts.id.renderButton(buttonRef.current, {
        theme: "outline",
        size: "large",
        width: 320,
      });

      hasRendered.current = true;
      if (intervalId) clearInterval(intervalId);
    };

    setupGoogle();
    intervalId = setInterval(setupGoogle, 120);

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [clientId, handleGoogleCredential, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-slate-50">
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">psi-docs</h1>
        <p className="mt-2 text-sm text-slate-600">
          Entre com sua conta Google para continuar.
        </p>

        <div className="mt-6 flex justify-center">
          <div ref={buttonRef} />
        </div>

        {isLoading && (
          <p className="mt-4 text-center text-sm text-slate-600">
            Autenticando...
          </p>
        )}

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

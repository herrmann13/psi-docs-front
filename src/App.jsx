import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import PatientListView from "./pages/PatientListView";
import PatientRegistrationView from "./pages/PatientRegistrationView";
import PatientDetailView from "./pages/PatientDetailView";
import AppointmentsView from "./pages/AppointmentsView";
import FinanceView from "./pages/FinanceView";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import { usersService } from "./services/api/users";
import { showAlert } from "./utils/uiFeedback";

function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user, updateUser } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsValue, setSettingsValue] = useState("");
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const handleBack = () => {
    if (location.pathname !== "/") {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const isPatientsRoute = location.pathname === "/" || location.pathname.startsWith("/patient");
  const isAppointmentsRoute = location.pathname.startsWith("/appointments");
  const isFinanceRoute = location.pathname.startsWith("/finance");

  const openSettings = () => {
    if (!user?.id) {
      showAlert("Usuário não identificado para configurar valor padrão da sessão.");
      return;
    }

    setSettingsValue(
      user.defaultSessionValue === null || user.defaultSessionValue === undefined
        ? ""
        : String(user.defaultSessionValue)
    );
    setIsSettingsOpen(true);
    setIsMobileMenuOpen(false);
  };

  const closeSettings = () => {
    setIsSettingsOpen(false);
    setSettingsValue("");
  };

  const handleSaveUserSettings = async (event) => {
    event.preventDefault();

    if (!user?.id) {
      showAlert("Usuário não identificado para configurar valor padrão da sessão.");
      return;
    }

    const trimmed = settingsValue.trim();
    if (!trimmed) {
      showAlert("Informe um valor padrão válido.");
      return;
    }

    const parsedValue = Number(trimmed);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      showAlert("Informe um valor padrão válido.");
      return;
    }

    setIsSavingSettings(true);
    try {
      const updatedUser = await usersService.updateDefaultSessionValue(user.id, parsedValue);
      updateUser(updatedUser || { ...user, defaultSessionValue: parsedValue });
      closeSettings();
      showAlert("Valor padrão da sessão atualizado.");
    } catch {
      // erro tratado globalmente no apiClient
    } finally {
      setIsSavingSettings(false);
    }
  };

  const NavLinks = ({ mobile = false }) => (
    <div className={mobile ? "flex flex-col gap-2" : "flex items-center gap-2"}>
      <Link
        to="/"
        className={`rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
          isPatientsRoute
            ? "bg-slate-100 text-slate-900"
            : "text-slate-700 hover:text-slate-900"
        }`}
      >
        Pacientes
      </Link>

      <Link
        to="/appointments"
        className={`rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
          isAppointmentsRoute
            ? "bg-slate-100 text-slate-900"
            : "text-slate-700 hover:text-slate-900"
        }`}
      >
        Agenda
      </Link>

      <Link
        to="/finance"
        className={`rounded-md px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
          isFinanceRoute
            ? "bg-slate-100 text-slate-900"
            : "text-slate-700 hover:text-slate-900"
        }`}
      >
        Financeiro
      </Link>
    </div>
  );

  return (
    <>
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-12 max-w-5xl items-center gap-3 px-4">
          <button
            type="button"
            onClick={() => {handleBack()}}
            className="inline-flex items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Voltar
          </button>

          <div className="hidden sm:flex">
            <NavLinks />
          </div>

          {isAuthenticated && (
            <div className="ml-auto hidden items-center gap-3 sm:flex">
              {user?.name && (
                <span className="text-sm font-medium text-slate-600">
                  {user.name}
                </span>
              )}
              <button
                type="button"
                onClick={openSettings}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Configurações
              </button>
              <button
                type="button"
                onClick={logout}
                className="rounded-md border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
              >
                Sair
              </button>
            </div>
          )}

          {isAuthenticated ? (
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              className="ml-auto inline-flex items-center rounded-md border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 sm:hidden"
            >
              Menu
            </button>
          ) : null}
        </div>
      </div>

      {isMobileMenuOpen ? (
        <div className="fixed inset-0 z-20 sm:hidden">
          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(false)}
            className="absolute inset-0 bg-slate-900/40"
            aria-label="Fechar menu"
          />
          <aside className="absolute right-0 top-0 h-full w-72 border-l border-slate-200 bg-white p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-sm font-semibold text-slate-900">Navegação</p>
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="rounded-md px-2 py-1 text-sm font-semibold text-slate-600"
              >
                Fechar
              </button>
            </div>

            <NavLinks mobile />

            <div className="mt-6 border-t border-slate-200 pt-4">
              {user?.name ? (
                <p className="mb-3 text-sm font-medium text-slate-600">{user.name}</p>
              ) : null}
              <div className="flex flex-col gap-2">
                <button
                  type="button"
                  onClick={openSettings}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700"
                >
                  Configurações
                </button>
                <button
                  type="button"
                  onClick={logout}
                  className="rounded-md border border-slate-200 px-3 py-2 text-left text-sm font-semibold text-slate-700"
                >
                  Sair
                </button>
              </div>
            </div>
          </aside>
        </div>
      ) : null}

      {isSettingsOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h2 className="text-lg font-semibold text-slate-900">Configurações</h2>
            <p className="mt-1 text-sm text-slate-500">Preferências da conta</p>

            <form onSubmit={handleSaveUserSettings} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Valor padrão da sessão</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={settingsValue}
                  onChange={(event) => setSettingsValue(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeSettings}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  )
}

function RequireAuth({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  )
}

function AppLayout() {
  const location = useLocation();
  const hideTopBar = location.pathname === "/login";

  return (
    <>
      {!hideTopBar && <TopBar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <PatientListView />
            </RequireAuth>
          }
        />
        <Route
          path="/patient/register"
          element={
            <RequireAuth>
              <PatientRegistrationView />
            </RequireAuth>
          }
        />
        <Route
          path="/patient/:id"
          element={
            <RequireAuth>
              <PatientDetailView />
            </RequireAuth>
          }
        />
        <Route
          path="/patient/:id/edit"
          element={
            <RequireAuth>
              <PatientRegistrationView />
            </RequireAuth>
          }
        />
        <Route
          path="/appointments"
          element={
            <RequireAuth>
              <AppointmentsView />
            </RequireAuth>
          }
        />
        <Route
          path="/finance"
          element={
            <RequireAuth>
              <FinanceView />
            </RequireAuth>
          }
        />
      </Routes>
      <GlobalUiOverlay />
    </>
  )
}

function GlobalUiOverlay() {
  const [alertMessage, setAlertMessage] = useState("");
  const [confirmState, setConfirmState] = useState({ message: "", resolve: null });

  useEffect(() => {
    const handleAlert = (event) => {
      setAlertMessage(event.detail?.message || "Ocorreu um erro.");
    };

    const handleConfirm = (event) => {
      setConfirmState({
        message: event.detail?.message || "Confirma esta ação?",
        resolve: event.detail?.resolve || null,
      });
    };

    window.addEventListener("ui:alert", handleAlert);
    window.addEventListener("ui:confirm", handleConfirm);
    return () => {
      window.removeEventListener("ui:alert", handleAlert);
      window.removeEventListener("ui:confirm", handleConfirm);
    };
  }, []);

  const closeAlert = () => setAlertMessage("");

  const resolveConfirm = (value) => {
    if (typeof confirmState.resolve === "function") {
      confirmState.resolve(value);
    }
    setConfirmState({ message: "", resolve: null });
  };

  return (
    <>
      {alertMessage ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Aviso</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{alertMessage}</p>
            <div className="mt-6 flex justify-end">
              <button
                type="button"
                onClick={closeAlert}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmState.resolve ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Confirmar ação</h3>
            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-700">{confirmState.message}</p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => resolveConfirm(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => resolveConfirm(true)}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

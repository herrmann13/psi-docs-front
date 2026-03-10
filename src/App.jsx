import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link, Navigate } from "react-router-dom";
import PatientListView from "./pages/PatientListView";
import PatientRegistrationView from "./pages/PatientRegistrationView";
import PatientDetailView from "./pages/PatientDetailView";
import AppointmentsView from "./pages/AppointmentsView";
import FinanceView from "./pages/FinanceView";
import Login from "./pages/Login";
import { useAuth } from "./contexts/AuthContext";
import { usersService } from "./services/api/users";

function TopBar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, logout, user, updateUser } = useAuth();

  const handleBack = () => {
    const idx = window.history.state?.idx ?? 0;
    if (location.pathname !== "/") {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  const isPatientsRoute = location.pathname === "/" || location.pathname.startsWith("/patient");
  const isAppointmentsRoute = location.pathname.startsWith("/appointments");
  const isFinanceRoute = location.pathname.startsWith("/finance");

  const handleUserSettings = async () => {
    if (!user?.id) {
      window.alert("Usuario nao identificado para configurar valor padrao da sessao.");
      return;
    }

    const currentValue =
      user.defaultSessionValue === null || user.defaultSessionValue === undefined
        ? ""
        : String(user.defaultSessionValue);
    const input = window.prompt("Valor padrao da sessao", currentValue);
    if (input === null) return;

    const trimmed = input.trim();
    if (!trimmed) {
      window.alert("Informe um valor padrao valido.");
      return;
    }

    const parsedValue = Number(trimmed);
    if (Number.isNaN(parsedValue) || parsedValue < 0) {
      window.alert("Informe um valor padrao valido.");
      return;
    }

    try {
      const updatedUser = await usersService.updateDefaultSessionValue(user.id, parsedValue);
      updateUser(updatedUser || { ...user, defaultSessionValue: parsedValue });
      window.alert("Valor padrao da sessao atualizado.");
    } catch {
      // erro tratado globalmente no apiClient
    }
  };

  return (
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

            <div className="flex items-center gap-2">
              <Link
                to="/"
                className={`rounded-md px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  isPatientsRoute
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Pacientes
              </Link>

              <Link
                to="/appointments"
                className={`rounded-md px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  isAppointmentsRoute
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Agenda
              </Link>

              <Link
                to="/finance"
                className={`rounded-md px-3 py-1 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                  isFinanceRoute
                    ? "bg-slate-100 text-slate-900"
                    : "text-slate-700 hover:text-slate-900"
                }`}
              >
                Financeiro
              </Link>

            </div>

            {isAuthenticated && (
              <div className="ml-auto flex items-center gap-3">
                {user?.name && (
                  <span className="text-sm font-medium text-slate-600">
                    {user.name}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleUserSettings}
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900"
                >
                  Configuracoes
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
      </div>
    </div>
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
    </>
  )
}

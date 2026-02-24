import { BrowserRouter, Routes, Route, useNavigate, useLocation, Link } from "react-router-dom"
import PatientListView from "./pages/PatientListView"
import PatientRegistrationView from "./pages/PatientRegistrationView"
import PatientDetailView from "./pages/PatientDetailView"

function TopBar(){
  const navigate = useNavigate();
  const location = useLocation();

  const handleBack = () => {
    const idx = window.history.state?.idx ?? 0;
    if (location.pathname !== "/") {
      navigate(-1);
    } else {
      navigate("/", { replace: true });
    }
  };

  return(
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
                className="rounded-md px-3 py-1 text-sm font-semibold text-slate-700 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                Pacientes
              </Link>

            </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TopBar/>
      <Routes>
        <Route path="/" element={<PatientListView />} />
        <Route path="/patient/register" element={<PatientRegistrationView />} />
        <Route path="/patient/:id" element={<PatientDetailView />} />
        <Route path="/patient/:id/edit" element={<PatientRegistrationView />} />
      </Routes>
    </BrowserRouter>
  )
}

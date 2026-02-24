import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import usePatients from "../hooks/usePatients";

export default function PatientListView() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { patients } = usePatients();

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((patient) => (patient.name || "").toLowerCase().includes(term))
  }, [search, patients]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
                <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Pacientes
                        </p>
                        <h1 className="text-xl font-semibold text-slate-900">
                            Lista de pacientes
                        </h1>
                    </div>

                    <button
                        type="button"
                        onClick={() => navigate("/patient/register")}
                        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-3 focus:ring-slate-400"
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth={2}
                        >
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Adicionar paciente</span>
                    </button>

                </header>

                <div className="mb-4">
                    <label className="text-sm font-medium text-slate-700">Pesquisar por nome</label>
                    <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Digite o nome do paciente"
                    />
                </div>

                <div className="divide-y divide-slate-200">
                    {filtered.map((patient) => (
                     <div
                         key={patient.id}
                         className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0"
                     >
                         <div>
                        <p className="text-base font-semibold text-slate-900">{patient.name || "Sem nome"}</p>
                        <p className="text-sm text-slate-500">CPF {patient.cpf || "-"}</p>
                          </div>
                         <p className="text-sm text-slate-600">{patient.phone || "-"}</p>
                     </div>
                     ))}

                    {filtered.length === 0 && (
                    <div className="py-6 text-center text-sm text-slate-500">
                        Nenhum paciente encontrado.
                    </div>
                    )}
                </div>
            </div>
        </div>
    </div>
  )
}

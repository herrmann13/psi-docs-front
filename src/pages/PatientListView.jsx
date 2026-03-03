import { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import usePatients from "../hooks/usePatients";

export default function PatientListView() {
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const { patients, mergePatients } = usePatients();
  const fileInputRef = useRef(null);

  const handleExport = () => {
    const payload = {
      version: 1,
      exportedAt: new Date().toISOString(),
      patients,
    };

    const fileDate = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `psi-docs-pacientes-${fileDate}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleImportChange = (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        const items = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.patients)
          ? parsed.patients
          : [];

        const sanitized = items.filter(
          (item) => item && typeof item === "object" && (item.name || item.cpf)
        );

        if (sanitized.length === 0) {
          window.alert("Arquivo invalido: nenhum paciente valido encontrado.");
          return;
        }

        mergePatients(sanitized);
      } catch {
        window.alert("Arquivo invalido: JSON mal formatado.");
      }
    };
    reader.readAsText(file);
  };

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase()
    if (!term) return patients
    return patients.filter((patient) => (patient.name || "").toLowerCase().includes(term))
  }, [search, patients]);

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
                <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:align-right sm:justify-between">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                            Pacientes
                        </p>
                        <h1 className="text-xl font-semibold text-slate-900">
                            Lista de pacientes
                        </h1>
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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

                        <button
                            type="button"
                            onClick={handleImportClick}
                            className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-sky-500 focus:outline-none focus:ring-3 focus:ring-sky-200"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20V8m0 12-4-4m4 4 4-4M4 4h16" />
                            </svg>
                            <span>Importar pacientes</span>
                        </button>

                        <button
                            type="button"
                            onClick={handleExport}
                            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-3 focus:ring-slate-400"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="h-4 w-4"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                strokeWidth={2}
                            >
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8V20m0-12-4 4m4-4 4 4M4 4h16" />
                            </svg>
                            <span>Exportar pacientes</span>
                        </button>
                    </div>

                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/json"
                        onChange={handleImportChange}
                        className="hidden"
                    />
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
                      <button
                          key={patient.id}
                          type="button"
                          onClick={() => navigate(`/patient/${patient.id}`)}
                          className="flex w-full items-start justify-between gap-4 rounded-lg py-3 text-left transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-400 first:pt-0 last:pb-0"
                      >
                          <div>
                        <p className="text-base font-semibold text-slate-900">{patient.name || "Sem nome"}</p>
                        <p className="text-sm text-slate-500">CPF {patient.cpf || "-"}</p>
                          </div>
                         <p className="text-sm text-slate-600">{patient.phone || "-"}</p>
                     </button>
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

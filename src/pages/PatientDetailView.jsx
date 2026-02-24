import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePatients from "../hooks/usePatients";

const formatDate = (value) => {
  if (!value) return "-";
  if (value.includes("-")) {
    const [year, month, day] = value.split("-");
    return [day, month, year].filter(Boolean).join("/");
  }
  return value;
};

const displayValue = (value) => (value && value.trim ? value.trim() : value) || "-";

function DetailRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <span className="text-base text-slate-900">{value}</span>
    </div>
  );
}

export default function PatientDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients } = usePatients();

  const patient = useMemo(
    () => patients.find((item) => item.id === id),
    [patients, id]
  );

  if (!patient) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <h1 className="text-xl font-semibold text-slate-900">
              Paciente nao encontrado
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Esse cadastro nao esta disponivel.
            </p>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-500 focus:outline-none focus:ring-3 focus:ring-slate-400"
            >
              Voltar para pacientes
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-8">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Paciente
            </p>
            <h1 className="text-2xl font-semibold text-slate-900">
              {displayValue(patient.name)}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              CPF {displayValue(patient.cpf)}
            </p>
          </header>

          <div className="space-y-8">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Identificacao
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Nome" value={displayValue(patient.name)} />
                <DetailRow label="Data de nascimento" value={formatDate(patient.birthDate)} />
                <DetailRow label="CPF" value={displayValue(patient.cpf)} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Contato
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow label="Telefone" value={displayValue(patient.phone)} />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Endereco
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Rua"
                  value={displayValue(patient.addressStreet)}
                />
                <DetailRow
                  label="Numero"
                  value={displayValue(patient.addressNumber)}
                />
                <DetailRow
                  label="Bairro"
                  value={displayValue(patient.addressNeighborhood)}
                />
                <DetailRow
                  label="Cidade"
                  value={displayValue(patient.addressCity)}
                />
                <DetailRow
                  label="Estado"
                  value={displayValue(patient.addressState)}
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
                Contatos de emergencia
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                <DetailRow
                  label="Contato 1"
                  value={displayValue(patient.emergencyContact1Name)}
                />
                <DetailRow
                  label="Telefone"
                  value={displayValue(patient.emergencyContact1Phone)}
                />
                <DetailRow
                  label="Contato 2"
                  value={displayValue(patient.emergencyContact2Name)}
                />
                <DetailRow
                  label="Telefone"
                  value={displayValue(patient.emergencyContact2Phone)}
                />
              </div>
            </section>
          </div>

          <div className="mt-10 flex justify-end">
            <button
              type="button"
              onClick={() => navigate(`/patient/${patient.id}/edit`)}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-400"
              aria-label="Editar paciente"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.862 4.487a2.25 2.25 0 1 1 3.182 3.182L8.25 19.463 4.5 19.5l.037-3.75L16.862 4.487Z"
                />
              </svg>
              Editar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

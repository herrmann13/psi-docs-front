import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePatients from "../hooks/usePatients";

const formatDate = (value) => {
  if (!value) return "-";
  const input = typeof value === "string" ? value : String(value);
  const datePart = input.includes("T") ? input.split("T")[0] : input;

  if (datePart.includes("-")) {
    const [year, month, day] = datePart.split("-");
    if (year && month && day) {
      return [day, month, year].join("/");
    }
  }

  return datePart;
};

const displayValue = (value) => (value && value.trim ? value.trim() : value) || "-";

const normalizePhone = (value) => {
  if (value === null || value === undefined) return "";
  const input = typeof value === "string" ? value : String(value);
  return input.replace(/\D/g, "");
};

const buildWhatsAppLink = (value) => {
  const digits = normalizePhone(value);
  if (!digits) return "";
  return `https://wa.me/${digits}`;
};

const hasFilledContactField = (value) => Boolean(value && String(value).trim());

const getEmergencyContacts = (patient) => {
  if (Array.isArray(patient?.emergencyContacts)) {
    return patient.emergencyContacts.filter(
      (contact) => hasFilledContactField(contact?.name) || hasFilledContactField(contact?.phone)
    );
  }

  return [
    {
      name: patient?.emergencyContact1Name,
      phone: patient?.emergencyContact1Phone,
    },
    {
      name: patient?.emergencyContact2Name,
      phone: patient?.emergencyContact2Phone,
    },
  ].filter((contact) => hasFilledContactField(contact.name) || hasFilledContactField(contact.phone));
};

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

function PhoneDetailRow({ label, value }) {
  const phoneDigits = normalizePhone(value);
  const hasDisplayValue = displayValue(value) !== "-";
  const canLink = Boolean(phoneDigits);
  const whatsappLink = buildWhatsAppLink(value);

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
        {label}
      </span>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-base text-slate-900">{displayValue(value)}</span>
        {hasDisplayValue ? (
          <div className="flex flex-wrap items-center gap-2">
            {canLink ? (
              <a
                href={`tel:${phoneDigits}`}
                className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-400"
                aria-label={`Ligar para ${displayValue(value)}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a1.5 1.5 0 0 0 1.5-1.5v-2.25a1.5 1.5 0 0 0-1.5-1.5h-2.25a1.5 1.5 0 0 0-1.5 1.5v.75a12.75 12.75 0 0 1-9.75-9.75h.75a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 6.75 3H4.5A1.5 1.5 0 0 0 3 4.5v2.25Z"
                  />
                </svg>
                Ligar
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 6.75c0 8.284 6.716 15 15 15h1.5a1.5 1.5 0 0 0 1.5-1.5v-2.25a1.5 1.5 0 0 0-1.5-1.5h-2.25a1.5 1.5 0 0 0-1.5 1.5v.75a12.75 12.75 0 0 1-9.75-9.75h.75a1.5 1.5 0 0 0 1.5-1.5V4.5A1.5 1.5 0 0 0 6.75 3H4.5A1.5 1.5 0 0 0 3 4.5v2.25Z"
                  />
                </svg>
                Ligar
              </span>
            )}
            {canLink ? (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 shadow-sm transition hover:bg-emerald-100 focus:outline-none focus:ring-3 focus:ring-emerald-200"
                aria-label={`Abrir WhatsApp para ${displayValue(value)}`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9 9 0 1 0-7.243-3.657L3 21l3.657-1.757A8.963 8.963 0 0 0 12 21Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 8.25a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-1.5Zm3.75 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-1.5Zm-3.75 5.25c.75.75 1.75 1.125 3 1.125s2.25-.375 3-1.125"
                  />
                </svg>
                WhatsApp
              </a>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-300">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-3.5 w-3.5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 21a9 9 0 1 0-7.243-3.657L3 21l3.657-1.757A8.963 8.963 0 0 0 12 21Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 8.25a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-1.5Zm3.75 0a.75.75 0 0 1 .75-.75h.75a.75.75 0 0 1 .75.75v1.5a.75.75 0 0 1-.75.75h-.75a.75.75 0 0 1-.75-.75v-1.5Zm-3.75 5.25c.75.75 1.75 1.125 3 1.125s2.25-.375 3-1.125"
                  />
                </svg>
                WhatsApp
              </span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function PatientDetailView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { patients, isLoading } = usePatients();

  const patient = useMemo(
    () => patients.find((item) => String(item.id) === String(id)),
    [patients, id]
  );

  const emergencyContacts = useMemo(
    () => getEmergencyContacts(patient),
    [patient]
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
            <p className="text-sm text-slate-500">Carregando paciente...</p>
          </div>
        </div>
      </div>
    );
  }

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
                <PhoneDetailRow label="Telefone" value={patient.phone} />
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
                {emergencyContacts.length === 0 ? (
                  <DetailRow label="Contatos" value="-" />
                ) : (
                  emergencyContacts.map((contact, index) => (
                    <PhoneDetailRow
                      key={`emergency-contact-${index}`}
                      label={`Contato ${index + 1} - ${displayValue(contact.name)}`}
                      value={contact.phone}
                    />
                  ))
                )}
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

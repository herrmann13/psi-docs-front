import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePatients from "../hooks/usePatients";

const INITIAL_FORM = {
  name: "",
  cpf: "",
  birthDate: "",
  phone: "",
  addressStreet: "",
  addressNumber: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  emergencyContact1Name: "",
  emergencyContact1Phone: "",
  emergencyContact2Name: "",
  emergencyContact2Phone: "",
};

const digitsOnly = (value) => value.replace(/\D/g, "");

const formatCpf = (value) => {
  const digits = digitsOnly(value).slice(0, 11);
  const parts = [];

  if (digits.length > 0) parts.push(digits.slice(0, 3));
  if (digits.length > 3) parts.push(digits.slice(3, 6));
  if (digits.length > 6) parts.push(digits.slice(6, 9));

  const base = parts.join(".");
  if (digits.length > 9) {
    return `${base}-${digits.slice(9, 11)}`;
  }
  return base;
};

const formatPhone = (value) => {
  const digits = digitsOnly(value).slice(0, 11);
  if (!digits) return "";

  const ddd = digits.slice(0, 2);
  const rest = digits.slice(2);

  if (rest.length <= 4) {
    return `(${ddd}) ${rest}`.trim();
  }

  if (rest.length <= 8) {
    return `(${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`;
  }

  return `(${ddd}) ${rest.slice(0, 5)}-${rest.slice(5)}`;
};

export default function PatientRegistrationView() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addPatient, updatePatient, patients } = usePatients();
  const [form, setForm] = useState(INITIAL_FORM);
  const isEditing = Boolean(id);

  const existingPatient = useMemo(
    () => patients.find((patient) => patient.id === id),
    [patients, id]
  );

  useEffect(() => {
    if (isEditing && existingPatient) {
      setForm({ ...INITIAL_FORM, ...existingPatient });
    }
  }, [isEditing, existingPatient]);

  const canSave = useMemo(() => form.name.trim().length > 0, [form.name]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMaskedChange = (field, formatter) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: formatter(value) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    if (!trimmedName) return;

    const payload = {
      ...form,
      name: trimmedName,
      cpf: form.cpf.trim(),
      phone: form.phone.trim(),
    };

    if (isEditing && existingPatient) {
      updatePatient(existingPatient.id, payload);
      navigate(`/patient/${existingPatient.id}`);
      return;
    }

    addPatient(payload);
    setForm(INITIAL_FORM);
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-6">
            <h1 className="text-medium font-semibold uppercase tracking-wide text-slate-900">
              {isEditing ? "Editar paciente" : "Cadastro de paciente"}
            </h1>
          </header>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="text-sm font-medium text-slate-700">
                Nome completo
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Nome"
                autoComplete="name"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                CPF
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cpf}
                onChange={handleMaskedChange("cpf", formatCpf)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="000.000.000-00"
                autoComplete="off"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Data de nascimento
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={handleChange("birthDate")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                autoComplete="bday"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Celular
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={handleMaskedChange("phone", formatPhone)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Telefone"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Endereço
              </label>
                <div className="grid grid-cols-2 gap-3 text-slate-500 text-sm">
                  <label>
                    Rua
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.addressStreet}
                    onChange={handleChange("addressStreet")}
                    placeholder="Rua, Logradouro, Avenida..."
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <label>
                    Número
                  </label>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={form.addressNumber}
                    onChange={handleChange("addressNumber")}
                    placeholder="Número"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <label>
                    Bairro
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.addressNeighborhood}
                    onChange={handleChange("addressNeighborhood")}
                    placeholder="Bairro"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4 text-slate-500 text-sm">
                  <label>
                    Cidade
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.addressCity}
                    onChange={handleChange("addressCity")}
                    placeholder="Cidade"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                  <label>
                    Estado
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.addressState}
                    onChange={handleChange("addressState")}
                    placeholder="Estado"
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>

            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Contato de Emergência 1
              </label>
              <input
                type="text"
                value={form.emergencyContact1Name}
                onChange={handleChange("emergencyContact1Name")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Descrição"
                autoComplete="off"
              />
              <input
                type="tel"
                inputMode="tel"
                value={form.emergencyContact1Phone}
                onChange={handleMaskedChange("emergencyContact1Phone", formatPhone)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Telefone"
                autoComplete="tel"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Contato de Emergência 2
              </label>
              <input
                type="text"
                value={form.emergencyContact2Name}
                onChange={handleChange("emergencyContact2Name")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Descrição"
                autoComplete="off"
              />
              <input
                type="tel"
                inputMode="tel"
                value={form.emergencyContact2Phone}
                onChange={handleMaskedChange("emergencyContact2Phone", formatPhone)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Telefone"
                autoComplete="tel"
              />
            </div>

            <button
              type="submit"
              disabled={!canSave}
              className="mt-2 w-full rounded-lg bg-slate-900 py-3 text-base font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isEditing ? "Salvar alteracoes" : "Salvar paciente"}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}

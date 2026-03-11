import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import usePatients from "../hooks/usePatients";
import { showAlert } from "../utils/uiFeedback";

const INITIAL_FORM = {
  name: "",
  cpf: "",
  birthDate: "",
  phone: "",
  addressStreet: "",
  addressNumber: "",
  addressComplement: "",
  addressNeighborhood: "",
  addressCity: "",
  addressState: "",
  emergencyContacts: [],
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
    () => patients.find((patient) => String(patient.id) === String(id)),
    [patients, id]
  );

  useEffect(() => {
    if (isEditing && existingPatient) {
      const contactsFromApi = Array.isArray(existingPatient.emergencyContacts)
        ? existingPatient.emergencyContacts
        : [];
      const legacyContacts = [
        {
          name: existingPatient.emergencyContact1Name,
          phone: existingPatient.emergencyContact1Phone,
        },
        {
          name: existingPatient.emergencyContact2Name,
          phone: existingPatient.emergencyContact2Phone,
        },
      ].filter((contact) => contact.name || contact.phone);

      setForm({
        ...INITIAL_FORM,
        ...existingPatient,
        emergencyContacts:
          contactsFromApi.length > 0 ? contactsFromApi : legacyContacts,
      });
    }
  }, [isEditing, existingPatient]);

  const canSave = useMemo(() => {
    return (
      form.name.trim().length > 0 &&
      form.cpf.trim().length > 0 &&
      form.birthDate.trim().length > 0 &&
      form.phone.trim().length > 0
    );
  }, [form.name, form.cpf, form.birthDate, form.phone]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleMaskedChange = (field, formatter) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: formatter(value) }));
  };

  const handleContactChange = (index, field) => (event) => {
    const { value } = event.target;
    setForm((current) => {
      const nextContacts = current.emergencyContacts.map((contact, idx) =>
        idx === index ? { ...contact, [field]: value } : contact
      );
      return { ...current, emergencyContacts: nextContacts };
    });
  };

  const handleContactPhoneChange = (index) => (event) => {
    const { value } = event.target;
    setForm((current) => {
      const nextContacts = current.emergencyContacts.map((contact, idx) =>
        idx === index ? { ...contact, phone: formatPhone(value) } : contact
      );
      return { ...current, emergencyContacts: nextContacts };
    });
  };

  const addEmergencyContact = () => {
    setForm((current) => ({
      ...current,
      emergencyContacts: [...current.emergencyContacts, { name: "", phone: "" }],
    }));
  };

  const removeEmergencyContact = (index) => {
    setForm((current) => ({
      ...current,
      emergencyContacts: current.emergencyContacts.filter((_, idx) => idx !== index),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedCpf = form.cpf.trim();
    const trimmedPhone = form.phone.trim();

    if (!trimmedName || !trimmedCpf || !form.birthDate || !trimmedPhone) {
      showAlert("Nome completo, CPF, data de nascimento e celular sao obrigatorios.");
      return;
    }

    const sanitizedContacts = form.emergencyContacts
      .map((contact) => ({
        name: contact.name?.trim() || "",
        phone: contact.phone?.trim() || "",
      }))
      .filter((contact) => contact.name || contact.phone);

    const payload = {
      ...form,
      name: trimmedName,
      cpf: trimmedCpf,
      phone: trimmedPhone,
      emergencyContacts: sanitizedContacts,
    };

    try {
      if (isEditing && existingPatient) {
        await updatePatient(existingPatient.id, payload);
        navigate(`/patient/${existingPatient.id}`);
        return;
      }

      await addPatient(payload);
      setForm(INITIAL_FORM);
      navigate("/");
    } catch (err) {
      showAlert(err.message || "Erro ao salvar paciente.");
    }
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
                Nome completo <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={form.name}
                onChange={handleChange("name")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Nome"
                autoComplete="name"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                CPF <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                value={form.cpf}
                onChange={handleMaskedChange("cpf", formatCpf)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="000.000.000-00"
                autoComplete="off"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Data de nascimento <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={form.birthDate}
                onChange={handleChange("birthDate")}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                autoComplete="bday"
                required
              />
            </div>

            <div>
              <label className="text-sm font-medium text-slate-700">
                Celular <span className="text-rose-600">*</span>
              </label>
              <input
                type="tel"
                inputMode="tel"
                value={form.phone}
                onChange={handleMaskedChange("phone", formatPhone)}
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Telefone"
                autoComplete="tel"
                required
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
                    Complemento
                  </label>
                  <input
                    type="text"
                    inputMode="text"
                    value={form.addressComplement}
                    onChange={handleChange("addressComplement")}
                    placeholder="Apto, bloco, etc"
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

            <div className="rounded-lg border border-slate-200 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <label className="text-sm font-semibold text-slate-700">
                  Contatos de emergência
                </label>
                <button
                  type="button"
                  onClick={addEmergencyContact}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Adicionar contato
                </button>
              </div>

              {form.emergencyContacts.length === 0 ? (
                <p className="mt-3 text-sm text-slate-500">
                  Nenhum contato adicionado.
                </p>
              ) : (
                <div className="mt-3 space-y-4">
                  {form.emergencyContacts.map((contact, index) => (
                    <div
                      key={`contact-${index}`}
                      className="rounded-lg border border-slate-100 bg-slate-50 p-3"
                    >
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Contato {index + 1}
                        </p>
                        <button
                          type="button"
                          onClick={() => removeEmergencyContact(index)}
                          className="text-xs font-semibold text-rose-600 hover:text-rose-700"
                        >
                          Remover
                        </button>
                      </div>
                      <input
                        type="text"
                        value={contact.name || ""}
                        onChange={handleContactChange(index, "name")}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="Nome"
                        autoComplete="off"
                      />
                      <input
                        type="tel"
                        inputMode="tel"
                        value={contact.phone || ""}
                        onChange={handleContactPhoneChange(index)}
                        className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="Telefone"
                        autoComplete="tel"
                      />
                    </div>
                  ))}
                </div>
              )}
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

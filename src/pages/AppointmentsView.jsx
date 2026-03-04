import { useEffect, useMemo, useState } from "react";
import { APPOINTMENT_STATUSES } from "../constants/appointments";
import { appointmentsService } from "../services/api/appointments";
import { chargesService } from "../services/api/charges";
import usePatients from "../hooks/usePatients";

const EMPTY_FORM = {
  id: "",
  patientId: "",
  startTime: "",
  endTime: "",
};

const toInputDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const toDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const buildMonthDays = (anchorDate) => {
  const year = anchorDate.getFullYear();
  const month = anchorDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const mondayIndex = (firstDay.getDay() + 6) % 7;
  const totalDays = lastDay.getDate();
  const days = [];

  for (let i = 0; i < mondayIndex; i += 1) {
    days.push(null);
  }

  for (let day = 1; day <= totalDays; day += 1) {
    days.push(new Date(year, month, day));
  }

  while (days.length % 7 !== 0) {
    days.push(null);
  }

  return days;
};

const toTimeLabel = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildDefaultStartTime = (date) => {
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate()
  )}T09:00`;
};

const toDateOnly = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

export default function AppointmentsView() {
  const [appointments, setAppointments] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const { patients } = usePatients();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isPatientListOpen, setIsPatientListOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError("");
    try {
      const data = await appointmentsService.list();
      setAppointments(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar consultas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setPatientSearch("");
    setSelectedPatient(null);
    setIsPatientListOpen(false);
  };

  const handleEdit = (appointment) => {
    const foundPatient = patients.find(
      (patient) => String(patient.id) === String(appointment.patientId)
    );
    const fallbackPatient = appointment.patientId
      ? {
          id: appointment.patientId,
          name: `Paciente ${appointment.patientId}`,
          cpf: "",
        }
      : null;
    const nextPatient = foundPatient || fallbackPatient;
    if (nextPatient) {
      setSelectedPatient(nextPatient);
      setPatientSearch(nextPatient.name || nextPatient.fullName || "");
    }
    setForm({
      id: appointment.id || "",
      patientId: nextPatient ? nextPatient.id : appointment.patientId ?? "",
      startTime: toInputDateTime(appointment.startTime),
      endTime: toInputDateTime(appointment.endTime),
    });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedPatient || !form.patientId) {
      window.alert("Selecione um paciente valido.");
      return;
    }

    const payload = {
      patientId: form.patientId,
      startTime: toIso(form.startTime),
      endTime: toIso(form.endTime),
    };

    try {
      if (form.id) {
        await appointmentsService.update(form.id, payload);
      } else {
        await appointmentsService.create(payload);
      }
      resetForm();
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao salvar consulta.");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirmDelete = window.confirm("Deseja remover esta consulta?");
    if (!confirmDelete) return;
    setError("");
    try {
      await appointmentsService.remove(id);
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao remover consulta.");
    }
  };

  const updateStatus = async (appointment, nextStatus, extra = {}) => {
    setError("");
    try {
      await appointmentsService.update(appointment.id, {
        ...appointment,
        status: nextStatus,
        ...extra,
      });
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao atualizar status.");
    }
  };

  const handleConfirm = (appointment) =>
    updateStatus(appointment, "CONFIRMED");

  const handleComplete = (appointment) =>
    updateStatus(appointment, "COMPLETED", { completedAt: new Date().toISOString() });

  const handleNoShow = (appointment) =>
    updateStatus(appointment, "NO_SHOW");

  const handleCancel = (appointment) => {
    const reason = window.prompt("Motivo do cancelamento?");
    updateStatus(appointment, "CANCELLED", {
      cancelledAt: new Date().toISOString(),
      cancelledReason: reason || null,
    });
  };

  const handleReschedule = (appointment) => {
    const reason = window.prompt("Motivo do reagendamento?");
    updateStatus(appointment, "SCHEDULED", {
      rescheduledAt: new Date().toISOString(),
      rescheduleReason: reason || null,
    });
  };

  const handleGenerateCharge = async (appointment) => {
    setError("");
    try {
      await chargesService.create({
        appointmentId: appointment.id,
        patientId: appointment.patientId,
        originalAmount: appointment.sessionValue || 0,
        outstandingAmount: appointment.sessionValue || 0,
        status: "PENDING",
        dueDate: toDateOnly(appointment.startTime),
      });
      window.alert("Cobranca criada com sucesso.");
    } catch (err) {
      setError(err.message || "Erro ao gerar cobranca.");
    }
  };

  const statusLabel = useMemo(
    () =>
      APPOINTMENT_STATUSES.reduce((acc, status) => {
        acc[status] = status.replace("_", " ");
        return acc;
      }, {}),
    []
  );

  const monthDays = useMemo(() => buildMonthDays(currentMonth), [currentMonth]);

  const appointmentsByDate = useMemo(() => {
    return appointments.reduce((acc, appointment) => {
      const key = toDateKey(appointment.startTime);
      if (!key) return acc;
      if (!acc[key]) acc[key] = [];
      acc[key].push(appointment);
      return acc;
    }, {});
  }, [appointments]);

  const handleMonthChange = (delta) => {
    setCurrentMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + delta, 1)
    );
  };

  const handleSelectDate = (date) => {
    if (!date) return;
    setSelectedDate(date);
    setForm((current) => ({
      ...current,
      startTime: buildDefaultStartTime(date),
    }));
  };

  const filteredPatients = useMemo(() => {
    const term = patientSearch.trim().toLowerCase();
    if (!term) return patients;
    return patients.filter((patient) => {
      const name = (patient.name || patient.fullName || "").toLowerCase();
      const cpf = (patient.cpf || "").toLowerCase();
      return name.includes(term) || cpf.includes(term);
    });
  }, [patientSearch, patients]);

  const handlePatientSearch = (event) => {
    const { value } = event.target;
    setPatientSearch(value);
    setSelectedPatient(null);
    setForm((current) => ({ ...current, patientId: "" }));
    setIsPatientListOpen(true);
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name || patient.fullName || "");
    setForm((current) => ({ ...current, patientId: patient.id }));
    setIsPatientListOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Agenda
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Marcacao de consultas</h1>
          </header>

          <div className="space-y-6">
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-700">
                    {currentMonth.toLocaleDateString("pt-BR", {
                      month: "long",
                      year: "numeric",
                    })}
                  </p>
                  <p className="text-xs text-slate-500">Selecione um dia para marcar</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleMonthChange(-1)}
                    className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Mes anterior
                  </button>
                  <button
                    type="button"
                    onClick={() => handleMonthChange(1)}
                    className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Proximo mes
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-7 gap-2 text-xs font-semibold uppercase text-slate-400">
                {["Seg", "Ter", "Qua", "Qui", "Sex", "Sab", "Dom"].map((label) => (
                  <div key={label} className="text-center">
                    {label}
                  </div>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-7 gap-2">
                {monthDays.map((date, index) => {
                  if (!date) {
                    return <div key={`empty-${index}`} className="h-24 rounded-lg" />;
                  }
                  const dateKey = toDateKey(date);
                  const items = appointmentsByDate[dateKey] || [];
                  const isSelected =
                    selectedDate && toDateKey(selectedDate) === dateKey;

                  return (
                    <button
                      type="button"
                      key={dateKey}
                      onClick={() => handleSelectDate(date)}
                      className={`h-24 rounded-lg border px-2 py-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                        isSelected
                          ? "border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-semibold">
                        {date.getDate()}
                      </div>
                      <div className="mt-1 space-y-1">
                        {items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className={`truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              isSelected
                                ? "bg-white/20 text-white"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {toTimeLabel(item.startTime)} · Pac {item.patientId}
                          </div>
                        ))}
                        {items.length > 2 ? (
                          <div className="text-[11px] text-slate-400">
                            +{items.length - 2} mais
                          </div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
              <div className="relative">
                <label className="text-sm font-medium text-slate-700">Paciente</label>
                <input
                  type="text"
                  value={patientSearch}
                  onChange={handlePatientSearch}
                  onFocus={() => setIsPatientListOpen(true)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="Digite o nome ou CPF"
                />
                {isPatientListOpen ? (
                  <div className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                    {filteredPatients.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-slate-500">
                        Nenhum paciente encontrado.
                      </div>
                    ) : (
                      filteredPatients.map((patient) => (
                        <button
                          type="button"
                          key={patient.id}
                          onClick={() => handleSelectPatient(patient)}
                          className="flex w-full flex-col gap-1 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                        >
                          <span className="font-semibold text-slate-900">
                            {patient.name || patient.fullName || "Sem nome"}
                          </span>
                          <span className="text-xs text-slate-500">CPF {patient.cpf || "-"}</span>
                        </button>
                      ))
                    )}
                  </div>
                ) : null}
                {selectedPatient ? (
                  <div className="mt-2 text-xs text-slate-500">
                    Selecionado: {selectedPatient.name || selectedPatient.fullName}
                  </div>
                ) : null}
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Inicio</label>
                <input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={handleChange("startTime")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Fim</label>
                <input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={handleChange("endTime")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-3 focus:ring-slate-400"
              >
                {form.id ? "Atualizar consulta" : "Criar consulta"}
              </button>
              {form.id ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-400"
                >
                  Cancelar edicao
                </button>
              ) : null}
            </div>
            </form>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Consultas cadastradas
            </h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : (
              <div className="mt-3 space-y-4">
                {appointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className="rounded-xl border border-slate-200 p-4 shadow-sm"
                  >
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="text-base font-semibold text-slate-900">
                          Consulta #{appointment.id}
                        </p>
                      <p className="text-sm text-slate-500">
                          Paciente {appointment.patientId} | {formatDate(appointment.startTime)}
                        </p>
                      </div>
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                        {statusLabel[appointment.status] || appointment.status}
                      </span>
                    </div>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                      <span>Inicio: {formatDateTime(appointment.startTime)}</span>
                      <span>Fim: {formatDateTime(appointment.endTime)}</span>
                      <span>Atualizado: {formatDateTime(appointment.updatedAt)}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => handleEdit(appointment)}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleConfirm(appointment)}
                        className="inline-flex items-center rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-50"
                      >
                        Confirmar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleComplete(appointment)}
                        className="inline-flex items-center rounded-full border border-indigo-200 px-3 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-50"
                      >
                        Concluir
                      </button>
                      <button
                        type="button"
                        onClick={() => handleNoShow(appointment)}
                        className="inline-flex items-center rounded-full border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50"
                      >
                        Falta
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReschedule(appointment)}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Reagendar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleCancel(appointment)}
                        className="inline-flex items-center rounded-full border border-rose-200 px-3 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleGenerateCharge(appointment)}
                        className="inline-flex items-center rounded-full border border-slate-900 bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-700"
                      >
                        Gerar cobranca
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(appointment.id)}
                        className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50"
                      >
                        Remover
                      </button>
                    </div>
                  </div>
                ))}

                {appointments.length === 0 && !isLoading ? (
                  <p className="text-sm text-slate-500">
                    Nenhuma consulta cadastrada.
                  </p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

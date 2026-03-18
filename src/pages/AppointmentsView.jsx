import { useEffect, useMemo, useState } from "react";
import { APPOINTMENT_STATUSES } from "../constants/appointments";
import { appointmentSeriesService } from "../services/api/appointmentSeries";
import { appointmentsService } from "../services/api/appointments";
import { chargesService } from "../services/api/charges";
import usePatients from "../hooks/usePatients";
import { useAuth } from "../contexts/AuthContext";
import { showAlert, showConfirm } from "../utils/uiFeedback";

const CREATE_MODE_SINGLE = "SINGLE";
const CREATE_MODE_SERIES = "SERIES";

const EMPTY_FORM = {
  id: "",
  patientId: "",
  appointmentSeriesId: null,
  status: "SCHEDULED",
  appointmentDate: "",
  startTime: "",
  endTime: "",
  sessionValue: "",
};

const EMPTY_SERIES_FORM = {
  patientId: "",
  startDate: "",
  startTime: "",
  endTime: "",
  appointmentCount: "",
  intervalDays: "7",
  sessionValue: "",
};

const SERIES_STATUS_LABELS = {
  ACTIVE: "Ativo",
  COMPLETED: "Concluido",
  CANCELLED: "Cancelado",
};

const toInputDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const year = date.getFullYear();
  const month = pad(date.getMonth() + 1);
  const day = pad(date.getDate());
  return `${year}-${month}-${day}`;
};

const toInputTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (num) => String(num).padStart(2, "0");
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  return `${hours}:${minutes}`;
};

const mergeDateAndTimeToIso = (dateValue, timeValue) => {
  if (!dateValue || !timeValue) return null;
  const date = new Date(`${dateValue}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const isStartBeforeEnd = (dateValue, startTime, endTime) => {
  const start = mergeDateAndTimeToIso(dateValue, startTime);
  const end = mergeDateAndTimeToIso(dateValue, endTime);
  if (!start || !end) return false;
  return new Date(start).getTime() < new Date(end).getTime();
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

const buildDefaultAppointmentDate = (date) => {
  const pad = (num) => String(num).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const addOneHourToTime = (appointmentDate, timeValue) => {
  if (!appointmentDate || !timeValue) return "";
  const date = new Date(`${appointmentDate}T${timeValue}`);
  if (Number.isNaN(date.getTime())) return "";
  date.setHours(date.getHours() + 1);
  const pad = (num) => String(num).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const addDaysToDate = (dateValue, daysToAdd) => {
  const date = new Date(`${dateValue}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "";
  date.setDate(date.getDate() + daysToAdd);
  return buildDefaultAppointmentDate(date);
};

const toInputValue = (value) => {
  if (value === null || value === undefined || value === "") return "";
  return String(value);
};

const getFirstName = (fullName) => {
  if (!fullName) return "Paciente";
  const [firstName] = String(fullName).trim().split(/\s+/);
  return firstName || "Paciente";
};

const getStatusColorClasses = (status) => {
  switch (status) {
    case "CONFIRMED":
      return {
        calendar: "bg-emerald-100 text-emerald-800",
        card: "border-emerald-200 bg-emerald-50",
      };
    case "COMPLETED":
      return {
        calendar: "bg-emerald-300 text-emerald-900",
        card: "border-emerald-400 bg-emerald-100",
      };
    case "CANCELLED":
      return {
        calendar: "bg-rose-200 text-rose-900",
        card: "border-rose-300 bg-rose-50",
      };
    case "NO_SHOW":
      return {
        calendar: "bg-rose-700 text-rose-50",
        card: "border-rose-800 bg-rose-100",
      };
    case "SCHEDULED":
    default:
      return {
        calendar: "bg-white text-slate-700 border border-slate-200",
        card: "border-slate-200 bg-white",
      };
  }
};

const mergeAppointmentsFromSources = (appointmentsData, seriesData) => {
  const mergedById = new Map();

  if (Array.isArray(appointmentsData)) {
    appointmentsData.forEach((appointment) => {
      if (!appointment?.id) return;
      mergedById.set(String(appointment.id), appointment);
    });
  }

  if (Array.isArray(seriesData)) {
    seriesData.forEach((series) => {
      if (!Array.isArray(series?.appointments)) return;
      series.appointments.forEach((appointment) => {
        if (!appointment?.id) return;
        const id = String(appointment.id);
        const nextAppointment = {
          ...appointment,
          appointmentSeriesId: appointment.appointmentSeriesId ?? series.id ?? null,
        };
        if (!mergedById.has(id)) {
          mergedById.set(id, nextAppointment);
          return;
        }
        mergedById.set(id, { ...mergedById.get(id), ...nextAppointment });
      });
    });
  }

  return [...mergedById.values()];
};

const buildSeriesPreview = (seriesForm) => {
  const count = Number(seriesForm.appointmentCount);
  const interval = Number(seriesForm.intervalDays);

  if (!seriesForm.startDate || !seriesForm.startTime || !seriesForm.endTime) {
    return [];
  }

  if (Number.isNaN(count) || count < 1) return [];
  if (Number.isNaN(interval) || interval < 1) return [];

  return Array.from({ length: count }).map((_, index) => ({
    appointmentDate: addDaysToDate(seriesForm.startDate, interval * index),
    startTime: seriesForm.startTime,
    endTime: seriesForm.endTime,
    status: "SCHEDULED",
    sessionValue: seriesForm.sessionValue,
  }));
};

export default function AppointmentsView() {
  const [appointments, setAppointments] = useState([]);
  const [appointmentSeries, setAppointmentSeries] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [seriesForm, setSeriesForm] = useState(EMPTY_SERIES_FORM);
  const [seriesAppointments, setSeriesAppointments] = useState([]);
  const [createMode, setCreateMode] = useState(CREATE_MODE_SINGLE);
  const [isCreateTypeOpen, setIsCreateTypeOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isSeriesDetailOpen, setIsSeriesDetailOpen] = useState(false);
  const [selectedSeriesDetail, setSelectedSeriesDetail] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSeriesDetail, setIsLoadingSeriesDetail] = useState(false);
  const [error, setError] = useState("");
  const { patients } = usePatients();
  const { user } = useAuth();
  const [patientSearch, setPatientSearch] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [isPatientListOpen, setIsPatientListOpen] = useState(false);
  const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
  const [rescheduleAppointment, setRescheduleAppointment] = useState(null);
  const [rescheduleReason, setRescheduleReason] = useState("");
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState(null);

  const loadAppointments = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [appointmentsData, seriesData] = await Promise.all([
        appointmentsService.list(),
        appointmentSeriesService.list(),
      ]);
      const parsedAppointments = Array.isArray(appointmentsData) ? appointmentsData : [];
      const parsedSeries = Array.isArray(seriesData) ? seriesData : [];
      setAppointmentSeries(parsedSeries);
      setAppointments(mergeAppointmentsFromSources(parsedAppointments, parsedSeries));
    } catch (err) {
      setError(err.message || "Erro ao carregar consultas.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAppointments();
  }, []);

  useEffect(() => {
    if (!isFormOpen || createMode !== CREATE_MODE_SERIES) return;
    setSeriesAppointments(buildSeriesPreview(seriesForm));
  }, [isFormOpen, createMode, seriesForm]);

  const handleChange = (field) => (event) => {
    const { value } = event.target;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSeriesFormChange = (field) => (event) => {
    const { value } = event.target;
    setSeriesForm((current) => ({ ...current, [field]: value }));
  };

  const handleStartTimeChange = (event) => {
    const { value } = event.target;
    setForm((current) => ({
      ...current,
      startTime: value,
      endTime: value ? addOneHourToTime(current.appointmentDate, value) : "",
    }));
  };

  const handleSeriesStartTimeChange = (event) => {
    const { value } = event.target;
    setSeriesForm((current) => ({
      ...current,
      startTime: value,
      endTime: value ? addOneHourToTime(current.startDate, value) : "",
    }));
  };

  const buildCreateForm = (appointmentDate = "") => ({
    ...EMPTY_FORM,
    appointmentDate,
    startTime: appointmentDate ? "09:00" : "",
    endTime: appointmentDate ? addOneHourToTime(appointmentDate, "09:00") : "",
    sessionValue: toInputValue(user?.defaultSessionValue),
  });

  const buildCreateSeriesForm = (startDate = "") => ({
    ...EMPTY_SERIES_FORM,
    startDate,
    startTime: startDate ? "09:00" : "",
    endTime: startDate ? addOneHourToTime(startDate, "09:00") : "",
    appointmentCount: "1",
    sessionValue: toInputValue(user?.defaultSessionValue),
  });

  const openCreateMode = (mode) => {
    const nextDate = selectedDate ? buildDefaultAppointmentDate(selectedDate) : "";
    setCreateMode(mode);
    setForm(buildCreateForm(nextDate));
    setSeriesForm(buildCreateSeriesForm(nextDate));
    setSeriesAppointments([]);
    setPatientSearch("");
    setSelectedPatient(null);
    setIsPatientListOpen(false);
    setIsCreateTypeOpen(false);
    setIsFormOpen(true);
  };

  const resetForm = () => {
    setCreateMode(CREATE_MODE_SINGLE);
    setForm(EMPTY_FORM);
    setSeriesForm(EMPTY_SERIES_FORM);
    setSeriesAppointments([]);
    setPatientSearch("");
    setSelectedPatient(null);
    setIsPatientListOpen(false);
    setIsCreateTypeOpen(false);
    setIsFormOpen(false);
  };

  const handleEdit = (appointment) => {
    const foundPatient = patients.find(
      (patient) => String(patient.id) === String(appointment.patientId)
    );
    const fallbackPatient = appointment.patientId
      ? {
          id: appointment.patientId,
          name: "Paciente sem cadastro",
          cpf: "",
        }
      : null;
    const nextPatient = foundPatient || fallbackPatient;
    if (nextPatient) {
      setSelectedPatient(nextPatient);
      setPatientSearch(nextPatient.name || nextPatient.fullName || "");
    }
    setCreateMode(CREATE_MODE_SINGLE);
    setIsCreateTypeOpen(false);
    setForm({
      id: appointment.id || "",
      patientId: nextPatient ? nextPatient.id : appointment.patientId ?? "",
      appointmentSeriesId: appointment.appointmentSeriesId ?? null,
      status: appointment.status || "SCHEDULED",
      appointmentDate: toInputDate(appointment.startTime),
      startTime: toInputTime(appointment.startTime),
      endTime: toInputTime(appointment.endTime),
      sessionValue: toInputValue(appointment.sessionValue),
    });
    setIsFormOpen(true);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedPatient || !form.patientId) {
      showAlert("Selecione um paciente valido.");
      return;
    }

    if (!form.appointmentDate || !form.startTime || !form.endTime) {
      showAlert("Preencha data, inicio e fim da consulta.");
      return;
    }

    if (form.sessionValue === "") {
      showAlert("O valor da sessao e obrigatorio.");
      return;
    }

    if (!isStartBeforeEnd(form.appointmentDate, form.startTime, form.endTime)) {
      showAlert("O horario de inicio precisa ser menor que o horario de fim.");
      return;
    }

    const parsedPatientId = Number(form.patientId);
    const parsedSessionValue = Number(form.sessionValue);

    if (Number.isNaN(parsedPatientId)) {
      showAlert("Selecione um paciente valido.");
      return;
    }

    if (Number.isNaN(parsedSessionValue) || parsedSessionValue <= 0) {
      showAlert("Informe um valor de sessao valido e maior que zero.");
      return;
    }

    const startTime = mergeDateAndTimeToIso(form.appointmentDate, form.startTime);
    const endTime = mergeDateAndTimeToIso(form.appointmentDate, form.endTime);

    if (!startTime || !endTime) {
      showAlert("Nao foi possivel validar a data e horario da consulta.");
      return;
    }

    const payload = {
      status: form.status || "SCHEDULED",
      startTime,
      endTime,
      sessionValue: parsedSessionValue,
    };

    try {
      if (form.id) {
        await appointmentsService.update(form.id, payload);
      } else {
        await appointmentsService.create({
          ...payload,
          patientId: parsedPatientId,
        });
      }
      resetForm();
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao salvar consulta.");
    }
  };

  const handleSeriesSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedPatient || !seriesForm.patientId) {
      showAlert("Selecione um paciente valido.");
      return;
    }

    const parsedPatientId = Number(seriesForm.patientId);
    const parsedCount = Number(seriesForm.appointmentCount);
    const parsedInterval = Number(seriesForm.intervalDays);

    if (Number.isNaN(parsedPatientId)) {
      showAlert("Selecione um paciente valido.");
      return;
    }

    if (Number.isNaN(parsedCount) || parsedCount < 1) {
      showAlert("A quantidade de consultas deve ser maior que zero.");
      return;
    }

    if (Number.isNaN(parsedInterval) || parsedInterval < 1) {
      showAlert("O intervalo entre consultas deve ser de pelo menos 1 dia.");
      return;
    }

    if (seriesAppointments.length === 0) {
      showAlert("Informe os dados do plano para gerar ao menos uma consulta.");
      return;
    }

    const duplicatedTimeKeys = new Set();
    const appointmentsPayload = [];

    for (let index = 0; index < seriesAppointments.length; index += 1) {
      const item = seriesAppointments[index];
      const itemPosition = index + 1;
      const parsedSessionValue = Number(item.sessionValue);

      if (!item.appointmentDate || !item.startTime || !item.endTime) {
        showAlert(`Preencha data, inicio e fim da consulta ${itemPosition}.`);
        return;
      }

      if (!isStartBeforeEnd(item.appointmentDate, item.startTime, item.endTime)) {
        showAlert(`O inicio da consulta ${itemPosition} precisa ser menor que o fim.`);
        return;
      }

      if (Number.isNaN(parsedSessionValue) || parsedSessionValue <= 0) {
        showAlert(`Informe um valor valido e maior que zero na consulta ${itemPosition}.`);
        return;
      }

      const startTime = mergeDateAndTimeToIso(item.appointmentDate, item.startTime);
      const endTime = mergeDateAndTimeToIso(item.appointmentDate, item.endTime);
      if (!startTime || !endTime) {
        showAlert(`Nao foi possivel validar data e horario da consulta ${itemPosition}.`);
        return;
      }

      const duplicateKey = `${startTime}|${endTime}`;
      if (duplicatedTimeKeys.has(duplicateKey)) {
        showAlert("Existem consultas duplicadas no plano. Ajuste os horarios.");
        return;
      }
      duplicatedTimeKeys.add(duplicateKey);

      appointmentsPayload.push({
        startTime,
        endTime,
        status: item.status || "SCHEDULED",
        sessionValue: parsedSessionValue,
      });
    }

    try {
      const createdSeries = await appointmentSeriesService.create({
        appointmentSeries: {
          patientId: parsedPatientId,
          status: "ACTIVE",
        },
        appointments: appointmentsPayload,
      });

      const firstCreatedDate = toInputDate(createdSeries?.appointments?.[0]?.startTime);
      if (firstCreatedDate) {
        setSelectedDate(new Date(`${firstCreatedDate}T00:00:00`));
      }
      resetForm();
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao salvar plano de consultas.");
    }
  };

  const handleDelete = async (id) => {
    if (!id) return;
    const confirmDelete = await showConfirm("Deseja remover esta consulta?");
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
    const payload = {
      status: nextStatus,
      startTime: appointment.startTime,
      endTime: appointment.endTime,
      sessionValue: Number(appointment.sessionValue),
      ...extra,
    };

    try {
      await appointmentsService.update(appointment.id, payload);
      await loadAppointments();
    } catch (err) {
      setError(err.message || "Erro ao atualizar status.");
    }
  };

  const handleReschedule = (appointment) => {
    setRescheduleAppointment(appointment);
    setRescheduleReason("");
    setIsRescheduleModalOpen(true);
  };

  const closeRescheduleModal = () => {
    setIsRescheduleModalOpen(false);
    setRescheduleAppointment(null);
    setRescheduleReason("");
  };

  const handleRescheduleSubmit = (event) => {
    event.preventDefault();
    if (!rescheduleAppointment) return;

    updateStatus(rescheduleAppointment, "SCHEDULED", {
      rescheduledAt: new Date().toISOString(),
      rescheduleReason: rescheduleReason.trim() || null,
    });
    closeRescheduleModal();
  };

  const handleGenerateCharge = async (appointment) => {
    setError("");
    try {
      await chargesService.create({
        appointmentId: appointment.id,
      });
      showAlert("Cobranca criada com sucesso.");
    } catch (err) {
      setError(err.message || "Erro ao gerar cobranca.");
    }
  };

  const handleOpenSeriesDetails = async (seriesId) => {
    if (!seriesId) return;
    setIsSeriesDetailOpen(true);
    setSelectedSeriesDetail(null);
    setIsLoadingSeriesDetail(true);
    try {
      const detail = await appointmentSeriesService.getById(seriesId);
      setSelectedSeriesDetail(detail || null);
    } catch {
      // erro tratado globalmente no apiClient
      setIsSeriesDetailOpen(false);
    } finally {
      setIsLoadingSeriesDetail(false);
    }
  };

  const closeSeriesDetails = () => {
    setIsSeriesDetailOpen(false);
    setSelectedSeriesDetail(null);
    setIsLoadingSeriesDetail(false);
  };

  const statusLabel = useMemo(
    () => ({
      SCHEDULED: "Agendado",
      CONFIRMED: "Confirmado",
      COMPLETED: "Completado",
      CANCELLED: "Cancelado",
      NO_SHOW: "Falta",
    }),
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
    if (isFormOpen && createMode === CREATE_MODE_SINGLE && !form.id) {
      const nextDate = buildDefaultAppointmentDate(date);
      setForm((current) => ({
        ...current,
        appointmentDate: nextDate,
        startTime: current.startTime || "09:00",
        endTime: addOneHourToTime(nextDate, current.startTime || "09:00"),
      }));
    }

    if (isFormOpen && createMode === CREATE_MODE_SERIES) {
      const nextDate = buildDefaultAppointmentDate(date);
      setSeriesForm((current) => ({
        ...current,
        startDate: nextDate,
        startTime: current.startTime || "09:00",
        endTime: addOneHourToTime(nextDate, current.startTime || "09:00"),
      }));
    }
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
    if (createMode === CREATE_MODE_SERIES) {
      setSeriesForm((current) => ({ ...current, patientId: "" }));
    } else {
      setForm((current) => ({ ...current, patientId: "" }));
    }
    setIsPatientListOpen(true);
  };

  const handleSelectPatient = (patient) => {
    setSelectedPatient(patient);
    setPatientSearch(patient.name || patient.fullName || "");
    if (createMode === CREATE_MODE_SERIES) {
      setSeriesForm((current) => ({ ...current, patientId: patient.id }));
    } else {
      setForm((current) => ({ ...current, patientId: patient.id }));
    }
    setIsPatientListOpen(false);
  };

  const handleSeriesItemChange = (index, field) => (event) => {
    const { value } = event.target;
    setSeriesAppointments((current) => {
      return current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      );
    });
  };

  const patientNameById = useMemo(() => {
    return new Map(
      patients.map((patient) => [String(patient.id), patient.name || patient.fullName || "Paciente"])
    );
  }, [patients]);

  const selectedDateAppointments = useMemo(() => {
    if (!selectedDate) return [];
    const selectedKey = toDateKey(selectedDate);
    const items = appointmentsByDate[selectedKey] || [];
    return [...items].sort(
      (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [selectedDate, appointmentsByDate]);

  const sortedAppointmentSeries = useMemo(() => {
    return [...appointmentSeries].sort(
      (a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
    );
  }, [appointmentSeries]);

  const getAppointmentPatientName = (appointment) => {
    return (
      appointment.patientName ||
      appointment.patient?.name ||
      appointment.patient?.fullName ||
      patientNameById.get(String(appointment.patientId)) ||
      "Paciente"
    );
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
                  const isSelected = selectedDate && toDateKey(selectedDate) === dateKey;

                  return (
                    <button
                      type="button"
                      key={dateKey}
                      onClick={() => handleSelectDate(date)}
                      className={`calendar-day-button h-24 rounded-lg border px-2 py-2 text-left text-xs transition focus:outline-none focus:ring-2 focus:ring-slate-400 ${
                        isSelected
                          ? "calendar-day-button-selected border-slate-900 bg-slate-900 text-white"
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <div className="text-sm font-semibold">{date.getDate()}</div>
                      <div className="mt-1 space-y-1">
                        {items.slice(0, 2).map((item) => (
                          <div
                            key={item.id}
                            className={`calendar-event-chip truncate rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              getStatusColorClasses(item.status).calendar
                            }`}
                          >
                            {toTimeLabel(item.startTime)} - {getFirstName(getAppointmentPatientName(item))}
                          </div>
                        ))}
                        {items.length > 2 ? (
                          <div className="text-[11px] text-slate-400">+{items.length - 2} mais</div>
                        ) : null}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {!isFormOpen ? (
              <div className="space-y-3">
                {!isCreateTypeOpen ? (
                  <button
                    type="button"
                    onClick={() => setIsCreateTypeOpen(true)}
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-3 focus:ring-slate-400"
                  >
                    Cadastrar consulta
                  </button>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => openCreateMode(CREATE_MODE_SINGLE)}
                      className="appointment-option-card rounded-lg border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">Consulta unica</p>
                      <p className="mt-1 text-xs text-slate-500">Fluxo tradicional de cadastro</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => openCreateMode(CREATE_MODE_SERIES)}
                      className="appointment-option-card rounded-lg border border-slate-200 bg-white p-4 text-left hover:bg-slate-50"
                    >
                      <p className="text-sm font-semibold text-slate-900">Plano de consultas</p>
                      <p className="mt-1 text-xs text-slate-500">Gera varias consultas com intervalo fixo</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCreateTypeOpen(false)}
                      className="sm:col-span-2 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                    >
                      Cancelar
                    </button>
                  </div>
                )}
              </div>
            ) : createMode === CREATE_MODE_SINGLE ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="relative">
                    <label className="text-sm font-medium text-slate-700">
                      Paciente <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={handlePatientSearch}
                      onFocus={() => setIsPatientListOpen(true)}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                      placeholder="Digite o nome ou CPF"
                      required
                    />
                    {isPatientListOpen ? (
                      <div className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredPatients.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">Nenhum paciente encontrado.</div>
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
                    <label className="text-sm font-medium text-slate-700">
                      Data <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="date"
                      value={form.appointmentDate}
                      onChange={handleChange("appointmentDate")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Inicio <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.startTime}
                      onChange={handleStartTimeChange}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Fim <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="time"
                      value={form.endTime}
                      onChange={handleChange("endTime")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-slate-700">
                      Valor da sessao <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={form.sessionValue}
                      onChange={handleChange("sessionValue")}
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-3 focus:ring-slate-400"
                  >
                    {form.id ? "Salvar alteracoes" : "Salvar consulta"}
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSeriesSubmit} className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    Cabecalho do plano
                  </p>
                  <div className="mt-3 grid gap-4 sm:grid-cols-2">
                    <div className="relative">
                      <label className="text-sm font-medium text-slate-700">
                        Paciente <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="text"
                        value={patientSearch}
                        onChange={handlePatientSearch}
                        onFocus={() => setIsPatientListOpen(true)}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        placeholder="Digite o nome ou CPF"
                        required
                      />
                      {isPatientListOpen ? (
                        <div className="absolute z-10 mt-2 max-h-56 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                          {filteredPatients.length === 0 ? (
                            <div className="px-3 py-2 text-sm text-slate-500">Nenhum paciente encontrado.</div>
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
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Data da primeira consulta <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        value={seriesForm.startDate}
                        onChange={handleSeriesFormChange("startDate")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Inicio <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={seriesForm.startTime}
                        onChange={handleSeriesStartTimeChange}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Fim <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="time"
                        value={seriesForm.endTime}
                        onChange={handleSeriesFormChange("endTime")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Quantidade de consultas <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={seriesForm.appointmentCount}
                        onChange={handleSeriesFormChange("appointmentCount")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-slate-700">
                        Intervalo entre consultas (dias) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={seriesForm.intervalDays}
                        onChange={handleSeriesFormChange("intervalDays")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium text-slate-700">
                        Valor do plano (por consulta) <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={seriesForm.sessionValue}
                        onChange={handleSeriesFormChange("sessionValue")}
                        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                        required
                      />
                    </div>
                  </div>
                  {selectedPatient ? (
                    <p className="mt-3 text-xs text-slate-500">
                      Paciente selecionado para todas as consultas: {selectedPatient.name || selectedPatient.fullName}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-lg border border-slate-200 bg-white p-4">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Preview das consultas
                    </p>
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                      {seriesAppointments.length} itens
                    </span>
                  </div>

                  {seriesAppointments.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Preencha o cabecalho para gerar automaticamente a lista de consultas.
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {seriesAppointments.map((item, index) => (
                        <div key={`${item.appointmentDate}-${index}`} className="rounded-lg border border-slate-200 p-3">
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Consulta {index + 1}
                          </p>
                          <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
                            <div>
                              <label className="text-xs font-medium text-slate-600">Data</label>
                              <input
                                type="date"
                                value={item.appointmentDate}
                                onChange={handleSeriesItemChange(index, "appointmentDate")}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600">Inicio</label>
                              <input
                                type="time"
                                value={item.startTime}
                                onChange={handleSeriesItemChange(index, "startTime")}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600">Fim</label>
                              <input
                                type="time"
                                value={item.endTime}
                                onChange={handleSeriesItemChange(index, "endTime")}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                required
                              />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600">Status</label>
                              <select
                                value={item.status || "SCHEDULED"}
                                onChange={handleSeriesItemChange(index, "status")}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                              >
                                {APPOINTMENT_STATUSES.map((status) => (
                                  <option key={`${status}-${index}`} value={status}>
                                    {statusLabel[status] || status}
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-xs font-medium text-slate-600">Valor</label>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={item.sessionValue}
                                onChange={handleSeriesItemChange(index, "sessionValue")}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-2 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                                required
                              />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700 focus:outline-none focus:ring-3 focus:ring-slate-400"
                  >
                    Salvar plano
                  </button>
                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 focus:outline-none focus:ring-3 focus:ring-slate-400"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Planos de consultas
            </h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : sortedAppointmentSeries.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">Nenhum plano cadastrado.</p>
            ) : (
              <div className="mt-3 space-y-3">
                {sortedAppointmentSeries.map((series) => {
                  const patientName = patientNameById.get(String(series.patientId)) || "Paciente";
                  const appointmentsCount = Array.isArray(series.appointments)
                    ? series.appointments.length
                    : 0;
                  return (
                    <div key={series.id} className="rounded-lg border border-slate-200 bg-white p-4">
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{patientName}</p>
                          <p className="text-xs text-slate-500">
                            {appointmentsCount} consultas • {SERIES_STATUS_LABELS[series.status] || series.status}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleOpenSeriesDetails(series.id)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                        >
                          Ver detalhes
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="mt-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Consultas cadastradas
            </h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : !selectedDate ? (
              <p className="mt-3 text-sm text-slate-500">Selecione um dia no calendario para ver as consultas.</p>
            ) : (
              <div className="mt-3 space-y-4">
                {selectedDateAppointments.map((appointment) => (
                  <div
                    key={appointment.id}
                    className={`rounded-xl border p-4 shadow-sm ${getStatusColorClasses(appointment.status).card}`}
                  >
                    {(() => {
                      const patientName = getAppointmentPatientName(appointment);
                      const firstName = getFirstName(patientName);
                      const cardTitle = `${toTimeLabel(appointment.startTime)} - ${formatDate(
                        appointment.startTime
                      )} ${firstName}`;

                      return (
                        <>
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-base font-semibold text-slate-900">{cardTitle}</p>
                              <p className="text-sm text-slate-500">{patientName}</p>
                              {appointment.appointmentSeriesId ? (
                                <p className="text-xs text-slate-500">Consulta vinculada a plano</p>
                              ) : null}
                            </div>
                          </div>
                          <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                            <span>Inicio: {formatDateTime(appointment.startTime)}</span>
                            <span>Fim: {formatDateTime(appointment.endTime)}</span>
                            <span>Atualizado: {formatDateTime(appointment.updatedAt)}</span>
                          </div>
                          <div className="mt-4 flex items-end justify-between gap-3">
                            <div className="min-w-40">
                              <label className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                                Status
                              </label>
                              <select
                                value={appointment.status || "SCHEDULED"}
                                onChange={(event) => updateStatus(appointment, event.target.value)}
                                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
                              >
                                {APPOINTMENT_STATUSES.map((status) => (
                                  <option key={status} value={status}>
                                    {statusLabel[status] || status}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <details className="relative">
                              <summary className="cursor-pointer list-none rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50">
                                Opcoes
                              </summary>
                              <div className="absolute right-0 z-10 mt-2 w-44 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                                <button
                                  type="button"
                                  onClick={() => handleEdit(appointment)}
                                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Editar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleReschedule(appointment)}
                                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Reagendar
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleGenerateCharge(appointment)}
                                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50"
                                >
                                  Gerar cobranca
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDelete(appointment.id)}
                                  className="w-full rounded-md px-3 py-2 text-left text-xs font-semibold text-rose-700 hover:bg-rose-50"
                                >
                                  Remover
                                </button>
                              </div>
                            </details>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                ))}

                {selectedDateAppointments.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma consulta cadastrada para este dia.</p>
                ) : null}
              </div>
            )}
          </div>
        </div>
      </div>

      {isRescheduleModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Reagendar consulta</h3>
            <p className="mt-1 text-sm text-slate-500">Informe o motivo do reagendamento.</p>

            <form onSubmit={handleRescheduleSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Motivo (opcional)</label>
                <textarea
                  rows={3}
                  value={rescheduleReason}
                  onChange={(event) => setRescheduleReason(event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={closeRescheduleModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Confirmar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isSeriesDetailOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Detalhes do plano</h3>
            {isLoadingSeriesDetail ? (
              <p className="mt-3 text-sm text-slate-500">Carregando...</p>
            ) : !selectedSeriesDetail ? (
              <p className="mt-3 text-sm text-slate-500">Nao foi possivel carregar os detalhes.</p>
            ) : (
              <>
                <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                  <p className="text-sm font-semibold text-slate-800">
                    Paciente: {patientNameById.get(String(selectedSeriesDetail.patientId)) || "Paciente"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Status: {SERIES_STATUS_LABELS[selectedSeriesDetail.status] || selectedSeriesDetail.status}
                  </p>
                </div>
                <div className="mt-4 max-h-80 space-y-2 overflow-auto pr-1">
                  {(selectedSeriesDetail.appointments || []).map((appointment, index) => (
                    <div key={appointment.id || index} className="rounded-lg border border-slate-200 p-3">
                      <p className="text-sm font-semibold text-slate-900">
                        Consulta {index + 1} - {formatDateTime(appointment.startTime)}
                      </p>
                      <p className="text-xs text-slate-500">
                        Fim: {formatDateTime(appointment.endTime)} • {statusLabel[appointment.status] || appointment.status}
                      </p>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={closeSeriesDetails}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

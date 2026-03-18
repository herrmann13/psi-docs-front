import { useEffect, useMemo, useRef, useState } from "react";
import { CHARGE_STATUSES } from "../constants/charges";
import { PAYMENT_METHODS } from "../constants/payments";
import { appointmentSeriesService } from "../services/api/appointmentSeries";
import { chargesService } from "../services/api/charges";
import { appointmentsService } from "../services/api/appointments";
import usePatients from "../hooks/usePatients";
import { showAlert } from "../utils/uiFeedback";

const EMPTY_MANUAL_CHARGE = {
  appointmentId: "",
  originalAmount: "",
};

const EMPTY_PAYMENT = {
  chargeId: "",
  amountPaid: "",
  paymentMethod: "PIX",
  paymentDate: "",
  notes: "",
};

const EMPTY_EDIT_CHARGE = {
  chargeId: "",
  originalAmount: "",
};

const EMPTY_PLAN_PAYMENT = {
  paymentMethod: "PIX",
  paymentDate: "",
  notes: "",
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

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const toIso = (value) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

const formatCurrency = (value) => {
  const numeric = Number(value) || 0;
  return numeric.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("pt-BR");
};

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

const formatTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getChargeStatusLabel = (status) => {
  const labels = {
    PENDING: "Pendente",
    PARTIALLY_PAID: "Parcial",
    PAID: "Pago",
    CANCELLED: "Cancelada",
  };
  return labels[status] || status;
};

const getChargeCardClasses = (status) => {
  switch (status) {
    case "PAID":
      return "border-emerald-200 bg-emerald-50";
    case "PARTIALLY_PAID":
      return "border-amber-200 bg-amber-50";
    case "CANCELLED":
      return "border-rose-200 bg-rose-50";
    case "PENDING":
    default:
      return "border-slate-200 bg-white";
  }
};

export default function FinanceView() {
  const appointmentSelectorRef = useRef(null);
  const [charges, setCharges] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [manualChargeForm, setManualChargeForm] = useState(EMPTY_MANUAL_CHARGE);
  const [appointmentSearch, setAppointmentSearch] = useState("");
  const [isAppointmentListOpen, setIsAppointmentListOpen] = useState(false);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [planPaymentForm, setPlanPaymentForm] = useState(EMPTY_PLAN_PAYMENT);
  const [editChargeForm, setEditChargeForm] = useState(EMPTY_EDIT_CHARGE);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isPlanPaymentModalOpen, setIsPlanPaymentModalOpen] = useState(false);
  const [selectedPlanSeriesId, setSelectedPlanSeriesId] = useState(null);
  const [selectedPlanChargeIds, setSelectedPlanChargeIds] = useState([]);
  const [isSavingPlanPayment, setIsSavingPlanPayment] = useState(false);
  const [isEditChargeModalOpen, setIsEditChargeModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isDeletingCharge, setIsDeletingCharge] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { patients } = usePatients();

  const loadFinancialData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [chargesData, appointmentsData, seriesData] = await Promise.all([
        chargesService.list(),
        appointmentsService.list(),
        appointmentSeriesService.list(),
      ]);
      setCharges(Array.isArray(chargesData) ? chargesData : []);
      setAppointments(
        mergeAppointmentsFromSources(
          Array.isArray(appointmentsData) ? appointmentsData : [],
          Array.isArray(seriesData) ? seriesData : []
        )
      );
    } catch (err) {
      setError(err.message || "Erro ao carregar financeiro.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!isAppointmentListOpen) return;
      if (
        appointmentSelectorRef.current &&
        !appointmentSelectorRef.current.contains(event.target)
      ) {
        setIsAppointmentListOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isAppointmentListOpen]);

  const appointmentById = useMemo(
    () => new Map(appointments.map((appointment) => [String(appointment.id), appointment])),
    [appointments]
  );

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [String(patient.id), patient])),
    [patients]
  );

  const resolveAppointmentSeriesId = (charge) => {
    const appointment = appointmentById.get(String(charge?.appointmentId));
    return appointment?.appointmentSeriesId || null;
  };

  const planPaymentCharges = useMemo(() => {
    if (!selectedPlanSeriesId) return [];
    return charges
      .filter((charge) => {
        const appointment = appointmentById.get(String(charge.appointmentId));
        const sameSeries =
          String(appointment?.appointmentSeriesId || "") === String(selectedPlanSeriesId);
        const canPay = charge.status === "PENDING" || charge.status === "PARTIALLY_PAID";
        return sameSeries && canPay;
      })
      .sort((a, b) => {
        const appointmentA = appointmentById.get(String(a.appointmentId));
        const appointmentB = appointmentById.get(String(b.appointmentId));
        return new Date(appointmentA?.startTime || 0).getTime() - new Date(appointmentB?.startTime || 0).getTime();
      });
  }, [charges, appointmentById, selectedPlanSeriesId]);

  const selectedPlanCharges = useMemo(() => {
    const selectedSet = new Set(selectedPlanChargeIds.map(String));
    return planPaymentCharges.filter((charge) => selectedSet.has(String(charge.id)));
  }, [planPaymentCharges, selectedPlanChargeIds]);

  const selectedPlanTotal = useMemo(() => {
    return selectedPlanCharges.reduce((acc, charge) => {
      return acc + (Number(charge.outstandingAmount) || 0);
    }, 0);
  }, [selectedPlanCharges]);

  const resolvePatientName = (charge) => {
    const appointment = appointmentById.get(String(charge.appointmentId));
    const patientId = appointment?.patientId ?? charge.patientId;
    const patient = patientById.get(String(patientId));
    return patient?.name || patient?.fullName || `Paciente ${patientId ?? "-"}`;
  };

  const getAppointmentPatientName = (appointment) => {
    const patient = patientById.get(String(appointment?.patientId));
    return patient?.name || patient?.fullName || "Paciente";
  };

  const formatAppointmentOptionLabel = (appointment) => {
    return `Atendimento ${formatDate(appointment?.startTime)} - ${formatTime(
      appointment?.startTime
    )} • ${getAppointmentPatientName(appointment)}`;
  };

  const selectedManualAppointment = useMemo(() => {
    if (!manualChargeForm.appointmentId) return null;
    return (
      appointments.find(
        (appointment) => String(appointment.id) === String(manualChargeForm.appointmentId)
      ) || null
    );
  }, [appointments, manualChargeForm.appointmentId]);

  const isSameMonth = (value, monthRef) => {
    if (!value) return false;
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return false;
    return (
      date.getFullYear() === monthRef.getFullYear() &&
      date.getMonth() === monthRef.getMonth()
    );
  };

  const chargesInSelectedMonth = useMemo(() => {
    return charges.filter((charge) => {
      const appointment = appointmentById.get(String(charge.appointmentId));
      return isSameMonth(appointment?.startTime, selectedMonth);
    });
  }, [charges, appointmentById, selectedMonth]);

  const totals = useMemo(() => {
    return chargesInSelectedMonth.reduce(
      (acc, charge) => {
        const original = Number(charge.originalAmount) || 0;
        const outstanding = Number(charge.outstandingAmount) || 0;
        const paid = Math.max(0, original - outstanding);

        acc.received += paid;
        if (charge.status === "PENDING" || charge.status === "PARTIALLY_PAID") {
          acc.pending += outstanding;
        }
        return acc;
      },
      { received: 0, pending: 0 }
    );
  }, [chargesInSelectedMonth]);

  const handleMonthChange = (delta) => {
    setSelectedMonth((current) =>
      new Date(current.getFullYear(), current.getMonth() + delta, 1)
    );
  };

  const eligibleAppointments = useMemo(() => {
    const blockedAppointments = new Set(
      charges
        .filter((charge) => charge.status !== "CANCELLED")
        .map((charge) => String(charge.appointmentId))
    );

    return appointments
      .filter((appointment) => appointment.status !== "CANCELLED")
      .filter((appointment) => !blockedAppointments.has(String(appointment.id)))
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
  }, [appointments, charges]);

  const filteredEligibleAppointments = useMemo(() => {
    const term = appointmentSearch.trim().toLowerCase();
    if (!term) return eligibleAppointments;

    return eligibleAppointments.filter((appointment) => {
      const label = formatAppointmentOptionLabel(appointment).toLowerCase();
      return label.includes(term);
    });
  }, [eligibleAppointments, appointmentSearch]);

  const filteredCharges = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return chargesInSelectedMonth.filter((charge) => {
      if (statusFilter !== "ALL" && charge.status !== statusFilter) return false;
      if (!term) return true;

      const appointment = appointmentById.get(String(charge.appointmentId));
      const patientName = resolvePatientName(charge).toLowerCase();
      const appointmentId = String(charge.appointmentId || "");
      const patientId = String(appointment?.patientId ?? charge.patientId ?? "");

      return (
        patientName.includes(term) ||
        appointmentId.includes(term) ||
        patientId.includes(term)
      );
    });
  }, [chargesInSelectedMonth, statusFilter, searchTerm, appointmentById, patientById]);

  const handleManualChargeChange = (field) => (event) => {
    const { value } = event.target;
    setManualChargeForm((current) => ({ ...current, [field]: value }));
  };

  const handlePaymentChange = (field) => (event) => {
    const { value } = event.target;
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handlePlanPaymentChange = (field) => (event) => {
    const { value } = event.target;
    setPlanPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handleManualChargeSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!manualChargeForm.appointmentId) {
      showAlert("Selecione uma consulta para criar a cobrança.");
      return;
    }

    const payload = {
      appointmentId: toNumber(manualChargeForm.appointmentId),
    };

    if (manualChargeForm.originalAmount !== "") {
      payload.originalAmount = toNumber(manualChargeForm.originalAmount);
    }

    try {
      await chargesService.create(payload);
      setManualChargeForm(EMPTY_MANUAL_CHARGE);
      setAppointmentSearch("");
      setIsAppointmentListOpen(false);
      await loadFinancialData();
    } catch (err) {
      setError(err.message || "Erro ao criar cobrança manual.");
    }
  };

  const handleAppointmentSearchChange = (event) => {
    const { value } = event.target;
    setAppointmentSearch(value);
    setManualChargeForm((current) => ({ ...current, appointmentId: "" }));
    setIsAppointmentListOpen(true);
  };

  const handleSelectAppointment = (appointment) => {
    setManualChargeForm((current) => ({ ...current, appointmentId: String(appointment.id) }));
    setAppointmentSearch(formatAppointmentOptionLabel(appointment));
    setIsAppointmentListOpen(false);
  };

  const handleOpenPaymentModal = (charge) => {
    setPaymentForm({
      ...EMPTY_PAYMENT,
      chargeId: String(charge.id),
      amountPaid: String(charge.outstandingAmount ?? ""),
    });
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
    setPaymentForm(EMPTY_PAYMENT);
  };

  const handleOpenPlanPaymentModal = (charge) => {
    const seriesId = resolveAppointmentSeriesId(charge);
    if (!seriesId) {
      showAlert("Esta cobranca nao pertence a um plano de consultas.");
      return;
    }

    const chargeIds = charges
      .filter((item) => {
        const sameSeries = String(resolveAppointmentSeriesId(item) || "") === String(seriesId);
        const canPay = item.status === "PENDING" || item.status === "PARTIALLY_PAID";
        return sameSeries && canPay;
      })
      .map((item) => String(item.id));

    if (chargeIds.length === 0) {
      showAlert("Este plano nao possui cobrancas pendentes para pagamento.");
      return;
    }

    setSelectedPlanSeriesId(seriesId);
    setSelectedPlanChargeIds(chargeIds);
    setPlanPaymentForm(EMPTY_PLAN_PAYMENT);
    setIsPlanPaymentModalOpen(true);
  };

  const handleClosePlanPaymentModal = () => {
    setIsPlanPaymentModalOpen(false);
    setSelectedPlanSeriesId(null);
    setSelectedPlanChargeIds([]);
    setPlanPaymentForm(EMPTY_PLAN_PAYMENT);
    setIsSavingPlanPayment(false);
  };

  const handleTogglePlanCharge = (chargeId) => {
    setSelectedPlanChargeIds((current) => {
      const key = String(chargeId);
      if (current.includes(key)) {
        return current.filter((id) => id !== key);
      }
      return [...current, key];
    });
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const chargeId = toNumber(paymentForm.chargeId);
    const payload = {
      amountPaid: toNumber(paymentForm.amountPaid),
      paymentMethod: paymentForm.paymentMethod,
    };

    if (paymentForm.paymentDate) {
      payload.paymentDate = toIso(paymentForm.paymentDate);
    }

    if (paymentForm.notes.trim()) {
      payload.notes = paymentForm.notes.trim();
    }

    try {
      const result = await chargesService.addPayment(chargeId, payload);
      if (result?.charge) {
        setCharges((current) =>
          current.map((charge) =>
            String(charge.id) === String(result.charge.id)
              ? { ...charge, ...result.charge }
              : charge
          )
        );
      } else {
        await loadFinancialData();
      }
      handleClosePaymentModal();
    } catch (err) {
      setError(err.message || "Erro ao registrar pagamento.");
    }
  };

  const handlePlanPaymentSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!selectedPlanSeriesId) {
      showAlert("Nao foi possivel identificar o plano selecionado.");
      return;
    }

    if (selectedPlanChargeIds.length === 0) {
      showAlert("Selecione ao menos uma cobranca para registrar o pagamento do plano.");
      return;
    }

    const selectedSet = new Set(selectedPlanChargeIds.map(String));
    const chargeIds = planPaymentCharges
      .filter((charge) => selectedSet.has(String(charge.id)))
      .map((charge) => toNumber(charge.id))
      .filter((id) => id !== null);

    if (chargeIds.length === 0) {
      showAlert("As cobrancas selecionadas nao estao mais disponiveis para pagamento.");
      return;
    }

    const paymentDate = planPaymentForm.paymentDate ? toIso(planPaymentForm.paymentDate) : null;

    setIsSavingPlanPayment(true);

    try {
      const payload = {
        chargeIds,
        paymentMethod: planPaymentForm.paymentMethod,
        notes: planPaymentForm.notes.trim(),
      };

      if (paymentDate) {
        payload.paymentDate = paymentDate;
      }

      const result = await appointmentSeriesService.addPayments(selectedPlanSeriesId, payload);
      const processedCount = Array.isArray(result?.processedCharges)
        ? result.processedCharges.length
        : chargeIds.length;
      const totalAmountPaid = result?.totalAmountPaid;

      await loadFinancialData();
      handleClosePlanPaymentModal();
      showAlert(
        totalAmountPaid
          ? `Pagamento do plano registrado com sucesso em ${processedCount} cobranca${
              processedCount === 1 ? "" : "s"
            }. Total pago: ${formatCurrency(totalAmountPaid)}.`
          : `Pagamento do plano registrado com sucesso em ${processedCount} cobranca${
              processedCount === 1 ? "" : "s"
            }.`
      );
    } catch (err) {
      await loadFinancialData();
      handleClosePlanPaymentModal();
      setError(err.message || "Erro ao registrar pagamento do plano.");
    }
  };

  const handleOpenEditChargeModal = (charge) => {
    setEditChargeForm({
      chargeId: String(charge.id),
      originalAmount: String(charge.originalAmount ?? ""),
    });
    setIsEditChargeModalOpen(true);
  };

  const handleCloseEditChargeModal = () => {
    setIsEditChargeModalOpen(false);
    setEditChargeForm(EMPTY_EDIT_CHARGE);
    setIsDeleteConfirmOpen(false);
  };

  const handleEditChargeAmountChange = (event) => {
    const { value } = event.target;
    setEditChargeForm((current) => ({ ...current, originalAmount: value }));
  };

  const handleEditChargeSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const chargeId = toNumber(editChargeForm.chargeId);
    const originalAmount = toNumber(editChargeForm.originalAmount);

    try {
      const updatedCharge = await chargesService.update(chargeId, { originalAmount });
      if (updatedCharge?.id) {
        setCharges((current) =>
          current.map((charge) =>
            String(charge.id) === String(updatedCharge.id)
              ? { ...charge, ...updatedCharge }
              : charge
          )
        );
      } else {
        await loadFinancialData();
      }
      handleCloseEditChargeModal();
    } catch (err) {
      setError(err.message || "Erro ao atualizar valor da cobrança.");
    }
  };

  const openDeleteConfirmModal = () => {
    setIsDeleteConfirmOpen(true);
  };

  const closeDeleteConfirmModal = () => {
    setIsDeleteConfirmOpen(false);
  };

  const handleDeleteCharge = async () => {
    const chargeId = toNumber(editChargeForm.chargeId);
    if (!chargeId) return;

    setError("");
    setIsDeletingCharge(true);
    try {
      await chargesService.remove(chargeId);
      setCharges((current) => current.filter((charge) => String(charge.id) !== String(chargeId)));
      setIsDeleteConfirmOpen(false);
      handleCloseEditChargeModal();
    } catch (err) {
      setError(err.message || "Erro ao excluir cobrança.");
    } finally {
      setIsDeletingCharge(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Financeiro
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Cobranças e pagamentos</h1>
          </header>

          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm font-semibold text-slate-700">
              Referência: {selectedMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleMonthChange(-1)}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Mês anterior
              </button>
              <button
                type="button"
                onClick={() => handleMonthChange(1)}
                className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Próximo mês
              </button>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Total recebido no mês
              </p>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(totals.received)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Total pendente no mês
              </p>
              <p className="text-lg font-semibold text-amber-700">
                {formatCurrency(totals.pending)}
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <section className="mt-8 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Criar cobrança manual
            </h2>
            <form onSubmit={handleManualChargeSubmit} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-slate-700">
                    Consulta <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative" ref={appointmentSelectorRef}>
                    <input
                      type="text"
                      value={
                        manualChargeForm.appointmentId && selectedManualAppointment
                          ? formatAppointmentOptionLabel(selectedManualAppointment)
                          : appointmentSearch
                      }
                      onChange={handleAppointmentSearchChange}
                      onFocus={() => setIsAppointmentListOpen(true)}
                      placeholder="Buscar atendimento por data/hora/paciente"
                      className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                    />

                    {isAppointmentListOpen ? (
                      <div className="absolute z-10 mt-2 max-h-64 w-full overflow-auto rounded-lg border border-slate-200 bg-white shadow-lg">
                        {filteredEligibleAppointments.length === 0 ? (
                          <div className="px-3 py-2 text-sm text-slate-500">
                            Nenhuma consulta elegível encontrada.
                          </div>
                        ) : (
                          filteredEligibleAppointments.map((appointment) => (
                            <button
                              type="button"
                              key={appointment.id}
                              onClick={() => handleSelectAppointment(appointment)}
                              className="flex w-full flex-col gap-1 px-3 py-2 text-left hover:bg-slate-50"
                            >
                              <span className="text-sm font-semibold text-slate-900">
                                Atendimento {formatDate(appointment.startTime)} - {formatTime(appointment.startTime)}
                              </span>
                              <span className="text-xs text-slate-500">
                                {getAppointmentPatientName(appointment)}
                              </span>
                            </button>
                          ))
                        )}
                      </div>
                    ) : null}
                  </div>
                  {eligibleAppointments.length === 0 ? (
                    <p className="mt-2 text-xs text-slate-500">
                      Não há consultas elegíveis para criar cobrança manual.
                    </p>
                  ) : null}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Valor original (opcional)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={manualChargeForm.originalAmount}
                    onChange={handleManualChargeChange("originalAmount")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
              >
                Criar cobrança
              </button>
            </form>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Cobranças
            </h2>

            <div className="grid gap-3 sm:grid-cols-3">
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Buscar por paciente, consulta ou ID"
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400 sm:col-span-2"
              />
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              >
                <option value="ALL">Todos os status</option>
                {CHARGE_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {getChargeStatusLabel(status)}
                  </option>
                ))}
              </select>
            </div>

            {isLoading ? (
              <p className="text-sm text-slate-500">Carregando...</p>
            ) : filteredCharges.length === 0 ? (
              <p className="text-sm text-slate-500">Nenhuma cobrança encontrada.</p>
            ) : (
              <div className="space-y-3">
                {filteredCharges.map((charge) => {
                  const appointment = appointmentById.get(String(charge.appointmentId));
                  const appointmentSeriesId = appointment?.appointmentSeriesId || null;
                  const canPay = charge.status !== "PAID" && charge.status !== "CANCELLED";
                  const canEditAmount =
                    charge.status === "PENDING" || charge.status === "PARTIALLY_PAID";
                  const titleDate = formatDate(appointment?.startTime);
                  const titleTime = formatTime(appointment?.startTime);

                  return (
                    <div
                      key={charge.id}
                      className={`rounded-lg border p-4 ${getChargeCardClasses(charge.status)}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            Atendimento {titleDate} - {titleTime}
                          </p>
                          <p className="text-sm text-slate-600">{resolvePatientName(charge)}</p>
                          {appointmentSeriesId ? (
                            <p className="text-xs text-slate-500">Cobranca vinculada a plano de consultas</p>
                          ) : null}
                        </div>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                          {getChargeStatusLabel(charge.status)}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <span>Data da consulta: {formatDateTime(appointment?.startTime)}</span>
                        <span>Valor original: {formatCurrency(charge.originalAmount)}</span>
                        <span>Saldo atual: {formatCurrency(charge.outstandingAmount)}</span>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={!canPay}
                          onClick={() => handleOpenPaymentModal(charge)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Incluir pagamento
                        </button>
                        {appointmentSeriesId ? (
                          <button
                            type="button"
                            disabled={!canPay}
                            onClick={() => handleOpenPlanPaymentModal(charge)}
                            className="inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Incluir pagamento de plano
                          </button>
                        ) : null}
                        <button
                          type="button"
                          disabled={!canEditAmount}
                          onClick={() => handleOpenEditChargeModal(charge)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Editar
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </div>
      </div>

      {isPaymentModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Incluir pagamento</h3>
            <p className="mt-1 text-sm text-slate-500">Cobrança #{paymentForm.chargeId}</p>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Valor pago <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={paymentForm.amountPaid}
                  onChange={handlePaymentChange("amountPaid")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Método de pagamento <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={paymentForm.paymentMethod}
                  onChange={handlePaymentChange("paymentMethod")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Data do pagamento (opcional)</label>
                <input
                  type="datetime-local"
                  value={paymentForm.paymentDate}
                  onChange={handlePaymentChange("paymentDate")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Observações (opcional)</label>
                <textarea
                  rows={3}
                  value={paymentForm.notes}
                  onChange={handlePaymentChange("notes")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClosePaymentModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Salvar pagamento
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isPlanPaymentModalOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-2xl rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Incluir pagamento de plano</h3>
            <p className="mt-1 text-sm text-slate-500">
              Selecione as cobrancas do plano que devem ser quitadas.
            </p>

            <form onSubmit={handlePlanPaymentSubmit} className="mt-4 space-y-4">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Cobrancas selecionadas
                </p>
                <p className="mt-1 text-sm text-slate-700">
                  {selectedPlanCharges.length} cobranca{selectedPlanCharges.length === 1 ? "" : "s"} • Total {" "}
                  {formatCurrency(selectedPlanTotal)}
                </p>
              </div>

              <div className="max-h-72 space-y-2 overflow-auto rounded-lg border border-slate-200 p-3">
                {planPaymentCharges.length === 0 ? (
                  <p className="text-sm text-slate-500">Nenhuma cobranca disponivel para este plano.</p>
                ) : (
                  planPaymentCharges.map((charge) => {
                    const appointment = appointmentById.get(String(charge.appointmentId));
                    const isSelected = selectedPlanChargeIds.includes(String(charge.id));
                    return (
                      <label
                        key={charge.id}
                        className="flex cursor-pointer items-start gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleTogglePlanCharge(charge.id)}
                          className="mt-1 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                        />
                        <span>
                          <span className="block text-sm font-semibold text-slate-900">
                            Atendimento {formatDate(appointment?.startTime)} - {formatTime(appointment?.startTime)}
                          </span>
                          <span className="block text-xs text-slate-600">
                            {resolvePatientName(charge)} • Saldo: {formatCurrency(charge.outstandingAmount)}
                          </span>
                        </span>
                      </label>
                    );
                  })
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">
                  Metodo de pagamento <span className="text-rose-600">*</span>
                </label>
                <select
                  required
                  value={planPaymentForm.paymentMethod}
                  onChange={handlePlanPaymentChange("paymentMethod")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option key={`plan-${method}`} value={method}>
                      {method}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Data do pagamento (opcional)</label>
                <input
                  type="datetime-local"
                  value={planPaymentForm.paymentDate}
                  onChange={handlePlanPaymentChange("paymentDate")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-slate-700">Observacoes (opcional)</label>
                <textarea
                  rows={3}
                  value={planPaymentForm.notes}
                  onChange={handlePlanPaymentChange("notes")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleClosePlanPaymentModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSavingPlanPayment}
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Salvar pagamento do plano
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isEditChargeModalOpen ? (
        <div className="fixed inset-0 z-20 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-lg rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Editar cobrança</h3>

            <form onSubmit={handleEditChargeSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">
                  Novo valor <span className="text-rose-600">*</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={editChargeForm.originalAmount}
                  onChange={handleEditChargeAmountChange}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>

              <div className="flex flex-wrap justify-between gap-2">
                <button
                  type="button"
                  onClick={openDeleteConfirmModal}
                  className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                >
                  Excluir cobrança
                </button>
                <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCloseEditChargeModal}
                  className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  Salvar
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {isDeleteConfirmOpen ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-slate-900/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-slate-900">Excluir cobrança</h3>
            <p className="mt-2 text-sm text-slate-600">
              Tem certeza que deseja excluir esta cobrança? Essa ação não pode ser desfeita.
            </p>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDeleteConfirmModal}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteCharge}
                disabled={isDeletingCharge}
                className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

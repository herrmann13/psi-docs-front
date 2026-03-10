import { useEffect, useMemo, useState } from "react";
import { CHARGE_STATUSES } from "../constants/charges";
import { PAYMENT_METHODS } from "../constants/payments";
import { chargesService } from "../services/api/charges";
import { appointmentsService } from "../services/api/appointments";
import usePatients from "../hooks/usePatients";

const EMPTY_MANUAL_CHARGE = {
  appointmentId: "",
  originalAmount: "",
  dueDate: "",
};

const EMPTY_PAYMENT = {
  chargeId: "",
  amountPaid: "",
  paymentMethod: "PIX",
  paymentDate: "",
  notes: "",
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
  const [charges, setCharges] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [manualChargeForm, setManualChargeForm] = useState(EMPTY_MANUAL_CHARGE);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { patients } = usePatients();

  const loadFinancialData = async () => {
    setIsLoading(true);
    setError("");
    try {
      const [chargesData, appointmentsData] = await Promise.all([
        chargesService.list(),
        appointmentsService.list(),
      ]);
      setCharges(Array.isArray(chargesData) ? chargesData : []);
      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar financeiro.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadFinancialData();
  }, []);

  const appointmentById = useMemo(
    () => new Map(appointments.map((appointment) => [String(appointment.id), appointment])),
    [appointments]
  );

  const patientById = useMemo(
    () => new Map(patients.map((patient) => [String(patient.id), patient])),
    [patients]
  );

  const resolvePatientName = (charge) => {
    const appointment = appointmentById.get(String(charge.appointmentId));
    const patientId = appointment?.patientId ?? charge.patientId;
    const patient = patientById.get(String(patientId));
    return patient?.name || patient?.fullName || `Paciente ${patientId ?? "-"}`;
  };

  const totals = useMemo(() => {
    return charges.reduce(
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
  }, [charges]);

  const filteredCharges = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    return charges.filter((charge) => {
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
  }, [charges, statusFilter, searchTerm, appointmentById, patientById]);

  const handleManualChargeChange = (field) => (event) => {
    const { value } = event.target;
    setManualChargeForm((current) => ({ ...current, [field]: value }));
  };

  const handlePaymentChange = (field) => (event) => {
    const { value } = event.target;
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handleManualChargeSubmit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {
      appointmentId: toNumber(manualChargeForm.appointmentId),
    };

    if (manualChargeForm.originalAmount !== "") {
      payload.originalAmount = toNumber(manualChargeForm.originalAmount);
    }

    if (manualChargeForm.dueDate) {
      payload.dueDate = manualChargeForm.dueDate;
    }

    try {
      await chargesService.create(payload);
      setManualChargeForm(EMPTY_MANUAL_CHARGE);
      await loadFinancialData();
    } catch (err) {
      setError(err.message || "Erro ao criar cobranca manual.");
    }
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

  return (
    <div className="min-h-screen bg-slate-50 px-4 sm:px-8 sm:py-10">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-xl bg-white p-6 shadow-sm sm:p-8">
          <header className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Financeiro
            </p>
            <h1 className="text-xl font-semibold text-slate-900">Cobrancas e pagamentos</h1>
          </header>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-lg border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">
                Total recebido
              </p>
              <p className="text-lg font-semibold text-emerald-700">
                {formatCurrency(totals.received)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Total pendente
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
              Criar cobranca manual
            </h2>
            <form onSubmit={handleManualChargeSubmit} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">ID da consulta</label>
                  <input
                    type="number"
                    required
                    value={manualChargeForm.appointmentId}
                    onChange={handleManualChargeChange("appointmentId")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
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
                <div>
                  <label className="text-sm font-medium text-slate-700">Vencimento (opcional)</label>
                  <input
                    type="date"
                    value={manualChargeForm.dueDate}
                    onChange={handleManualChargeChange("dueDate")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
              >
                Criar cobranca
              </button>
            </form>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Cobrancas
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
              <p className="text-sm text-slate-500">Nenhuma cobranca encontrada.</p>
            ) : (
              <div className="space-y-3">
                {filteredCharges.map((charge) => {
                  const appointment = appointmentById.get(String(charge.appointmentId));
                  const canPay = charge.status !== "PAID" && charge.status !== "CANCELLED";

                  return (
                    <div
                      key={charge.id}
                      className={`rounded-lg border p-4 ${getChargeCardClasses(charge.status)}`}
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <p className="text-base font-semibold text-slate-900">Cobranca #{charge.id}</p>
                          <p className="text-sm text-slate-600">{resolvePatientName(charge)}</p>
                        </div>
                        <span className="rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-700">
                          {getChargeStatusLabel(charge.status)}
                        </span>
                      </div>

                      <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                        <span>Consulta: #{charge.appointmentId}</span>
                        <span>Data consulta: {formatDateTime(appointment?.startTime)}</span>
                        <span>Valor original: {formatCurrency(charge.originalAmount)}</span>
                        <span>Saldo atual: {formatCurrency(charge.outstandingAmount)}</span>
                        <span>Vencimento: {formatDate(charge.dueDate)}</span>
                      </div>

                      <div className="mt-3">
                        <button
                          type="button"
                          disabled={!canPay}
                          onClick={() => handleOpenPaymentModal(charge)}
                          className="inline-flex items-center rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Incluir pagamento
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
            <p className="mt-1 text-sm text-slate-500">Cobranca #{paymentForm.chargeId}</p>

            <form onSubmit={handlePaymentSubmit} className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700">Valor pago</label>
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
                <label className="text-sm font-medium text-slate-700">Metodo de pagamento</label>
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
                <label className="text-sm font-medium text-slate-700">Observacoes (opcional)</label>
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
    </div>
  );
}

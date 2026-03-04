import { useEffect, useMemo, useState } from "react";
import { CHARGE_STATUSES } from "../constants/charges";
import { PAYMENT_METHODS } from "../constants/payments";
import { chargesService } from "../services/api/charges";
import { paymentsService } from "../services/api/payments";
import { paymentChargesService } from "../services/api/paymentCharges";
import { paymentAttachmentsService } from "../services/api/paymentAttachments";

const EMPTY_CHARGE = {
  id: "",
  appointmentId: "",
  patientId: "",
  originalAmount: "",
  outstandingAmount: "",
  status: "PENDING",
  dueDate: "",
};

const EMPTY_PAYMENT = {
  id: "",
  patientId: "",
  totalAmount: "",
  paymentMethod: "PIX",
  paymentDate: "",
  notes: "",
};

const EMPTY_LINK = {
  paymentId: "",
  chargeId: "",
  amountPaid: "",
};

const EMPTY_ATTACHMENT = {
  paymentId: "",
  filePath: "",
  originalFilename: "",
  mimeType: "",
  fileSize: "",
  fileHash: "",
  uploadedAt: "",
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

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("pt-BR");
};

export default function FinanceView() {
  const [charges, setCharges] = useState([]);
  const [payments, setPayments] = useState([]);
  const [links, setLinks] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [chargeForm, setChargeForm] = useState(EMPTY_CHARGE);
  const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);
  const [linkForm, setLinkForm] = useState(EMPTY_LINK);
  const [attachmentForm, setAttachmentForm] = useState(EMPTY_ATTACHMENT);
  const [error, setError] = useState("");

  const loadAll = async () => {
    setError("");
    try {
      const [chargesData, paymentsData, linksData, attachmentsData] = await Promise.all([
        chargesService.list(),
        paymentsService.list(),
        paymentChargesService.list(),
        paymentAttachmentsService.list(),
      ]);
      setCharges(Array.isArray(chargesData) ? chargesData : []);
      setPayments(Array.isArray(paymentsData) ? paymentsData : []);
      setLinks(Array.isArray(linksData) ? linksData : []);
      setAttachments(Array.isArray(attachmentsData) ? attachmentsData : []);
    } catch (err) {
      setError(err.message || "Erro ao carregar financeiro.");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const resetCharge = () => setChargeForm(EMPTY_CHARGE);
  const resetPayment = () => setPaymentForm(EMPTY_PAYMENT);
  const resetLink = () => setLinkForm(EMPTY_LINK);
  const resetAttachment = () => setAttachmentForm(EMPTY_ATTACHMENT);

  const handleChargeChange = (field) => (event) => {
    const { value } = event.target;
    setChargeForm((current) => ({ ...current, [field]: value }));
  };

  const handlePaymentChange = (field) => (event) => {
    const { value } = event.target;
    setPaymentForm((current) => ({ ...current, [field]: value }));
  };

  const handleLinkChange = (field) => (event) => {
    const { value } = event.target;
    setLinkForm((current) => ({ ...current, [field]: value }));
  };

  const handleAttachmentChange = (field) => (event) => {
    const { value } = event.target;
    setAttachmentForm((current) => ({ ...current, [field]: value }));
  };

  const handleChargeEdit = (charge) => {
    setChargeForm({
      id: charge.id || "",
      appointmentId: charge.appointmentId ?? "",
      patientId: charge.patientId ?? "",
      originalAmount:
        charge.originalAmount === null || charge.originalAmount === undefined
          ? ""
          : String(charge.originalAmount),
      outstandingAmount:
        charge.outstandingAmount === null || charge.outstandingAmount === undefined
          ? ""
          : String(charge.outstandingAmount),
      status: charge.status || "PENDING",
      dueDate: charge.dueDate || "",
    });
  };

  const handlePaymentEdit = (payment) => {
    setPaymentForm({
      id: payment.id || "",
      patientId: payment.patientId ?? "",
      totalAmount:
        payment.totalAmount === null || payment.totalAmount === undefined
          ? ""
          : String(payment.totalAmount),
      paymentMethod: payment.paymentMethod || "PIX",
      paymentDate: payment.paymentDate ? payment.paymentDate.slice(0, 16) : "",
      notes: payment.notes || "",
    });
  };

  const handleChargeSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      appointmentId: toNumber(chargeForm.appointmentId),
      patientId: toNumber(chargeForm.patientId),
      originalAmount: toNumber(chargeForm.originalAmount),
      outstandingAmount: toNumber(chargeForm.outstandingAmount),
      status: chargeForm.status,
      dueDate: chargeForm.dueDate || null,
    };

    try {
      if (chargeForm.id) {
        await chargesService.update(chargeForm.id, payload);
      } else {
        await chargesService.create(payload);
      }
      resetCharge();
      await loadAll();
    } catch (err) {
      setError(err.message || "Erro ao salvar cobranca.");
    }
  };

  const handlePaymentSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      patientId: toNumber(paymentForm.patientId),
      totalAmount: toNumber(paymentForm.totalAmount),
      paymentMethod: paymentForm.paymentMethod,
      paymentDate: toIso(paymentForm.paymentDate),
      notes: paymentForm.notes || null,
    };

    try {
      if (paymentForm.id) {
        await paymentsService.update(paymentForm.id, payload);
      } else {
        await paymentsService.create(payload);
      }
      resetPayment();
      await loadAll();
    } catch (err) {
      setError(err.message || "Erro ao salvar pagamento.");
    }
  };

  const handleLinkSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      paymentId: toNumber(linkForm.paymentId),
      chargeId: toNumber(linkForm.chargeId),
      amountPaid: toNumber(linkForm.amountPaid),
    };

    try {
      await paymentChargesService.create(payload);
      resetLink();
      await loadAll();
    } catch (err) {
      setError(err.message || "Erro ao vincular pagamento.");
    }
  };

  const handleAttachmentSubmit = async (event) => {
    event.preventDefault();
    setError("");
    const payload = {
      paymentId: toNumber(attachmentForm.paymentId),
      filePath: attachmentForm.filePath,
      originalFilename: attachmentForm.originalFilename,
      mimeType: attachmentForm.mimeType,
      fileSize: toNumber(attachmentForm.fileSize),
      fileHash: attachmentForm.fileHash,
      uploadedAt: toIso(attachmentForm.uploadedAt),
    };

    try {
      await paymentAttachmentsService.create(payload);
      resetAttachment();
      await loadAll();
    } catch (err) {
      setError(err.message || "Erro ao salvar comprovante.");
    }
  };

  const totals = useMemo(() => {
    const paid = charges
      .filter((charge) => charge.status === "PAID")
      .reduce((sum, charge) => sum + (Number(charge.originalAmount) || 0), 0);
    const pending = charges
      .filter((charge) => charge.status !== "PAID")
      .reduce((sum, charge) => sum + (Number(charge.outstandingAmount) || 0), 0);
    return { paid, pending };
  }, [charges]);

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
                {totals.paid.toFixed(2)}
              </p>
            </div>
            <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-600">
                Total pendente
              </p>
              <p className="text-lg font-semibold text-amber-700">
                {totals.pending.toFixed(2)}
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
              Cobrancas
            </h2>
            <form onSubmit={handleChargeSubmit} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">ID da sessao</label>
                  <input
                    type="number"
                    value={chargeForm.appointmentId}
                    onChange={handleChargeChange("appointmentId")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">ID do paciente</label>
                  <input
                    type="number"
                    value={chargeForm.patientId}
                    onChange={handleChargeChange("patientId")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Vencimento</label>
                  <input
                    type="date"
                    value={chargeForm.dueDate}
                    onChange={handleChargeChange("dueDate")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Valor original</label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeForm.originalAmount}
                    onChange={handleChargeChange("originalAmount")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Saldo em aberto</label>
                  <input
                    type="number"
                    step="0.01"
                    value={chargeForm.outstandingAmount}
                    onChange={handleChargeChange("outstandingAmount")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Status</label>
                  <select
                    value={chargeForm.status}
                    onChange={handleChargeChange("status")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  >
                    {CHARGE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  {chargeForm.id ? "Atualizar cobranca" : "Criar cobranca"}
                </button>
                {chargeForm.id ? (
                  <button
                    type="button"
                    onClick={resetCharge}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>

            <div className="space-y-3">
              {charges.map((charge) => (
                <div key={charge.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Cobranca #{charge.id}</p>
                      <p className="text-sm text-slate-500">
                        Paciente {charge.patientId} | Sessao {charge.appointmentId}
                      </p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {charge.status}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span>Valor: {charge.originalAmount ?? "-"}</span>
                    <span>Saldo: {charge.outstandingAmount ?? "-"}</span>
                    <span>Vencimento: {charge.dueDate || "-"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleChargeEdit(charge)}
                    className="mt-3 inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Pagamentos
            </h2>
            <form onSubmit={handlePaymentSubmit} className="space-y-3">
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <label className="text-sm font-medium text-slate-700">ID do paciente</label>
                  <input
                    type="number"
                    value={paymentForm.patientId}
                    onChange={handlePaymentChange("patientId")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Valor total</label>
                  <input
                    type="number"
                    step="0.01"
                    value={paymentForm.totalAmount}
                    onChange={handlePaymentChange("totalAmount")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700">Metodo</label>
                  <select
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
                  <label className="text-sm font-medium text-slate-700">Data do pagamento</label>
                  <input
                    type="datetime-local"
                    value={paymentForm.paymentDate}
                    onChange={handlePaymentChange("paymentDate")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-sm font-medium text-slate-700">Notas</label>
                  <input
                    type="text"
                    value={paymentForm.notes}
                    onChange={handlePaymentChange("notes")}
                    className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                    placeholder="Observacoes"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  {paymentForm.id ? "Atualizar pagamento" : "Criar pagamento"}
                </button>
                {paymentForm.id ? (
                  <button
                    type="button"
                    onClick={resetPayment}
                    className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                  >
                    Cancelar edicao
                  </button>
                ) : null}
              </div>
            </form>

            <div className="space-y-3">
              {payments.map((payment) => (
                <div key={payment.id} className="rounded-lg border border-slate-200 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-base font-semibold text-slate-900">Pagamento #{payment.id}</p>
                      <p className="text-sm text-slate-500">Paciente {payment.patientId}</p>
                    </div>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                      {payment.paymentMethod}
                    </span>
                  </div>
                  <div className="mt-2 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                    <span>Valor: {payment.totalAmount ?? "-"}</span>
                    <span>Data: {formatDateTime(payment.paymentDate)}</span>
                    <span>Notas: {payment.notes || "-"}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePaymentEdit(payment)}
                    className="mt-3 inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Editar
                  </button>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Vincular pagamento a cobranca
            </h2>
            <form onSubmit={handleLinkSubmit} className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-slate-700">ID do pagamento</label>
                <input
                  type="number"
                  value={linkForm.paymentId}
                  onChange={handleLinkChange("paymentId")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">ID da cobranca</label>
                <input
                  type="number"
                  value={linkForm.chargeId}
                  onChange={handleLinkChange("chargeId")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Valor pago</label>
                <input
                  type="number"
                  step="0.01"
                  value={linkForm.amountPaid}
                  onChange={handleLinkChange("amountPaid")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  Vincular pagamento
                </button>
                <button
                  type="button"
                  onClick={resetLink}
                  className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {links.map((link) => (
                <div key={link.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
                  Pagamento {link.paymentId} vinculado a cobranca {link.chargeId} - Valor {link.amountPaid}
                </div>
              ))}
            </div>
          </section>

          <section className="mt-10 space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-400">
              Comprovantes
            </h2>
            <form onSubmit={handleAttachmentSubmit} className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="text-sm font-medium text-slate-700">ID do pagamento</label>
                <input
                  type="number"
                  value={attachmentForm.paymentId}
                  onChange={handleAttachmentChange("paymentId")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Arquivo</label>
                <input
                  type="text"
                  value={attachmentForm.originalFilename}
                  onChange={handleAttachmentChange("originalFilename")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="recibo.pdf"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Caminho</label>
                <input
                  type="text"
                  value={attachmentForm.filePath}
                  onChange={handleAttachmentChange("filePath")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="/uploads/payments/1/recibo.pdf"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Mime type</label>
                <input
                  type="text"
                  value={attachmentForm.mimeType}
                  onChange={handleAttachmentChange("mimeType")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                  placeholder="application/pdf"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Tamanho (bytes)</label>
                <input
                  type="number"
                  value={attachmentForm.fileSize}
                  onChange={handleAttachmentChange("fileSize")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Hash</label>
                <input
                  type="text"
                  value={attachmentForm.fileHash}
                  onChange={handleAttachmentChange("fileHash")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Data do upload</label>
                <input
                  type="datetime-local"
                  value={attachmentForm.uploadedAt}
                  onChange={handleAttachmentChange("uploadedAt")}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base outline-none focus:ring-2 focus:ring-slate-400"
                />
              </div>
              <div className="sm:col-span-3">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-700"
                >
                  Salvar comprovante
                </button>
                <button
                  type="button"
                  onClick={resetAttachment}
                  className="ml-2 inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
                >
                  Limpar
                </button>
              </div>
            </form>

            <div className="space-y-3">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="rounded-lg border border-slate-200 p-4 text-sm text-slate-600">
                  <div className="font-semibold text-slate-900">{attachment.originalFilename}</div>
                  <div>Pagamento {attachment.paymentId}</div>
                  <div>Arquivo: {attachment.filePath}</div>
                  <div>Upload: {formatDateTime(attachment.uploadedAt)}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

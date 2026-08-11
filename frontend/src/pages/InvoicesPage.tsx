import { ui } from "../styles";
import {
    BadgeDollarSign, CalendarDays, Calculator, Download, FileText,
    Pencil, Plus, ReceiptText, Trash2, UserRound
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { PatientSearchSelect } from "../components/PatientSearchSelect";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../services/api";
import type { Invoice, Page, Patient } from "../types";

const initialPayment = { amount: "", paymentMethod: "ESPECES", reference: "", notes: "" };
const newInvoiceForm = () => ({
    type: "FACTURE",
    invoiceDate: new Date().toISOString().slice(0, 10),
    description: "Prestation dentaire",
    quantity: "1",
    unitPrice: ""
});
export function InvoicesPage() {
    const { text, locale } = useLanguage();
    const money = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "MAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    const formatDate = (value?: string) => value
        ? dateFormatter.format(new Date(`${value.slice(0, 10)}T12:00:00`))
        : "—";
    const invoiceTypeLabel = (value: string) => ({
        DEVIS: text("Devis", "عرض سعر"),
        FACTURE: text("Facture", "فاتورة"),
        AVOIR: text("Avoir", "إشعار دائن")
    } as Record<string, string>)[value] ?? value.replaceAll("_", " ");
    const [patients, setPatients] = useState<Patient[]>([]);
    const [patientId, setPatientId] = useState("");
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [dialog, setDialog] = useState<"invoice" | "payment" | null>(null);
    const [selected, setSelected] = useState<Invoice | null>(null);
    const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
    const [feedback, setFeedback] = useState("");
    const [feedbackIsError, setFeedbackIsError] = useState(false);
    const [invoiceForm, setInvoiceForm] = useState(newInvoiceForm);
    const [payment, setPayment] = useState(initialPayment);
    const billedInvoices = invoices.filter((invoice) =>
        invoice.type === "FACTURE" && invoice.status !== "ANNULEE");
    const financialSummary = billedInvoices.reduce((summary, invoice) => ({
        total: summary.total + Number(invoice.totalAmount),
        paid: summary.paid + Number(invoice.paidAmount),
        remaining: summary.remaining + Number(invoice.remainingAmount)
    }), { total: 0, paid: 0, remaining: 0 });
    const paymentAmount = Number(payment.amount);
    const remainingBeforePayment = Number(selected?.remainingAmount ?? 0);
    const paymentIsValid = Number.isFinite(paymentAmount)
        && paymentAmount > 0
        && paymentAmount <= remainingBeforePayment;
    const remainingAfterPayment = paymentIsValid
        ? Math.max(0, Math.round((remainingBeforePayment - paymentAmount) * 100) / 100)
        : remainingBeforePayment;
    const activePatient = patients.find((patient) => patient.id === patientId);
    const invoiceQuantity = Number(invoiceForm.quantity);
    const invoiceUnitPrice = Number(invoiceForm.unitPrice);
    const invoiceTotal = Number.isFinite(invoiceQuantity) && Number.isFinite(invoiceUnitPrice)
        ? Math.max(0, Math.round(invoiceQuantity * invoiceUnitPrice * 100) / 100)
        : 0;
    const minimumEditableTotal = Number(editingInvoice?.paidAmount ?? 0);
    const invoiceIsValid = Boolean(
        patientId
        && invoiceForm.type
        && invoiceForm.invoiceDate
        && invoiceForm.description.trim()
        && invoiceQuantity > 0
        && invoiceUnitPrice > 0
        && invoiceTotal >= minimumEditableTotal
    );
    useEffect(() => { api.get<Page<Patient>>("/patients?page=0&size=100").then((page) => setPatients(page.content)); }, []);
    async function load(id = patientId) {
        if (!id)
            return setInvoices([]);
        try {
            setInvoices(await api.get<Invoice[]>(`/patients/${id}/invoices`));
            setFeedback("");
            setFeedbackIsError(false);
        }
        catch {
            setFeedback(text("Impossible de charger les factures.", "تعذّر تحميل الفواتير."));
            setFeedbackIsError(true);
        }
    }
    async function createInvoice(event: FormEvent) {
        event.preventDefault();
        if (!invoiceIsValid) {
            setFeedback(minimumEditableTotal > 0 && invoiceTotal < minimumEditableTotal
                ? text(`Le total ne peut pas être inférieur au montant déjà payé (${money.format(minimumEditableTotal)}).`, `لا يمكن أن يكون المجموع أقل من المبلغ المؤدى (${money.format(minimumEditableTotal)}).`)
                : text("Tous les champs du document sont obligatoires.", "جميع حقول المستند إلزامية."));
            setFeedbackIsError(true);
            return;
        }
        try {
            const payload = {
                patientId,
                type: invoiceForm.type,
                invoiceDate: invoiceForm.invoiceDate,
                notes: editingInvoice?.notes || null,
                items: [{
                    description: invoiceForm.description.trim(),
                    quantity: invoiceQuantity,
                    unitPrice: invoiceUnitPrice
                }]
            };
            if (editingInvoice) await api.put(`/patient-invoices/${editingInvoice.id}`, payload);
            else await api.post("/patient-invoices", payload);
            setInvoiceForm(newInvoiceForm());
            setEditingInvoice(null);
            setDialog(null);
            setFeedback(editingInvoice
                ? text("Document modifié.", "تم تعديل المستند.")
                : text("Document créé en brouillon.", "تم إنشاء المستند كمسودة."));
            setFeedbackIsError(false);
            await load();
        } catch (reason) {
            setFeedback((reason as { message?: string }).message || text(
                "Modification du document impossible.",
                "تعذّر تعديل المستند."
            ));
            setFeedbackIsError(true);
        }
    }
    function openInvoiceForm(invoice?: Invoice) {
        setEditingInvoice(invoice || null);
        const firstItem = invoice?.items[0];
        setInvoiceForm(invoice ? {
            type: invoice.type,
            invoiceDate: invoice.invoiceDate.slice(0, 10),
            description: firstItem?.description || "",
            quantity: String(firstItem?.quantity || 1),
            unitPrice: String(firstItem?.unitPrice || invoice.totalAmount)
        } : newInvoiceForm());
        setFeedback("");
        setFeedbackIsError(false);
        setDialog("invoice");
    }
    async function removeInvoice(invoice: Invoice) {
        const isDraft = invoice.status === "BROUILLON";
        if (!window.confirm(text(
            isDraft
                ? `Voulez-vous vraiment supprimer le brouillon ${invoice.invoiceNumber} ?`
                : `Voulez-vous vraiment annuler ${invoice.invoiceNumber} ? Ses paiements seront annulés et le document restera dans l'historique.`,
            isDraft
                ? `هل تريد فعلاً حذف المسودة ${invoice.invoiceNumber}؟`
                : `هل تريد فعلاً إلغاء ${invoice.invoiceNumber}؟ سيتم إلغاء دفعاتها وسيبقى المستند في السجل.`
        ))) return;
        try {
            await api.delete(`/patient-invoices/${invoice.id}`);
            setFeedback(isDraft
                ? text("Brouillon supprimé.", "تم حذف المسودة.")
                : text("Facture annulée. Ses paiements ont été retirés des totaux actifs.", "تم إلغاء الفاتورة وإزالة دفعاتها من المجاميع الحالية."));
            setFeedbackIsError(false);
            await load();
        } catch (reason) {
            setFeedback((reason as { message?: string }).message || text(
                "Suppression du document impossible.",
                "تعذّر حذف المستند."
            ));
            setFeedbackIsError(true);
        }
    }
    async function pay(event: FormEvent) {
        event.preventDefault();
        if (!selected || !paymentIsValid) {
            setFeedback(text("Impossible d’enregistrer : vérifiez le montant du versement.", "تعذّر الحفظ: تحقق من مبلغ الدفعة."));
            setFeedbackIsError(true);
            return;
        }
        await api.post("/patient-payments", { invoiceId: selected.id, amount: paymentAmount, paymentDate: new Date().toISOString(),
            paymentMethod: payment.paymentMethod, reference: payment.reference || null, notes: payment.notes || null });
        setDialog(null);
        setSelected(null);
        setPayment(initialPayment);
        setFeedback(remainingAfterPayment > 0
            ? text(`Versement enregistré. Crédit patient restant : ${money.format(remainingAfterPayment)}.`, `تم حفظ الدفعة. الرصيد المتبقي على المريض: ${money.format(remainingAfterPayment)}.`)
            : text("Paiement complet enregistré. La facture est soldée.", "تم تسجيل الدفع الكامل وتسوية الفاتورة."));
        setFeedbackIsError(false);
        await load();
    }
    return <>
    {feedback && <div className={ui(feedbackIsError ? "alert alert-error" : "alert alert-success")}>{feedback}</div>}
    <section className={`${ui("panel")} flex min-h-[calc(100vh-230px)] flex-col`}>
      <div className={ui("toolbar")}>
        <div className="min-w-0 max-w-2xl flex-1">
          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">{text("Rechercher et sélectionner un patient", "البحث عن مريض واختياره")} <b className="text-red-500">*</b></span>
            <PatientSearchSelect
              patients={patients}
              value={patientId}
              onChange={(id) => { setPatientId(id); void load(id); }}
              ariaLabel={text("Rechercher et sélectionner un patient", "البحث عن مريض واختياره")}
              placeholder={text("Nom, CIN, téléphone ou n° de dossier", "الاسم، رقم البطاقة، الهاتف أو رقم الملف")}
              emptyMessage={text("Aucun patient trouvé", "لم يتم العثور على أي مريض")}
              className="h-11"
            />
          </label>
        </div>
        <div className="flex items-center gap-3"><span className={ui("result-count")}>{text(`${invoices.length} document(s)`, `${invoices.length} مستند`)}</span>
          <button className={ui("button primary")} disabled={!patientId} onClick={() => openInvoiceForm()}><Plus size={17}/> {text("Nouveau document", "مستند جديد")}</button>
        </div></div>
      {patientId && invoices.length > 0 && <div className="mb-5 grid grid-cols-3 gap-3 max-[760px]:grid-cols-1" aria-label={text("Résumé financier du patient", "الملخص المالي للمريض")}>
        <article className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{text("Total facturé", "إجمالي الفواتير")}</span>
          <strong className="mt-1 block text-lg text-slate-900">{money.format(financialSummary.total)}</strong>
        </article>
        <article className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">{text("Total payé", "إجمالي المدفوع")}</span>
          <strong className="mt-1 block text-lg text-emerald-900">{money.format(financialSummary.paid)}</strong>
        </article>
        <article className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-700">{text("Crédit patient restant", "الرصيد المتبقي على المريض")}</span>
          <strong className="mt-1 block text-lg text-amber-900">{money.format(financialSummary.remaining)}</strong>
        </article>
      </div>}
      {!invoices.length ? <EmptyState message={text("Sélectionnez un patient ou créez son premier document.", "اختر مريضاً أو أنشئ أول مستند له.")}/> :
            <div className={ui("invoice-cards")}>{invoices.map((invoice) => {
          const remaining = Number(invoice.remainingAmount);
          const isPayableInvoice = invoice.type === "FACTURE" && !["BROUILLON", "ANNULEE"].includes(invoice.status);
          const canEdit = invoice.status !== "ANNULEE" && invoice.items.length === 1;
          const canRemove = invoice.status !== "ANNULEE";
          return <article key={invoice.id}><div className={ui("document-icon")}><ReceiptText /></div>
          <div><span className={ui("eyebrow")}>{invoiceTypeLabel(invoice.type)}</span><h3>{invoice.invoiceNumber}</h3><small>{formatDate(invoice.invoiceDate)}</small></div>
          <div className={`${ui("invoice-amount")} min-w-[250px]`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
              {text("Prix total du soin", "السعر الإجمالي للعلاج")}
            </span>
            <strong>{money.format(Number(invoice.totalAmount))}</strong>
            {isPayableInvoice ? <>
              <span className="font-semibold text-emerald-700">
                {text("Montant payé", "المبلغ المؤدى")} : {money.format(Number(invoice.paidAmount))}
              </span>
              <span className={remaining > 0 ? "font-bold text-amber-700" : "font-bold text-emerald-700"}>
                {remaining > 0 ? text(`Crédit restant : ${money.format(remaining)}`, `الرصيد المتبقي: ${money.format(remaining)}`) : text("Facture soldée", "فاتورة مسددة")}
              </span>
            </> : <>
              <span className="font-semibold text-slate-500">
                {text("Montant payé", "المبلغ المؤدى")} : {money.format(Number(invoice.paidAmount))}
              </span>
              <span>{text("Document non comptabilisé dans le crédit", "المستند غير محتسب ضمن الرصيد")}</span>
            </>}
          </div>
          <StatusBadge value={invoice.status}/>
          <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-sm">
            <button className={ui("icon-button")} title={text("Télécharger le PDF", "تنزيل PDF")} onClick={() => api.download(`/patient-invoices/${invoice.id}/pdf`, `${invoice.invoiceNumber}.pdf`)}><Download /></button>
            <button type="button" className={`${ui("icon-button")} text-teal-700 hover:bg-teal-50`} disabled={!canEdit} aria-label={text("Modifier le document", "تعديل المستند")} title={canEdit ? text("Modifier", "تعديل") : text("Document non modifiable", "المستند غير قابل للتعديل")} onClick={() => openInvoiceForm(invoice)}><Pencil className="size-4"/></button>
            <button type="button" className={`${ui("icon-button")} text-red-600 hover:bg-red-50`} disabled={!canRemove} aria-label={invoice.status === "BROUILLON" ? text("Supprimer le brouillon", "حذف المسودة") : text("Annuler la facture", "إلغاء الفاتورة")} title={invoice.status === "BROUILLON" ? text("Supprimer", "حذف") : invoice.status === "ANNULEE" ? text("Facture déjà annulée", "الفاتورة ملغاة") : text("Annuler la facture", "إلغاء الفاتورة")} onClick={() => void removeInvoice(invoice)}><Trash2 className="size-4"/></button>
          </div>
        </article>;})}</div>}
    </section>
    {dialog && <div className={ui("modal-backdrop")}><form className={ui("modal")} onSubmit={dialog === "invoice" ? createInvoice : pay}>
      <div className={ui("modal-head")}><div><span className={ui("eyebrow")}>{text("Facturation patient", "فوترة المريض")}</span><h2>{dialog === "invoice" ? (editingInvoice ? text("Modifier le document", "تعديل المستند") : text("Nouveau document", "مستند جديد")) : `${text("Paiement", "دفعة")} ${selected?.invoiceNumber}`}</h2></div>
        <button type="button" className={ui("icon-button")} aria-label={text("Fermer", "إغلاق")} onClick={() => { setDialog(null); setEditingInvoice(null); }}>×</button></div>
      {dialog === "invoice" ? <div className="space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <p className="text-xs leading-5 text-slate-600">
            {text("Renseignez les informations du document.", "أدخل معلومات المستند.")} <span className="font-bold text-red-500">*</span> {text("Tous les champs sont obligatoires.", "جميع الحقول إلزامية.")}
          </p>
          {activePatient && <div className="flex items-center gap-2.5 rounded-lg bg-white px-3 py-2 shadow-sm ring-1 ring-slate-200">
            <span className="grid size-8 place-items-center rounded-lg bg-teal-50 text-teal-700"><UserRound className="size-4"/></span>
            <div>
              <span className="mb-0.5 block text-[9px] font-bold uppercase tracking-wider text-slate-400">{text("Patient", "المريض")} <span className="text-red-500">*</span></span>
              <strong className="block text-xs text-slate-800">{activePatient.firstName} {activePatient.lastName}</strong>
              <span className="block text-[10px] text-slate-500">{activePatient.patientNumber}</span>
            </div>
          </div>}
        </div>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{text("Informations du document", "معلومات المستند")}</h3>
            <p className="mt-1 text-[11px] text-slate-500">{text("Choisissez le type et la date du document.", "اختر نوع المستند وتاريخه.")}</p>
          </header>
          <div className="grid grid-cols-2 gap-4 max-[620px]:grid-cols-1">
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">{text("Type du document", "نوع المستند")} <span className="text-red-500">*</span></span>
              <div className="relative">
                <FileText aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"/>
                <select
                    required
                    disabled={Boolean(editingInvoice && editingInvoice.status !== "BROUILLON")}
                    className="h-12 w-full appearance-none rounded-xl border border-slate-200 bg-white pl-10 pr-10 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
                    value={invoiceForm.type}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, type: e.target.value })}
                >
                  <option value="DEVIS">{text("Devis", "عرض سعر")}</option>
                  <option value="FACTURE">{text("Facture", "فاتورة")}</option>
                  <option value="AVOIR">{text("Avoir", "إشعار دائن")}</option>
                </select>
              </div>
            </label>

            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">{text("Date", "التاريخ")} <span className="text-red-500">*</span></span>
              <div className="relative">
                <CalendarDays aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"/>
                <input
                    required
                    type="date"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
                    value={invoiceForm.invoiceDate}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceDate: e.target.value })}
                />
              </div>
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <header className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">{text("Montant du document", "مبلغ المستند")}</h3>
            <p className="mt-1 text-[11px] text-slate-500">{text("Indiquez uniquement le prix total à facturer.", "أدخل فقط المبلغ الإجمالي للفوترة.")}</p>
          </header>
          <div>
            <label className="block min-w-0">
              <span className="mb-1.5 block text-xs font-bold text-slate-700">{text("Prix (MAD)", "السعر (درهم)")} <span className="text-red-500">*</span></span>
              <div className="relative">
                <BadgeDollarSign aria-hidden="true" className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400"/>
                <input
                    required
                    autoFocus
                    type="number"
                    min={Math.max(0.01, minimumEditableTotal)}
                    step="0.01"
                    inputMode="decimal"
                    className="h-12 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-3 text-sm font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-3 focus:ring-teal-100"
                    placeholder={text("Saisir le prix", "أدخل السعر")}
                    value={invoiceForm.unitPrice}
                    onChange={(e) => setInvoiceForm({ ...invoiceForm, unitPrice: e.target.value })}
                />
              </div>
            </label>
          </div>
        </section>

        <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-200 bg-teal-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-white text-teal-700 shadow-sm"><Calculator className="size-5"/></span>
            <div>
              <span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700">{text("Total du document", "إجمالي المستند")}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{text("Prix facturé", "المبلغ المفوتر")}</span>
            </div>
          </div>
          <strong className="text-xl text-teal-900">{money.format(invoiceTotal)}</strong>
        </div>
      </div> : <div className={ui("form-grid")}>
        <div className="col-span-full grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 max-[620px]:grid-cols-1">
          <div><span className="block text-[10px] font-bold uppercase tracking-wider text-slate-500">{text("Total facture", "إجمالي الفاتورة")}</span><strong className="mt-1 block text-base text-slate-900">{money.format(Number(selected?.totalAmount ?? 0))}</strong></div>
          <div><span className="block text-[10px] font-bold uppercase tracking-wider text-emerald-700">{text("Déjà payé", "المدفوع سابقاً")}</span><strong className="mt-1 block text-base text-emerald-900">{money.format(Number(selected?.paidAmount ?? 0))}</strong></div>
          <div><span className="block text-[10px] font-bold uppercase tracking-wider text-amber-700">{text("Crédit avant versement", "الرصيد قبل الدفعة")}</span><strong className="mt-1 block text-base text-amber-900">{money.format(remainingBeforePayment)}</strong></div>
        </div>
        <label>{text("Montant reçu maintenant (MAD)", "المبلغ المستلم الآن (درهم)")} <b>*</b><input required type="number" min="0.01" max={selected?.remainingAmount} step="0.01" placeholder={text("Saisir le montant versé", "أدخل مبلغ الدفعة")} value={payment.amount} onChange={(e) => setPayment({ ...payment, amount: e.target.value })}/></label>
        <label>{text("Mode de paiement", "طريقة الدفع")}<select value={payment.paymentMethod} onChange={(e) => setPayment({ ...payment, paymentMethod: e.target.value })}><option value="ESPECES">{text("Espèces", "نقداً")}</option><option value="CARTE_BANCAIRE">{text("Carte bancaire", "بطاقة بنكية")}</option><option value="VIREMENT">{text("Virement", "تحويل بنكي")}</option><option value="CHEQUE">{text("Chèque", "شيك")}</option><option value="AUTRE">{text("Autre", "أخرى")}</option></select></label>
        <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
          <div><span className="block text-[10px] font-bold uppercase tracking-wider text-teal-700">{text("Après ce versement", "بعد هذه الدفعة")}</span>
            <strong className={remainingAfterPayment > 0 ? "mt-1 block text-base text-amber-800" : "mt-1 block text-base text-emerald-800"}>
              {payment.amount
                  ? remainingAfterPayment > 0
                      ? text(`Crédit restant : ${money.format(remainingAfterPayment)}`, `الرصيد المتبقي: ${money.format(remainingAfterPayment)}`)
                      : text("Facture entièrement soldée", "الفاتورة مسددة بالكامل")
                  : text("Saisissez le montant reçu", "أدخل المبلغ المستلم")}
            </strong>
          </div>
          <button type="button" className={ui("button ghost")} onClick={() => setPayment({ ...payment, amount: String(remainingBeforePayment) })}>
            {text("Solder tout le reste", "تسديد الرصيد كاملاً")}
          </button>
        </div>
      </div>}
      <div className={ui("modal-actions")}><button type="button" className={ui("button ghost")} onClick={() => { setDialog(null); setEditingInvoice(null); }}>{text("Annuler", "إلغاء")}</button><button className={ui("button primary")} disabled={dialog === "payment" && !paymentIsValid}>{dialog === "payment" ? text("Enregistrer le versement", "حفظ الدفعة") : editingInvoice ? text("Enregistrer les modifications", "حفظ التعديلات") : text("Créer le document", "إنشاء المستند")}</button></div>
    </form></div>}
  </>;
}

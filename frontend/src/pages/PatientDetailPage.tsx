import { ui } from "../styles";
import {
    ArrowLeft, CalendarDays, CalendarPlus, CircleDollarSign, ClipboardPlus, CreditCard,
    FilePlus2, FileText, HeartPulse, IdCard, MapPin, Pencil, Phone, ShieldCheck,
    Stethoscope, UserRound, UsersRound, X
} from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../services/api";
import { useAuthStore } from "../store/authStore";
import type { Appointment, Consultation, Invoice, Patient, TreatmentPlan } from "../types";
type Tab = "consultations" | "plans" | "appointments" | "invoices";
const consultationInitial = () => ({
    consultationAt: new Date().toISOString().slice(0, 16), reason: "", diagnosis: "",
    diseaseType: "", tooth: "", treatmentPerformed: "", observations: "",
    prescription: "", price: "", treatmentStatus: "", treatmentPlanId: "",
    billingMode: "VISITE_SUIVI", invoiceId: "", amountPaid: "", paymentMethod: "ESPECES"
});
export function PatientDetailPage() {
    const { id = "" } = useParams();
    const navigate = useNavigate();
    const { text, locale } = useLanguage();
    function translatedValue(value: string, labels: Record<string, [string, string]>) {
        const label = labels[value];
        return label ? text(label[0], label[1]) : value.replaceAll("_", " ");
    }
    const invoiceTypeLabel = (value: string) => translatedValue(value, {
        FACTURE: ["Facture", "فاتورة"],
        DEVIS: ["Devis", "عرض سعر"],
        AVOIR: ["Avoir", "إشعار دائن"]
    });
    const role = useAuthStore((state) => state.user?.role);
    const [patient, setPatient] = useState<Patient | null>(null);
    const [tab, setTab] = useState<Tab>("consultations");
    const [consultations, setConsultations] = useState<Consultation[]>([]);
    const [plans, setPlans] = useState<TreatmentPlan[]>([]);
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [dialog, setDialog] = useState<"consultation" | "plan" | null>(null);
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<Record<string, string>>({});
    const [consultation, setConsultation] = useState(consultationInitial);
    const [plan, setPlan] = useState({ title: "", startDate: new Date().toISOString().slice(0, 10), notes: "" });
    const [feedback, setFeedback] = useState("");
    const [consultationError, setConsultationError] = useState("");
    const treatmentInvoices = invoices.filter((invoice) =>
        invoice.type === "FACTURE"
        && !["ANNULEE", "SOLDEE"].includes(invoice.status)
        && Number(invoice.remainingAmount) > 0);
    const selectedPayableInvoice = treatmentInvoices.find(
        (invoice) => invoice.id === consultation.invoiceId);
    const lastConsultationAt = consultations.length
        ? Math.max(...consultations.map((item) => new Date(item.consultationAt).getTime()))
        : 0;
    const appointmentForVisit = appointments
        .filter((appointment) =>
            ["PLANIFIE", "CONFIRME", "PATIENT_ARRIVE", "EN_CONSULTATION"].includes(appointment.status)
            && new Date(appointment.startsAt).getTime() > lastConsultationAt)
        .sort((first, second) =>
            Math.abs(new Date(first.startsAt).getTime() - Date.now())
            - Math.abs(new Date(second.startsAt).getTime() - Date.now()))[0];
    const lastVisitAppointment = lastConsultationAt
        ? appointments
            .filter((appointment) =>
                !["ANNULE", "ABSENT", "REPORTE"].includes(appointment.status)
                && new Date(appointment.startsAt).getTime() <= Date.now())
            .sort((first, second) =>
                Math.abs(new Date(first.startsAt).getTime() - lastConsultationAt)
                - Math.abs(new Date(second.startsAt).getTime() - lastConsultationAt))[0]
        : undefined;
    const lastVisitDate = lastVisitAppointment?.startsAt || patient?.lastVisitAt;
    const hasNewUsableAppointment = appointments.some((appointment) =>
        ["PLANIFIE", "CONFIRME", "PATIENT_ARRIVE", "EN_CONSULTATION"].includes(appointment.status)
        && new Date(appointment.startsAt).getTime() > lastConsultationAt);
    const consultationRequiresAppointment =
        patient?.fileStatus === "TRAITEMENT_TERMINE" && !hasNewUsableAppointment;
    const remainingAfterVisit = selectedPayableInvoice
        ? Math.max(0, Number(selectedPayableInvoice.remainingAmount) - Number(consultation.amountPaid || 0))
        : 0;
    async function load() {
        const access = await api.get<{ allowed: boolean; reason: string }>(
            `/appointments/patients/${id}/dossier-access`
        );
        if (!access.allowed) {
            window.alert(text(
                "Planifiez d’abord un nouveau rendez-vous actif pour accéder au dossier médical de ce patient.",
                "يرجى أولاً برمجة موعد جديد صالح قبل الدخول إلى الملف الطبي لهذا المريض."
            ));
            navigate("/patients", { replace: true });
            return;
        }
        const now = new Date();
        const from = new Date(now);
        from.setFullYear(from.getFullYear() - 10);
        const to = new Date(now);
        to.setFullYear(to.getFullYear() + 10);
        const [p, c, treatmentPlans, allAppointments, inv] = await Promise.all([
            api.get<Patient>(`/patients/${id}`),
            api.get<Consultation[]>(`/patients/${id}/consultations`),
            api.get<TreatmentPlan[]>(`/patients/${id}/treatment-plans`),
            api.get<Appointment[]>(`/appointments?from=${from.toISOString()}&to=${to.toISOString()}`),
            api.get<Invoice[]>(`/patients/${id}/invoices`)
        ]);
        setPatient(p);
        setConsultations(c);
        setPlans(treatmentPlans);
        setAppointments(allAppointments.filter((item) => item.patientId === id));
        setInvoices(inv);
    }
    useEffect(() => { void load().catch(() => setFeedback(text("Impossible de charger le dossier.", "تعذر تحميل ملف المريض."))); }, [id, text]);
    async function createConsultation(event: FormEvent) {
        event.preventDefault();
        const amountPaid = Number(consultation.amountPaid);
        const selectedInvoice = treatmentInvoices.find((invoice) => invoice.id === consultation.invoiceId);
        if (!consultation.consultationAt
            || !consultation.treatmentStatus
            || !selectedInvoice
            || consultation.amountPaid === ""
            || !Number.isFinite(amountPaid)
            || amountPaid <= 0
            || amountPaid > Number(selectedInvoice.remainingAmount)) {
            setConsultationError(text(
                "Sélectionnez une facture et renseignez correctement le montant payé.",
                "اختر فاتورة وأدخل المبلغ المؤدى بشكل صحيح."
            ));
            return;
        }
        setConsultationError("");
        try {
            if (selectedInvoice.status === "BROUILLON") {
                await api.post(`/patient-invoices/${selectedInvoice.id}/validate`);
            }
            await api.post(`/patients/${id}/consultations/with-billing`, {
                consultation: {
                    treatmentPlanId: consultation.treatmentPlanId || null,
                    consultationAt: new Date(consultation.consultationAt).toISOString(),
                    reason: appointmentForVisit?.reason || appointmentForVisit?.treatmentType || "",
                    diagnosis: "",
                    diseaseType: appointmentForVisit?.treatmentType || appointmentForVisit?.reason
                        || selectedPayableInvoice?.items[0]?.description || "",
                    tooth: "",
                    treatmentPerformed: "",
                    observations: "",
                    prescription: "",
                    price: 0,
                    treatmentStatus: consultation.treatmentStatus
                },
                billingMode: "VISITE_SUIVI",
                invoiceId: consultation.invoiceId,
                amountPaid,
                paymentMethod: consultation.paymentMethod
            });
            setDialog(null);
            setConsultation(consultationInitial());
            setFeedback(text(
                "Visite et paiement enregistrés. Le Total payé a été mis à jour.",
                "تم حفظ الزيارة والأداء وتحديث إجمالي المبلغ المؤدى."
            ));
            await load();
        }
        catch (reason) {
            setConsultationError((reason as { message?: string }).message ?? text("Impossible d’enregistrer la consultation.", "تعذر حفظ الاستشارة."));
        }
    }
    function openConsultation() {
        if (consultationRequiresAppointment) {
            setFeedback(text(
                "Planifiez un nouveau rendez-vous avant de créer une nouvelle consultation.",
                "يرجى برمجة موعد جديد قبل إنشاء استشارة جديدة."
            ));
            return;
        }
        const initial = consultationInitial();
        const invoiceWithCredit = treatmentInvoices[0];
        setConsultation({
            ...initial,
            billingMode: "VISITE_SUIVI",
            invoiceId: invoiceWithCredit?.id || "",
            price: "0",
            reason: appointmentForVisit?.reason || appointmentForVisit?.treatmentType || ""
        });
        setConsultationError("");
        setFeedback("");
        setDialog("consultation");
    }
    async function createPlan(event: FormEvent) {
        event.preventDefault();
        await api.post(`/patients/${id}/treatment-plans`, plan);
        setDialog(null);
        setPlan({ title: "", startDate: new Date().toISOString().slice(0, 10), notes: "" });
        setFeedback(text("Nouveau plan de traitement créé.", "تم إنشاء خطة علاج جديدة."));
        await load();
    }
    async function completePlan(planId: string) {
        await api.post(`/treatment-plans/${planId}/complete`);
        setFeedback(text("Plan marqué comme terminé.", "تم تحديد خطة العلاج كمكتملة."));
        await load();
    }
    function openEdit() {
        setEditForm({
            firstName: patient?.firstName || "", lastName: patient?.lastName || "", cin: patient?.cin || "",
            primaryPhone: patient?.primaryPhone || "", secondaryPhone: patient?.secondaryPhone || "",
            city: patient?.city || "", birthDate: patient?.birthDate || "", sex: patient?.sex || "", email: patient?.email || "",
            allergies: patient?.allergies || "", medicalHistory: patient?.medicalHistory || "", observations: patient?.observations || ""
        });
        setEditOpen(true);
    }
    async function savePatient(event: FormEvent) {
        event.preventDefault();
        const payload = {
            ...Object.fromEntries(Object.entries(editForm).map(([key, value]) => [key, value || null])),
            address: null,
            coverageType: patient?.coverageType || "SANS_ASSURANCE",
            membershipNumber: patient?.membershipNumber || null
        };
        await api.put(`/patients/${id}`, payload);
        setEditOpen(false);
        setFeedback(text("Informations administratives mises à jour.", "تم تحديث المعلومات الإدارية."));
        await load();
    }
    if (!patient)
        return <div className={ui("splash")}>{feedback || text("Chargement du dossier…", "جارٍ تحميل الملف…")}</div>;
    return <>
    <Link className={ui("back-link")} to="/patients"><ArrowLeft size={17} className="rtl:rotate-180"/> {text("Retour aux patients", "العودة إلى المرضى")}</Link>
    <section className={ui("patient-hero panel")}>
      <div className={ui("patient-avatar")}>{patient.firstName[0]}{patient.lastName[0]}</div>
      <div className={ui("patient-title")}><span className={ui("eyebrow")}>{text("Dossier permanent", "ملف دائم")} · {patient.patientNumber}</span>
        <h1>{patient.fullName || `${patient.firstName} ${patient.lastName}`}</h1>
        <p>{patient.primaryPhone} · {patient.cin || text("CIN non renseignée", "رقم البطاقة الوطنية غير مسجل")}</p></div>
      <div className={ui("patient-status")}><StatusBadge value={patient.fileStatus}/></div>
      <div className={ui("patient-actions")}>
        <button className={ui("button primary")} disabled={consultationRequiresAppointment} title={consultationRequiresAppointment ? text("Planifiez d’abord un nouveau rendez-vous.", "يرجى برمجة موعد جديد أولاً.") : undefined} onClick={openConsultation}><ClipboardPlus size={17}/> {text("Nouvelle visite", "زيارة جديدة")}</button>
        <Link className={ui("button ghost")} to={`/calendar?patient=${id}`}><CalendarPlus size={17}/> {text("Nouveau rendez-vous", "موعد جديد")}</Link>
        <button className={ui("button ghost")} onClick={openEdit}><Pencil size={17}/> {text("Modifier", "تعديل")}</button>
      </div>
    </section>
    {patient.fileStatus === "TRAITEMENT_TERMINE" && <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-emerald-900">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-100"><ShieldCheck size={18}/></span>
      <div>
        <strong className="block text-sm">{text("Dernier traitement terminé", "اكتمل العلاج الأخير")}</strong>
        <p className="mt-1 text-xs leading-5 text-emerald-700">{text(
            "Le dossier permanent reste ouvert. Si le patient revient, créez un nouveau rendez-vous puis une nouvelle consultation dans ce même dossier.",
            "يبقى الملف الدائم مفتوحاً. إذا عاد المريض، أنشئ موعداً جديداً ثم استشارة جديدة داخل نفس الملف."
        )}</p>
      </div>
    </div>}
    {feedback && <div className={ui("alert alert-success")}>{feedback}</div>}
    <div className={ui("patient-facts")}>
      <article><span>{text("Ville / adresse", "المدينة / العنوان")}</span><strong>{[patient.city, patient.address].filter(Boolean).join(" · ") || "—"}</strong></article>
      <article><span>{text("Informations médicales", "المعلومات الطبية")}</span><strong>{[patient.allergies, patient.medicalHistory].filter(Boolean).join(" · ") || text("Aucune renseignée", "لا توجد معلومات")}</strong></article>
      <article>
        <span>{text("Dernière visite (date du rendez-vous)", "آخر زيارة (تاريخ الموعد)")}</span>
        <strong>{lastVisitDate ? new Date(lastVisitDate).toLocaleDateString(locale) : "—"}</strong>
      </article>
    </div>
    <div className={ui("tabs")}>
      {(["consultations", "appointments", "invoices", "messages"] as Tab[]).map((value) => <button key={value} className={ui(tab === value ? "active" : "")} onClick={() => setTab(value)}>
          {({
              consultations: text("Visites", "الزيارات"),
              plans: text("Plans de traitement", "خطط العلاج"),
              appointments: text("Rendez-vous", "المواعيد"),
              invoices: text("Factures", "الفواتير"),
          })[value]}
        </button>)}
    </div>
    <section className={ui("panel")}>
      {tab === "consultations" && <><div className={ui("panel-title")}><div><span className={ui("eyebrow")}>{text("Historique des visites", "سجل الزيارات")}</span><h2>{text("Suivi du traitement", "متابعة العلاج")}</h2><p className="mt-1 text-xs text-slate-500">{text("Chaque visite est conservée séparément avec son état d’avancement.", "يتم الاحتفاظ بكل زيارة بشكل مستقل مع حالة تقدم العلاج.")}</p></div></div>
        {!consultations.length ? <EmptyState message={text("Aucune visite enregistrée.", "لا توجد أي زيارة مسجلة.")}/> :
                <div className="grid gap-3">{consultations.map((item, index) => <article key={item.id} className="grid grid-cols-[150px_1fr_auto] items-center gap-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm max-[720px]:grid-cols-1">
                  <div><span className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-700">{text(`Visite ${String(consultations.length - index).padStart(2, "0")}`, `زيارة ${String(consultations.length - index).padStart(2, "0")}`)}</span><time className="mt-1 block text-xs font-semibold text-slate-700">{new Date(item.consultationAt).toLocaleString(locale)}</time></div>
                  <div><h3 className="text-sm font-bold text-slate-900">{item.diseaseType || item.reason || text("Visite patient", "زيارة المريض")}</h3><p className="mt-1 text-xs text-slate-500">{item.treatmentPerformed || item.diagnosis || text("Visite enregistrée dans le dossier permanent.", "زيارة مسجلة في الملف الدائم.")}</p>
                    <small className="mt-2 block text-[10px] font-medium text-slate-500">{text("Montant de la visite :", "مبلغ الزيارة:")} {Number(item.price).toFixed(2)} {text("MAD", "د.م.")}</small></div>
                  <div className="justify-self-end max-[720px]:justify-self-start"><StatusBadge value={item.treatmentStatus}/></div>
                </article>)}</div>}</>}
      {tab === "plans" && <><div className={ui("panel-title")}><div><span className={ui("eyebrow")}>{text("Suivi à long terme", "المتابعة طويلة المدى")}</span><h2>{text("Plans de traitement", "خطط العلاج")}</h2></div>
        <button className={ui("button primary")} onClick={() => setDialog("plan")}><FilePlus2 size={17}/> {text("Nouveau plan", "خطة جديدة")}</button></div>
        {!plans.length ? <EmptyState message={text("Aucun plan de traitement.", "لا توجد خطة علاج.")}/> : <div className={ui("card-list")}>{plans.map((item) => <article key={item.id}>
          <div><span className={ui("eyebrow")}>{item.planNumber}</span><h3>{item.title}</h3><p>{item.notes || text("Sans note", "بدون ملاحظات")}</p></div>
          <StatusBadge value={item.status}/>{role === "DOCTEUR" && item.status !== "TERMINE" && <button className={ui("button ghost")} onClick={() => completePlan(item.id)}>{text("Terminer", "إنهاء")}</button>}</article>)}</div>}</>}
      {tab === "appointments" && (!appointments.length ? <EmptyState message={text("Aucun rendez-vous dans l’historique.", "لا يوجد أي موعد في السجل.")}/> : <div className={ui("card-list")}>{appointments.map((item) => <article key={item.id}><div><h3>{new Date(item.startsAt).toLocaleString(locale)}</h3><p>{item.reason}</p></div><StatusBadge value={item.status}/></article>)}</div>)}
      {tab === "invoices" && (!invoices.length ? <EmptyState message={text("Aucune facture pour ce patient.", "لا توجد فاتورة لهذا المريض.")}/> : <>
        <div className={ui("card-list")}>{invoices.map((item) => {
            const isPayableInvoice = item.type === "FACTURE" && !["BROUILLON", "ANNULEE"].includes(item.status);
            const remaining = Number(item.remainingAmount);
            return <article key={item.id}><div><span className={ui("eyebrow")}>{invoiceTypeLabel(item.type)}</span><h3>{item.invoiceNumber}</h3>
              {isPayableInvoice ? <p>{text("Total", "الإجمالي")} {Number(item.totalAmount).toFixed(2)} {text("MAD", "د.م.")} · {text("Payé", "المدفوع")} {Number(item.paidAmount).toFixed(2)} {text("MAD", "د.م.")} · <strong className={remaining > 0 ? "text-amber-700" : "text-emerald-700"}>{remaining > 0 ? text(`Crédit restant ${remaining.toFixed(2)} MAD`, `الرصيد المتبقي ${remaining.toFixed(2)} د.م.`) : text("Facture soldée", "الفاتورة مدفوعة بالكامل")}</strong></p>
                  : <p>{text("Montant", "المبلغ")} {Number(item.totalAmount).toFixed(2)} {text("MAD", "د.م.")} · {text("Document non comptabilisé dans le crédit", "وثيقة غير محتسبة ضمن الرصيد")}</p>}
            </div><StatusBadge value={item.status}/></article>;
        })}</div>
      </>)}
    </section>
    {dialog && <div className={ui("modal-backdrop")}><form
        className={dialog === "consultation" ? ui("modal patient-modal") : ui("modal wide")}
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialog === "consultation" ? "consultation-dialog-title" : "plan-dialog-title"}
        onSubmit={dialog === "consultation" ? createConsultation : createPlan}
    >
      <div className={dialog === "consultation" ? ui("patient-modal-head") : ui("modal-head")}><div>
        <span className={ui("eyebrow")}>{text("Dossier", "ملف")} {patient.patientNumber} · {patient.fullName || `${patient.firstName} ${patient.lastName}`}</span>
        <h2 id={dialog === "consultation" ? "consultation-dialog-title" : "plan-dialog-title"}>{dialog === "consultation" ? text("Nouvelle visite", "زيارة جديدة") : text("Nouveau plan de traitement", "خطة علاج جديدة")}</h2>
        {dialog === "consultation" && <p>{text("Renseignez le compte rendu clinique. Les champs marqués", "أدخل التقرير السريري. الحقول المشار إليها بـ")} <b>*</b> {text("sont obligatoires ; le plan de traitement reste facultatif.", "إلزامية؛ وتبقى خطة العلاج اختيارية.")}</p>}
      </div>
        <button type="button" className={ui("icon-button")} aria-label={text("Fermer", "إغلاق")} onClick={() => { setDialog(null); setConsultationError(""); }}>×</button></div>
      {dialog === "plan" ? <div className={ui("form-grid")}>
        <label>{text("Titre", "العنوان")}<input required placeholder={text("Saisir le titre du plan", "أدخل عنوان الخطة")} value={plan.title} onChange={(e) => setPlan({ ...plan, title: e.target.value })}/></label>
        <label>{text("Date de début", "تاريخ البداية")}<input type="date" required value={plan.startDate} onChange={(e) => setPlan({ ...plan, startDate: e.target.value })}/></label>
        <label className={ui("full-field")}>{text("Notes", "ملاحظات")}<textarea placeholder={text("Saisir des notes", "أدخل ملاحظات")} value={plan.notes} onChange={(e) => setPlan({ ...plan, notes: e.target.value })}/></label>
      </div> : <div className={ui("patient-modal-body")}>
        {consultationError && <div className={ui("alert alert-error")} role="alert">{consultationError}</div>}

        <section className={ui("patient-form-section")}>
          <header><span><CalendarPlus/></span><div><h3>{text("Informations de la consultation", "معلومات الاستشارة")}</h3><p>{text("Date, rattachement au plan et état d’avancement du soin.", "التاريخ وخطة العلاج وحالة تقدم الرعاية.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <div className="col-span-full grid grid-cols-2 gap-3 max-[650px]:grid-cols-1">
              <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
                <small className="block text-[10px] font-bold uppercase tracking-wide text-blue-600">
                  {text("Rendez-vous prévu", "الموعد المبرمج")}
                </small>
                <strong className="mt-1 block text-sm text-slate-900">
                  {appointmentForVisit
                      ? new Date(appointmentForVisit.startsAt).toLocaleString(locale, {
                          dateStyle: "medium", timeStyle: "short"
                      })
                      : text("Aucun rendez-vous lié", "لا يوجد موعد مرتبط")}
                </strong>
              </div>
              <div className="rounded-xl border border-teal-200 bg-teal-50 px-4 py-3">
                <small className="block text-[10px] font-bold uppercase tracking-wide text-teal-700">
                  {text("Visite / consultation réelle", "الزيارة / الاستشارة الفعلية")}
                </small>
                <strong className="mt-1 block text-sm text-slate-900">
                  {consultation.consultationAt
                      ? new Date(consultation.consultationAt).toLocaleString(locale, {
                          dateStyle: "medium", timeStyle: "short"
                      })
                      : "—"}
                </strong>
              </div>
            </div>
            <label className={ui("patient-field")}><span>{text("Date et heure", "التاريخ والوقت")} <b>*</b></span><div className={ui("patient-input")}><CalendarPlus/><input
                name="consultationAt"
                type="datetime-local"
                required
                value={consultation.consultationAt}
                onChange={(e) => setConsultation({ ...consultation, consultationAt: e.target.value })}
            /></div></label>
            <label className={ui("patient-field")}><span>{text("Type de traitement du rendez-vous", "نوع علاج الموعد")}</span><div className={ui("patient-input")}><FileText/><input
                readOnly
                value={appointmentForVisit?.treatmentType || appointmentForVisit?.reason || selectedPayableInvoice?.items[0]?.description || text("Non renseigné dans le rendez-vous", "غير مسجل في الموعد")}
            /></div><small>{text(
                "Cette information vient automatiquement du rendez-vous du patient.",
                "تأتي هذه المعلومة تلقائياً من موعد المريض."
            )}</small></label>
            <label className={ui("patient-field full-field")}><span>{text("Statut du soin", "حالة العلاج")} <b>*</b></span><div className={ui("patient-input")}><HeartPulse/><select
                name="treatmentStatus"
                required
                value={consultation.treatmentStatus}
                onChange={(e) => setConsultation({ ...consultation, treatmentStatus: e.target.value })}
            ><option value="" disabled>{text("Sélectionner le statut du soin", "اختر حالة العلاج")}</option><option value="EN_COURS">{text("En cours", "قيد العلاج")}</option><option value="TERMINE">{text("Terminé", "مكتمل")}</option></select></div>
              <small>{text(
                  "En cours : le patient est toujours en traitement · Terminé : le traitement avec le médecin est achevé, même si un crédit reste à payer.",
                  "قيد العلاج: المريض ما زال يتلقى العلاج · مكتمل: انتهى العلاج مع الطبيب حتى إن بقي مبلغ غير مؤدى."
              )}</small>
            </label>
          </div>
        </section>

        {false && <><section className={ui("patient-form-section")}>
          <header><span><Stethoscope/></span><div><h3>{text("Examen clinique", "الفحص السريري")}</h3><p>{text("Contexte de la visite, acte concerné et diagnostic du praticien.", "سبب الزيارة والإجراء المعني وتشخيص الطبيب.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <label className={ui("patient-field")}><span>{text("Acte / type de consultation", "الإجراء / نوع الاستشارة")} <b>*</b></span><div className={ui("patient-input")}><Stethoscope/><input
                name="diseaseType"
                required
                maxLength={120}
                placeholder={text("Saisir l’acte ou le type de consultation", "أدخل الإجراء أو نوع الاستشارة")}
                value={consultation.diseaseType}
                onChange={(e) => setConsultation({ ...consultation, diseaseType: e.target.value })}
            /></div></label>
            <label className={ui("patient-field")}><span>{text("Dent concernée", "السن المعني")} <b>*</b></span><div className={ui("patient-input")}><Stethoscope/><input
                name="tooth"
                required
                maxLength={30}
                placeholder={text("Saisir la dent ou indiquer « Général »", "أدخل رقم السن أو اكتب «عام»")}
                value={consultation.tooth}
                onChange={(e) => setConsultation({ ...consultation, tooth: e.target.value })}
            /></div></label>
            <label className={ui("patient-field full-field")}><span>{text("Motif de la consultation", "سبب الاستشارة")} <b>*</b></span><div className={ui("patient-input")}><ClipboardPlus/><input
                name="reason"
                required
                maxLength={255}
                placeholder={text("Saisir le motif de la consultation", "أدخل سبب الاستشارة")}
                value={consultation.reason}
                onChange={(e) => setConsultation({ ...consultation, reason: e.target.value })}
            /></div></label>
            <label className={ui("patient-field full-field")}><span>{text("Diagnostic", "التشخيص")} <b>*</b></span><textarea
                name="diagnosis"
                required
                maxLength={8000}
                placeholder={text("Saisir le diagnostic clinique", "أدخل التشخيص السريري")}
                value={consultation.diagnosis}
                onChange={(e) => setConsultation({ ...consultation, diagnosis: e.target.value })}
            /></label>
          </div>
        </section>

        <section className={ui("patient-form-section medical")}>
          <header><span><HeartPulse/></span><div><h3>{text("Soins et suivi médical", "العلاج والمتابعة الطبية")}</h3><p>{text("Actes réalisés, prescription et informations utiles pour le prochain suivi.", "العلاجات المنجزة والوصفة والمعلومات المفيدة للمتابعة القادمة.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <label className={ui("patient-field")}><span>{text("Traitement effectué", "العلاج المنجز")} <b>*</b></span><textarea
                name="treatmentPerformed"
                required
                maxLength={8000}
                placeholder={text("Décrire le traitement effectué", "صف العلاج الذي تم إنجازه")}
                value={consultation.treatmentPerformed}
                onChange={(e) => setConsultation({ ...consultation, treatmentPerformed: e.target.value })}
            /></label>
            <label className={ui("patient-field")}><span>{text("Ordonnance / prescription", "الوصفة الطبية")} <b>*</b></span><textarea
                name="prescription"
                required
                maxLength={8000}
                placeholder={text("Saisir la prescription ou indiquer « Aucune »", "أدخل الوصفة أو اكتب «لا توجد»")}
                value={consultation.prescription}
                onChange={(e) => setConsultation({ ...consultation, prescription: e.target.value })}
            /></label>
            <label className={ui("patient-field full-field")}><span>{text("Observations complémentaires", "ملاحظات إضافية")} <b>*</b></span><textarea
                name="observations"
                required
                maxLength={8000}
                placeholder={text("Saisir les observations ou indiquer « RAS »", "أدخل الملاحظات أو اكتب «لا شيء يُذكر»")}
                value={consultation.observations}
                onChange={(e) => setConsultation({ ...consultation, observations: e.target.value })}
            /></label>
          </div>
        </section>

        </>}

        {consultation.treatmentStatus && <section className={ui("patient-form-section")}>
          <header><span><CircleDollarSign/></span><div><h3>{text("Soin et règlement de la visite", "العلاج وأداء الزيارة")}</h3><p>{text("Un nouveau soin est facturé une seule fois. Une visite de suivi enregistre uniquement un versement sur le crédit existant.", "يتم احتساب العلاج الجديد مرة واحدة فقط. أما زيارة المتابعة فتسجل دفعة على الرصيد المتبقي فقط.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <label className={ui("patient-field")}><span>{text("Total facturé — lecture seule (MAD)", "إجمالي الفاتورة — للقراءة فقط (د.م.)")}</span><div className={ui("patient-input")}><CircleDollarSign/><input
                  type="text"
                  readOnly
                  value={`${Number(selectedPayableInvoice?.totalAmount || 0).toFixed(2)} MAD`}
                  aria-label={text("Prix total enregistré du soin", "السعر الإجمالي المسجل للعلاج")}
              /></div><small>{text("Ce total vient de la facture et ne peut pas être modifié ici.", "هذا الإجمالي مأخوذ من الفاتورة ولا يمكن تعديله هنا.")}</small></label>
            {consultation.billingMode === "NOUVEAU_SOIN" ? <>
              <label className={ui("patient-field")}><span>{text("Montant payé aujourd’hui (MAD)", "المبلغ المؤدى اليوم (د.م.)")} <b>*</b></span><div className={ui("patient-input")}><CircleDollarSign/><input
                  type="number" inputMode="decimal" required min="0" max={consultation.price || undefined} step="0.01"
                  placeholder={text("Ex. 150", "مثال: 150")} value={consultation.amountPaid}
                  onChange={(e) => setConsultation({ ...consultation, amountPaid: e.target.value })}
              /></div><small>{text("La différence devient automatiquement le crédit restant.", "يصبح الفرق تلقائياً هو الرصيد المتبقي.")}</small></label>
            </> : <>
              <label className={ui("patient-field full-field")}><span>{text("Soin avec crédit restant", "العلاج ذو الرصيد المتبقي")} <b>*</b></span><div className={ui("patient-input")}><FileText/><select
                  required disabled={treatmentInvoices.length === 0} value={consultation.invoiceId}
                  onChange={(e) => setConsultation({ ...consultation, invoiceId: e.target.value })}
              >
                <option value="">{treatmentInvoices.length
                    ? text("Sélectionner le soin concerné", "اختر العلاج المعني")
                    : text("Aucun soin avec crédit restant", "لا يوجد علاج برصيد متبقٍ")}</option>
                {treatmentInvoices.map((invoice) => <option key={invoice.id} value={invoice.id}>
                  {invoice.invoiceNumber} · {invoice.items[0]?.description || text("Soin", "علاج")} · {Number(invoice.remainingAmount).toFixed(2)} {text("MAD restant", "د.م. متبقية")}
                </option>)}
              </select></div></label>
              <label className={ui("patient-field")}><span>{text("Montant payé aujourd’hui (MAD)", "المبلغ المؤدى اليوم (د.م.)")} <b>*</b></span><div className={ui("patient-input")}><CircleDollarSign/><input
                  type="number" inputMode="decimal" required min="0.01"
                  max={treatmentInvoices.find((invoice) => invoice.id === consultation.invoiceId)?.remainingAmount}
                  step="0.01" placeholder={text("Saisir le versement", "أدخل مبلغ الدفعة")}
                  value={consultation.amountPaid}
                  onChange={(e) => setConsultation({ ...consultation, amountPaid: e.target.value })}
              /></div></label>
              {selectedPayableInvoice && <div className="col-span-full flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-xs">
                <span className="font-semibold text-slate-600">{text("Reste après cette visite", "الباقي بعد هذه الزيارة")}</span>
                <strong className={remainingAfterVisit > 0 ? "text-amber-800" : "text-emerald-700"}>
                  {remainingAfterVisit.toFixed(2)} MAD
                </strong>
              </div>}
            </>}

            <label className={ui("patient-field")}><span>{text("Mode de paiement", "طريقة الدفع")} <b>*</b></span><div className={ui("patient-input")}><CreditCard/><select
                required value={consultation.paymentMethod}
                onChange={(e) => setConsultation({ ...consultation, paymentMethod: e.target.value })}
            >
              <option value="ESPECES">{text("Espèces", "نقداً")}</option>
              <option value="CARTE_BANCAIRE">{text("Carte bancaire", "بطاقة بنكية")}</option>
              <option value="VIREMENT">{text("Virement", "تحويل بنكي")}</option>
              <option value="CHEQUE">{text("Chèque", "شيك")}</option>
              <option value="AUTRE">{text("Autre", "أخرى")}</option>
            </select></div></label>
          </div>
        </section>}
      </div>}
      {dialog === "consultation" ? <div className={ui("patient-modal-actions")}>
        <span><HeartPulse/> {text("Tous les champs marqués * sont obligatoires ; le plan reste facultatif.", "جميع الحقول المشار إليها بـ * إلزامية؛ وتبقى الخطة اختيارية.")}</span>
        <div><button type="button" className={ui("button ghost")} onClick={() => { setDialog(null); setConsultationError(""); }}>{text("Annuler", "إلغاء")}</button>
          <button type="submit" className={ui("button primary")}><ClipboardPlus/> {text("Enregistrer la visite", "حفظ الزيارة")}</button></div>
      </div> : <div className={ui("modal-actions")}><button type="button" className={ui("button ghost")} onClick={() => setDialog(null)}>{text("Annuler", "إلغاء")}</button><button type="submit" className={ui("button primary")}>{text("Enregistrer", "حفظ")}</button></div>}
    </form></div>}
    {editOpen && <div className={ui("modal-backdrop")}><form className={ui("modal wide patient-modal")} onSubmit={savePatient}>
      <div className={ui("patient-modal-head")}><div><span className={ui("eyebrow")}>{patient.patientNumber}</span><h2>{text("Modifier le patient", "تعديل معلومات المريض")}</h2><p>{text("Mettez à jour les informations du dossier. Les champs marqués", "حدّث معلومات الملف. الحقول المشار إليها بـ")} <b>*</b> {text("sont obligatoires.", "إلزامية.")}</p></div>
        <button type="button" className={ui("icon-button")} aria-label={text("Fermer", "إغلاق")} onClick={() => setEditOpen(false)}><X/></button></div>
      <div className={ui("patient-modal-body")}>
        <section className={ui("patient-form-section")}>
          <header><span><UserRound/></span><div><h3>{text("Identité du patient", "هوية المريض")}</h3><p>{text("Informations personnelles utilisées dans le dossier médical.", "المعلومات الشخصية المستخدمة في الملف الطبي.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <label className={ui("patient-field")}><span>{text("Prénom", "الاسم الشخصي")} <b>*</b></span><div className={ui("patient-input")}><UserRound/><input required maxLength={100} autoComplete="given-name" placeholder={text("Saisir le prénom", "أدخل الاسم الشخصي")} value={editForm.firstName || ""} onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}/></div></label>
            <label className={ui("patient-field")}><span>{text("Nom", "الاسم العائلي")} <b>*</b></span><div className={ui("patient-input")}><UsersRound/><input required maxLength={100} autoComplete="family-name" placeholder={text("Saisir le nom", "أدخل الاسم العائلي")} value={editForm.lastName || ""} onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}/></div></label>
            <label className={ui("patient-field")}><span>{text("CIN", "رقم البطاقة الوطنية")} <b>*</b></span><div className={ui("patient-input")}><IdCard/><input required maxLength={30} placeholder={text("Saisir le numéro de CIN", "أدخل رقم البطاقة الوطنية")} value={editForm.cin || ""} onChange={(e) => setEditForm({ ...editForm, cin: e.target.value.toUpperCase() })}/></div></label>
            <label className={ui("patient-field")}><span>{text("Date de naissance", "تاريخ الميلاد")} <b>*</b></span><div className={ui("patient-input")}><CalendarDays/><input required type="date" max={new Date().toISOString().slice(0, 10)} value={editForm.birthDate || ""} onChange={(e) => setEditForm({ ...editForm, birthDate: e.target.value })}/></div></label>
            <label className={ui("patient-field")}><span>{text("Sexe", "الجنس")} <b>*</b></span><div className={ui("patient-input")}><UsersRound/><select required value={editForm.sex || ""} onChange={(e) => setEditForm({ ...editForm, sex: e.target.value })}><option value="" disabled>{text("Sélectionner le sexe", "اختر الجنس")}</option><option value="HOMME">{text("Homme", "ذكر")}</option><option value="FEMME">{text("Femme", "أنثى")}</option></select></div></label>
          </div>
        </section>

        <section className={ui("patient-form-section")}>
          <header><span><Phone/></span><div><h3>{text("Coordonnées", "معلومات الاتصال")}</h3><p>{text("Moyens de contact du patient.", "معلومات الاتصال الخاصة بالمريض.")}</p></div></header>
          <div className={ui("form-grid patient-fields")}>
            <label className={ui("patient-field")}><span>{text("Téléphone principal", "رقم الهاتف الرئيسي")} <b>*</b></span><div className={ui("patient-input")}><Phone/><input required maxLength={30} inputMode="tel" autoComplete="tel" placeholder={text("Saisir le téléphone principal", "أدخل رقم الهاتف الرئيسي")} value={editForm.primaryPhone || ""} onChange={(e) => setEditForm({ ...editForm, primaryPhone: e.target.value })}/></div></label>
            <label className={ui("patient-field")}><span>{text("Ville", "المدينة")} <b>*</b></span><div className={ui("patient-input")}><MapPin/><input required maxLength={100} placeholder={text("Saisir la ville", "أدخل المدينة")} value={editForm.city || ""} onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}/></div></label>
          </div>
        </section>

      </div>
      <div className={ui("patient-modal-actions")}><span><ShieldCheck/> {text("Les modifications seront enregistrées dans le dossier permanent.", "سيتم حفظ التعديلات في الملف الدائم.")}</span><div><button type="button" className={ui("button ghost")} onClick={() => setEditOpen(false)}>{text("Annuler", "إلغاء")}</button><button className={ui("button primary")}><Pencil/> {text("Enregistrer les modifications", "حفظ التعديلات")}</button></div></div>
    </form></div>}
  </>;
}

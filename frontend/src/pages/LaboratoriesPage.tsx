import { ui } from "../styles";
import { CalendarDays, ChevronLeft, ChevronRight, FlaskConical, MapPin, Pencil, Phone, Plus, Search, Trash2, X } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "../components/EmptyState";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../services/api";
import type { Laboratory, LaboratoryJob } from "../types";

type Dialog = "laboratory" | "job" | null;

const PAGE_SIZES = [5, 10, 15, 25] as const;

interface EligiblePatientTreatment {
    patientId: string;
    patientNumber: string;
    firstName: string;
    lastName: string;
    cin?: string;
    primaryPhone: string;
    treatmentType: string;
}

const todayDate = () => new Date().toISOString().slice(0, 10);

function monthEndDate(value: string) {
    const [year, month] = value.split("-").map(Number);
    if (!year || !month) return "";
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    return `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}

function createInitialJob() {
    const sentDate = todayDate();
    return {
        laboratoryId: "",
        patientId: "",
        jobType: "",
        tooth: "",
        shade: "",
        description: "",
        sentDate,
        expectedDate: monthEndDate(sentDate),
        laboratoryPrice: "",
        notes: ""
    };
}

const initialLabForm = {
    name: "",
    managerName: "",
    phone: "",
    city: "",
    email: "",
    address: "",
    taxIdentifier: "",
    observations: ""
};

export function LaboratoriesPage() {
    const { text, locale } = useLanguage();
    const money = new Intl.NumberFormat(locale, {
        style: "currency",
        currency: "MAD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
    const dateFormatter = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
    const monthFormatter = new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" });
    const formatDate = (value?: string) => value
        ? dateFormatter.format(new Date(`${value.slice(0, 10)}T12:00:00`))
        : "—";
    const formatMonth = (value: string) => {
        const [year, month] = value.split("-").map(Number);
        return year && month ? monthFormatter.format(new Date(year, month - 1, 1)) : value;
    };
    const jobTypeLabel = (jobType: string) => ({
        COURONNE: text("Couronne", "تاج"),
        "Obturation composite": text("Obturation composite", "حشوة كومبوزيت"),
        "Couronne zircone": text("Couronne zircone", "تاج زركون"),
        "Couronne céramo-céramique": text("Couronne céramo-céramique", "تاج سيراميك كامل"),
        BRIDGE: text("Bridge", "جسر"),
        PROTHESE: text("Prothèse", "تركيبة أسنان"),
        INLAY_ONLAY: text("Inlay / Onlay", "إنلاي / أونلاي"),
        GOUTTIERE: text("Gouttière", "قالب أسنان"),
        ORTHODONTIE: text("Orthodontie", "تقويم الأسنان"),
        REPARATION: text("Réparation", "إصلاح"),
        AUTRE: text("Autre", "أخرى")
    } as Record<string, string>)[jobType] ?? jobType.replaceAll("_", " ");

    const [labs, setLabs] = useState<Laboratory[]>([]);
    const [jobs, setJobs] = useState<LaboratoryJob[]>([]);
    const [eligibleTreatments, setEligibleTreatments] = useState<EligiblePatientTreatment[]>([]);
    const [tab, setTab] = useState<"laboratories" | "jobs">("laboratories");
    const [dialog, setDialog] = useState<Dialog>(null);
    const [feedback, setFeedback] = useState("");
    const [feedbackIsError, setFeedbackIsError] = useState(false);
    const [jobMonth, setJobMonth] = useState("");
    const [labQuery, setLabQuery] = useState("");
    const [labPage, setLabPage] = useState(1);
    const [jobPage, setJobPage] = useState(1);
    const [labPageSize, setLabPageSize] = useState<(typeof PAGE_SIZES)[number]>(5);
    const [jobPageSize, setJobPageSize] = useState<(typeof PAGE_SIZES)[number]>(5);
    const [labForm, setLabForm] = useState(initialLabForm);
    const [job, setJob] = useState(createInitialJob);
    const [editingLab, setEditingLab] = useState<Laboratory | null>(null);
    const [editingJob, setEditingJob] = useState<LaboratoryJob | null>(null);

    const jobMonthOptions = useMemo(() => Array.from(new Set(
        jobs.map((item) => item.expectedDate?.slice(0, 7)).filter(Boolean) as string[]
    )).sort(), [jobs]);
    const normalizedLabQuery = labQuery.trim().toLocaleLowerCase(locale);
    const filteredLabs = normalizedLabQuery
        ? labs.filter((item) => [item.name, item.managerName, item.phone, item.city]
            .filter(Boolean)
            .some((value) => value!.toLocaleLowerCase(locale).includes(normalizedLabQuery)))
        : labs;
    const filteredJobs = jobMonth
        ? jobs.filter((item) => item.expectedDate?.startsWith(jobMonth))
        : jobs;
    const labPageCount = Math.max(1, Math.ceil(filteredLabs.length / labPageSize));
    const currentLabPage = Math.min(labPage, labPageCount);
    const paginatedLabs = filteredLabs.slice(
        (currentLabPage - 1) * labPageSize,
        currentLabPage * labPageSize
    );
    const jobPageCount = Math.max(1, Math.ceil(filteredJobs.length / jobPageSize));
    const currentJobPage = Math.min(jobPage, jobPageCount);
    const paginatedJobs = filteredJobs.slice(
        (currentJobPage - 1) * jobPageSize,
        currentJobPage * jobPageSize
    );

    async function load() {
        const [laboratories, labJobs, patientTreatments] = await Promise.all([
            api.get<Laboratory[]>("/laboratories"),
            api.get<LaboratoryJob[]>("/laboratory-jobs"),
            api.get<EligiblePatientTreatment[]>("/laboratory-jobs/eligible-patients")
        ]);
        setLabs(laboratories);
        setJobs(labJobs);
        setEligibleTreatments(patientTreatments);
    }

    useEffect(() => {
        void load().catch(() =>
            (setFeedbackIsError(true), setFeedback(text("Chargement des laboratoires impossible.", "تعذّر تحميل المختبرات.")))
        );
    }, []);

    useEffect(() => {
        if (labPage > labPageCount) setLabPage(labPageCount);
    }, [labPage, labPageCount]);

    useEffect(() => {
        if (jobPage > jobPageCount) setJobPage(jobPageCount);
    }, [jobPage, jobPageCount]);

    useEffect(() => {
        setJobPage(1);
    }, [jobMonth, jobPageSize]);

    useEffect(() => {
        setLabPage(1);
    }, [labQuery, labPageSize]);

    async function submit(event: FormEvent) {
        event.preventDefault();
        try {
            if (dialog === "laboratory") {
                const payload = {
                    ...labForm,
                    email: labForm.email || null,
                    address: labForm.address || null,
                    taxIdentifier: labForm.taxIdentifier || null,
                    observations: labForm.observations || null
                };
                if (editingLab) await api.put(`/laboratories/${editingLab.id}`, payload);
                else await api.post("/laboratories", payload);
                setLabForm(initialLabForm);
            }
            if (dialog === "job") {
                const payload = {
                    ...job,
                    laboratoryPrice: Number(job.laboratoryPrice)
                };
                if (editingJob) await api.put(`/laboratory-jobs/${editingJob.id}`, payload);
                else await api.post("/laboratory-jobs", payload);
                setJob(createInitialJob());
            }
            setFeedback(text("Opération laboratoire enregistrée.", "تم حفظ عملية المختبر."));
            setFeedbackIsError(false);
            setDialog(null);
            setEditingLab(null);
            setEditingJob(null);
            await load();
        } catch (reason) {
            setFeedback((reason as { message?: string }).message || text(
                "Enregistrement du laboratoire impossible.",
                "تعذّر حفظ عملية المختبر."
            ));
            setFeedbackIsError(true);
        }
    }

    function openLaboratoryForm(lab?: Laboratory) {
        setEditingLab(lab || null);
        setEditingJob(null);
        setLabForm(lab ? {
            name: lab.name || "",
            managerName: lab.managerName || "",
            phone: lab.phone || "",
            city: lab.city || "",
            email: lab.email || "",
            address: lab.address || "",
            taxIdentifier: lab.taxIdentifier || "",
            observations: lab.observations || ""
        } : initialLabForm);
        setFeedback("");
        setFeedbackIsError(false);
        setDialog("laboratory");
    }

    function openJobForm(item?: LaboratoryJob) {
        setEditingJob(item || null);
        setEditingLab(null);
        setJob(item ? {
            laboratoryId: item.laboratoryId,
            patientId: item.patientId,
            jobType: item.jobType,
            tooth: item.tooth || "",
            shade: item.shade || "",
            description: item.description || "",
            sentDate: item.sentDate || todayDate(),
            expectedDate: item.expectedDate || monthEndDate(item.sentDate || todayDate()),
            laboratoryPrice: String(item.laboratoryPrice),
            notes: item.notes || ""
        } : createInitialJob());
        setFeedback("");
        setFeedbackIsError(false);
        setDialog("job");
    }

    async function removeLaboratory(lab: Laboratory) {
        if (!window.confirm(text(
            `Voulez-vous vraiment supprimer le laboratoire ${lab.name} ? Son historique sera conserve.`,
            `هل تريد فعلاً حذف المختبر ${lab.name}؟ سيبقى تاريخه محفوظاً.`
        ))) return;
        try {
            await api.delete(`/laboratories/${lab.id}`);
            setFeedback(text("Laboratoire supprimé de la liste active.", "تم حذف المختبر من القائمة النشطة."));
            setFeedbackIsError(false);
            await load();
        } catch (reason) {
            setFeedback((reason as { message?: string }).message || text("Suppression du laboratoire impossible.", "تعذّر حذف المختبر."));
            setFeedbackIsError(true);
        }
    }

    async function removeJob(item: LaboratoryJob) {
        if (!window.confirm(text(
            `Voulez-vous vraiment supprimer ce travail de ${item.patientName} ? Cette action est irreversible.`,
            `هل تريد فعلاً حذف عمل ${item.patientName}؟ لا يمكن التراجع عن هذا الإجراء.`
        ))) return;
        try {
            await api.delete(`/laboratory-jobs/${item.id}`);
            setFeedback(text("Travail de laboratoire supprimé.", "تم حذف عمل المختبر."));
            setFeedbackIsError(false);
            await load();
        } catch (reason) {
            setFeedback((reason as { message?: string }).message || text("Suppression du travail impossible.", "تعذّر حذف العمل."));
            setFeedbackIsError(true);
        }
    }

    const dialogTitle = (value: Exclude<Dialog, null>) => ({
        laboratory: editingLab ? text("Modifier le laboratoire", "تعديل المختبر") : text("Nouveau laboratoire", "مختبر جديد"),
        job: editingJob ? text("Modifier le travail", "تعديل العمل") : text("Nouveau travail", "عمل جديد")
    } as Record<Exclude<Dialog, null>, string>)[value];

    const pagination = (
        page: number,
        pageCount: number,
        total: number,
        pageSize: (typeof PAGE_SIZES)[number],
        onPageChange: (page: number) => void,
        onPageSizeChange: (size: (typeof PAGE_SIZES)[number]) => void
    ) => (
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <label className="flex items-center gap-2">
            <span>{text("Par page", "في الصفحة")}</span>
            <select
              aria-label={text("Nombre de résultats par page", "عدد النتائج في الصفحة")}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
              value={pageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value) as (typeof PAGE_SIZES)[number])}
            >
              {PAGE_SIZES.map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </label>
          <nav aria-label={text("Pagination", "ترقيم الصفحات")} className="flex flex-wrap items-center justify-end gap-2">
            <span>
                {text(`Page ${page} sur ${pageCount} · ${total} résultat(s)`, `الصفحة ${page} من ${pageCount} · ${total} نتيجة`)}
            </span>
            <button
                type="button"
                className={ui("button ghost")}
                disabled={page <= 1}
                onClick={() => onPageChange(Math.max(1, page - 1))}
            >
                <ChevronLeft size={15} className="rtl:rotate-180"/>
                {text("Précédent", "السابق")}
            </button>
            <button
                type="button"
                className={ui("button ghost")}
                disabled={page >= pageCount}
                onClick={() => onPageChange(Math.min(pageCount, page + 1))}
            >
                {text("Suivant", "التالي")}
                <ChevronRight size={15} className="rtl:rotate-180"/>
            </button>
          </nav>
        </div>
    );

    return <>
      {feedback && <div className={ui(
          feedbackIsError ? "alert alert-error" : "alert alert-success"
      )}>{feedback}</div>}

      <div className={`mb-4 mt-6 grid items-end gap-4 max-[1000px]:grid-cols-1 ${
          tab === "laboratories" ? "grid-cols-[1fr_auto_1fr]" : "grid-cols-[1fr_auto]"
      }`}>
      <div className={`${ui("tabs")} mb-0 justify-self-start`}>
        <button className={ui(tab === "laboratories" ? "active" : "")} onClick={() => setTab("laboratories")}>
          {text("Laboratoires", "المختبرات")}
        </button>
        <button className={ui(tab === "jobs" ? "active" : "")} onClick={() => setTab("jobs")}>
          {text(`Travaux (${jobs.length})`, `الأعمال (${jobs.length})`)}
        </button>
      </div>
      {tab === "laboratories" && <label className="relative w-full max-w-md justify-self-center max-[1000px]:justify-self-start">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"/>
        <input
          type="search"
          className="h-11 w-full rounded-xl border border-teal-100 bg-teal-50/60 ps-10 pe-3 text-sm text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
          placeholder={text("Filtrer les laboratoires…", "تصفية المختبرات…")}
          value={labQuery}
          onChange={(event) => setLabQuery(event.target.value)}
        />
      </label>}
      <div className={`${ui("header-actions")} justify-self-end max-[1000px]:justify-self-start`}>
        <button
            className={ui("button ghost")}
            onClick={() => openJobForm()}
        >
          <Plus size={17}/> {text("Travail", "عمل")}
        </button>
        <button
            className={ui("button primary")}
            onClick={() => openLaboratoryForm()}
        >
          <Plus size={17}/> {text("Laboratoire", "مختبر")}
        </button>
      </div>
      </div>

      {tab === "jobs" && <div className="mb-4 mt-3 flex justify-center">
        <label className="flex w-full max-w-2xl items-center gap-4 rounded-2xl border border-teal-100 bg-gradient-to-r from-teal-50 to-white px-5 py-3 shadow-sm max-[700px]:flex-col max-[700px]:items-stretch">
          <span className="flex min-w-fit items-center gap-2 text-sm font-semibold text-slate-700">
            <span className="grid size-9 place-items-center rounded-xl bg-white text-teal-600 shadow-sm">
              <CalendarDays className="size-4"/>
            </span>
            {text("Filtrer par mois prévu", "التصفية حسب شهر التسليم")}
          </span>
          <select
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
            value={jobMonth}
            onChange={(event) => setJobMonth(event.target.value)}
          >
            <option value="">{text("Tous les mois", "كل الأشهر")}</option>
            {jobMonthOptions.map((month) => <option key={month} value={month}>{formatMonth(month)}</option>)}
          </select>
        </label>
      </div>}

      {tab === "laboratories" && <section className={`${ui("panel")} flex min-h-[calc(100vh-300px)] flex-col`}>
            <div className="mb-4 flex flex-wrap items-center justify-end gap-3">
              <span className={ui("result-count")}>
                {text(`${filteredLabs.length} laboratoire(s)`, `${filteredLabs.length} مختبر`)}
              </span>
            </div>
            {!filteredLabs.length
              ? <div className="flex flex-1 items-center justify-center"><EmptyState message={labQuery.trim()
                  ? text("Aucun laboratoire ne correspond au filtre.", "لا يوجد مختبر مطابق للتصفية.")
                  : text("Aucun laboratoire enregistré.", "لم يتم تسجيل أي مختبر.")}/></div>
              : <div className={`${ui("laboratory-grid")} flex-1 content-start`}>
              {paginatedLabs.map((lab) => <article className={ui("laboratory-card")} key={lab.id}>
                <div className={ui("lab-icon")}><FlaskConical /></div>
                <div>
                  <h3>{lab.name}</h3>
                  <span>{lab.managerName || text("Responsable non renseigné", "المسؤول غير محدد")}</span>
                </div>
                <dl>
                  <div>
                    <dt><Phone size={15}/> {text("Téléphone", "الهاتف")}</dt>
                    <dd dir="ltr">{lab.phone || "—"}</dd>
                  </div>
                  <div>
                    <dt><MapPin size={15}/> {text("Ville", "المدينة")}</dt>
                    <dd>{lab.city || "—"}</dd>
                  </div>
                </dl>
                <span className={ui(`badge ${lab.active ? "badge-success" : "badge-neutral"}`)}>
                  {lab.active ? text("ACTIF", "نشط") : text("INACTIF", "غير نشط")}
                </span>
                <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                  <button type="button" className={ui("button ghost")} onClick={() => openLaboratoryForm(lab)}><Pencil size={15}/> {text("Modifier", "تعديل")}</button>
                  <button type="button" className={`${ui("button ghost")} text-red-600 hover:bg-red-50`} onClick={() => void removeLaboratory(lab)}><Trash2 size={15}/> {text("Supprimer", "حذف")}</button>
                </div>
              </article>)}
            </div>}
            <div className="mt-4 border-t border-slate-100 pt-4">
              {pagination(currentLabPage, labPageCount, filteredLabs.length, labPageSize, setLabPage, setLabPageSize)}
            </div>
      </section>}

      {tab === "jobs" && <section className={`${ui("panel")} flex min-h-[calc(100vh-300px)] flex-col`}>
        <div className="mb-4 flex justify-end">
          <span className={ui("result-count")}>
            {text(`${filteredJobs.length} travail(x)`, `${filteredJobs.length} عمل`)}
          </span>
        </div>
        {!jobs.length
            ? <EmptyState message={text("Aucun travail de laboratoire.", "لا توجد أعمال مخبرية.")}/>
            : !filteredJobs.length
                ? <EmptyState message={text("Aucun travail pour ce mois.", "لا يوجد عمل في هذا الشهر.")}/>
                : <>
                  <div className={ui("data-table")}>
                    <table>
                      <thead>
                        <tr>
                          <th>{text("Laboratoire", "المختبر")}</th>
                          <th>{text("Patient", "المريض")}</th>
                          <th>{text("Travail", "العمل")}</th>
                          <th>{text("Date prévue", "التاريخ المتوقع")}</th>
                          <th>{text("Prix", "السعر")}</th>
                          <th>{text("Actions", "الإجراءات")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedJobs.map((item) => <tr key={item.id}>
                          <td>{item.laboratoryName}</td>
                          <td><strong className="block text-slate-800">{item.patientName}</strong><small className={ui("mono")}>{item.patientNumber}</small></td>
                          <td>{jobTypeLabel(item.jobType)} · {text("dent", "السن")} {item.tooth || "—"}</td>
                          <td>{formatDate(item.expectedDate)}</td>
                          <td>{money.format(Number(item.laboratoryPrice))}</td>
                          <td><div className="flex items-center gap-2">
                            <button type="button" className={ui("icon-button")} title={text("Modifier", "تعديل")} onClick={() => openJobForm(item)}><Pencil className="size-4"/></button>
                            <button type="button" className={`${ui("icon-button")} text-red-600 hover:bg-red-50`} title={text("Supprimer", "حذف")} onClick={() => void removeJob(item)}><Trash2 className="size-4"/></button>
                          </div></td>
                        </tr>)}
                      </tbody>
                    </table>
                  </div>
                  </>
        }
        <div className="mt-auto border-t border-slate-100 pt-4">
          {pagination(currentJobPage, jobPageCount, filteredJobs.length, jobPageSize, setJobPage, setJobPageSize)}
        </div>
      </section>}

      {dialog && <div className={ui("modal-backdrop")}>
        <form className={ui("modal wide")} onSubmit={submit}>
          <div className={ui("modal-head")}>
            <div>
              <span className={ui("eyebrow")}>{text("Laboratoire", "المختبر")}</span>
              <h2>{dialogTitle(dialog)}</h2>
            </div>
            <button
              type="button"
              className={ui("icon-button")}
              aria-label={text("Fermer", "إغلاق")}
              onClick={() => { setDialog(null); setEditingLab(null); setEditingJob(null); }}
            >
              <X size={18}/>
            </button>
          </div>

          {dialog === "laboratory" && <div className={ui("form-grid")}>
            <label>
              {text("Nom", "الاسم")} <b className="text-red-500">*</b>
              <input
                required
                placeholder={text("Saisir le nom du laboratoire", "أدخل اسم المختبر")}
                value={labForm.name}
                onChange={(event) => setLabForm({ ...labForm, name: event.target.value })}
              />
            </label>
            <label>
              {text("Responsable", "المسؤول")} <b className="text-red-500">*</b>
              <input
                required
                placeholder={text("Saisir le nom du responsable", "أدخل اسم المسؤول")}
                value={labForm.managerName}
                onChange={(event) => setLabForm({ ...labForm, managerName: event.target.value })}
              />
            </label>
            <label>
              {text("Téléphone", "الهاتف")} <b className="text-red-500">*</b>
              <input
                required
                type="tel"
                placeholder={text("Saisir le numéro de téléphone", "أدخل رقم الهاتف")}
                value={labForm.phone}
                onChange={(event) => setLabForm({ ...labForm, phone: event.target.value })}
              />
            </label>
            <label>
              {text("Ville", "المدينة")} <b className="text-red-500">*</b>
              <input
                required
                placeholder={text("Saisir la ville", "أدخل المدينة")}
                value={labForm.city}
                onChange={(event) => setLabForm({ ...labForm, city: event.target.value })}
              />
            </label>
          </div>}

          {dialog === "job" && <div className={ui("form-grid")}>
            <label>
              {text("Laboratoire", "المختبر")} <b className="text-red-500">*</b>
              <select
                required
                value={job.laboratoryId}
                onChange={(event) => setJob({ ...job, laboratoryId: event.target.value })}
              >
                <option value="">{text("Sélectionner un laboratoire", "اختر مختبرًا")}</option>
                {labs.map((lab) => <option key={lab.id} value={lab.id}>{lab.name}</option>)}
              </select>
            </label>
            <label>
              {text("Patient et traitement", "المريض والعلاج")} <b className="text-red-500">*</b>
              <select
                required
                value={job.patientId && job.jobType ? `${job.patientId}::${job.jobType}` : ""}
                onChange={(event) => {
                  const selected = eligibleTreatments.find((item) =>
                    `${item.patientId}::${item.treatmentType}` === event.target.value);
                  setJob((current) => ({
                    ...current,
                    patientId: selected?.patientId || "",
                    jobType: selected?.treatmentType || ""
                  }));
                }}
              >
                <option value="">{eligibleTreatments.length
                  ? text("Sélectionner un patient et son traitement", "اختر المريض وعلاجه")
                  : text("Aucun patient avec un traitement autorisé", "لا يوجد مريض بأحد العلاجات المسموح بها")}</option>
                {editingJob && !eligibleTreatments.some((item) =>
                    item.patientId === editingJob.patientId && item.treatmentType === editingJob.jobType) && (
                  <option value={`${editingJob.patientId}::${editingJob.jobType}`}>
                    {editingJob.patientNumber} · {editingJob.patientName} · {jobTypeLabel(editingJob.jobType)}
                  </option>
                )}
                {eligibleTreatments.map((item) => (
                  <option key={`${item.patientId}-${item.treatmentType}`} value={`${item.patientId}::${item.treatmentType}`}>
                    {item.patientNumber} · {item.firstName} {item.lastName} · {jobTypeLabel(item.treatmentType)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {text("Dent", "السن")} <b className="text-red-500">*</b>
              <input
                required
                placeholder={text("Saisir le numéro de dent", "أدخل رقم السن")}
                value={job.tooth}
                onChange={(event) => setJob({ ...job, tooth: event.target.value })}
              />
            </label>
            <label>
              {text("Teinte", "اللون")} <b className="text-red-500">*</b>
              <input
                required
                placeholder={text("Saisir la teinte", "أدخل اللون")}
                value={job.shade}
                onChange={(event) => setJob({ ...job, shade: event.target.value })}
              />
            </label>
            <label>
              {text("Prix laboratoire (MAD)", "سعر المختبر (درهم)")} <b className="text-red-500">*</b>
              <input
                required
                type="number"
                min="0.01"
                step="0.01"
                placeholder={text("Saisir le prix", "أدخل السعر")}
                value={job.laboratoryPrice}
                onChange={(event) => setJob({ ...job, laboratoryPrice: event.target.value })}
              />
            </label>
            <label>
              {text("Date d’envoi", "تاريخ الإرسال")} <b className="text-red-500">*</b>
              <input
                required
                type="date"
                value={job.sentDate}
                onChange={(event) => setJob({
                    ...job,
                    sentDate: event.target.value,
                    expectedDate: monthEndDate(event.target.value)
                })}
              />
            </label>
            <label>
              {text("Date prévue", "التاريخ المتوقع")} <b className="text-red-500">*</b>
              <input
                required
                type="date"
                value={job.expectedDate}
                onChange={(event) => setJob({ ...job, expectedDate: event.target.value })}
              />
            </label>
          </div>}

          <div className={ui("modal-actions")}>
            <button type="button" className={ui("button ghost")} onClick={() => { setDialog(null); setEditingLab(null); setEditingJob(null); }}>
              {text("Annuler", "إلغاء")}
            </button>
            <button className={ui("button primary")}>
              {editingLab || editingJob ? text("Enregistrer les modifications", "حفظ التعديلات") : text("Enregistrer", "حفظ")}
            </button>
          </div>
        </form>
      </div>}
    </>;
}

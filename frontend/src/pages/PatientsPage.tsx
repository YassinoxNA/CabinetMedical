import { ui } from "../styles";
import {
    CalendarDays, ChevronLeft, ChevronRight, IdCard, LoaderCircle, MapPin,
    Phone, Plus, Search, ShieldCheck, UserRound, UsersRound, X
} from "lucide-react";
import { FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { EmptyState } from "../components/EmptyState";
import { StatusBadge } from "../components/StatusBadge";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../services/api";
import type { Page, Patient } from "../types";
const emptyForm = { firstName: "", lastName: "", cin: "", primaryPhone: "", city: "", birthDate: "",
    sex: "", allergies: "", medicalHistory: "", observations: "" };
const patientPageSizes = [5, 10, 20, 50] as const;

type PaginationItem = number | "start-ellipsis" | "end-ellipsis";

function paginationItems(currentPage: number, totalPages: number): PaginationItem[] {
    if (totalPages <= 7)
        return Array.from({ length: totalPages }, (_, index) => index);
    if (currentPage <= 3)
        return [0, 1, 2, 3, 4, "end-ellipsis", totalPages - 1];
    if (currentPage >= totalPages - 4)
        return [0, "start-ellipsis", ...Array.from({ length: 5 }, (_, index) => totalPages - 5 + index)];
    return [0, "start-ellipsis", currentPage - 1, currentPage, currentPage + 1, "end-ellipsis", totalPages - 1];
}

export function PatientsPage() {
    const navigate = useNavigate();
    const { text } = useLanguage();
    const [query, setQuery] = useState("");
    const [page, setPage] = useState(0);
    const [pageSize, setPageSize] = useState<(typeof patientPageSizes)[number]>(5);
    const [data, setData] = useState<Page<Patient> | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [refreshKey, setRefreshKey] = useState(0);
    const [showForm, setShowForm] = useState(false);
    const [form, setForm] = useState(emptyForm);
    const [error, setError] = useState("");
    const [accessMessage, setAccessMessage] = useState("");
    const [blockedPatientId, setBlockedPatientId] = useState("");
    const submissionLock = useRef(false);

    async function openPatientDossier(patient: Patient) {
        setAccessMessage("");
        setBlockedPatientId("");
        if (patient.fileStatus === "TRAITEMENT_TERMINE") {
            setBlockedPatientId(patient.id);
            setAccessMessage(text(
                `Le dernier traitement de ${patient.firstName} ${patient.lastName} est terminé. Planifiez d’abord un nouveau rendez-vous pour rouvrir l’accès à son dossier médical.`,
                `اكتمل العلاج الأخير للمريض ${patient.firstName} ${patient.lastName}. يرجى برمجة موعد جديد أولاً لإعادة فتح ملفه الطبي.`
            ));
            return;
        }
        try {
            const access = await api.get<{ allowed: boolean; reason: string }>(
                `/appointments/patients/${patient.id}/dossier-access`
            );
            if (access.allowed) {
                navigate(`/patients/${patient.id}`);
                return;
            }
            setBlockedPatientId(patient.id);
            setAccessMessage(text(
                `Le dossier médical de ${patient.firstName} ${patient.lastName} sera accessible après la planification d’un nouveau rendez-vous.`,
                `سيصبح الملف الطبي للمريض ${patient.firstName} ${patient.lastName} متاحاً بعد برمجة موعد جديد.`
            ));
        }
        catch {
            setAccessMessage(text(
                "Impossible de vérifier l’accès au dossier médical.",
                "تعذر التحقق من إمكانية الدخول إلى الملف الطبي."
            ));
        }
    }

    useEffect(() => {
        let cancelled = false;
        const timer = window.setTimeout(async () => {
            setIsLoading(true);
            setLoadError("");
            try {
                const response = await api.get<Page<Patient>>(
                    `/patients?page=${page}&size=${pageSize}&q=${encodeURIComponent(query.trim())}`
                );
                if (cancelled) return;

                const lastAvailablePage = Math.max(response.totalPages - 1, 0);
                if (page > lastAvailablePage) {
                    setPage(lastAvailablePage);
                    return;
                }
                setData(response);
            }
            catch {
                if (!cancelled) {
                    setData(null);
                    setLoadError(text("Impossible de charger la liste des patients.", "تعذر تحميل قائمة المرضى."));
                }
            }
            finally {
                if (!cancelled) setIsLoading(false);
            }
        }, query.trim() ? 250 : 0);

        return () => {
            cancelled = true;
            window.clearTimeout(timer);
        };
    }, [page, pageSize, query, refreshKey, text]);

    async function create(event: FormEvent) {
        event.preventDefault();
        if (submissionLock.current) return;

        submissionLock.current = true;
        setError("");
        try {
            const payload = {
                ...Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value || null])),
                address: null,
                coverageType: "SANS_ASSURANCE",
                membershipNumber: null
            };
            const duplicates = await api.post<{
                possibleDuplicate: boolean;
                matches: Patient[];
            }>("/patients/duplicates", payload);
            let confirmed = false;
            if (duplicates.possibleDuplicate) {
                confirmed = window.confirm(text(
                    `Un patient similaire existe déjà : ${duplicates.matches.map((p) => `${p.patientNumber} — ${p.firstName} ${p.lastName}`).join(", ")}.\n\nCréer quand même un nouveau dossier ?`,
                    `يوجد مريض مشابه مسجل مسبقاً: ${duplicates.matches.map((p) => `${p.patientNumber} — ${p.firstName} ${p.lastName}`).join("، ")}.\n\nهل تريد إنشاء ملف جديد رغم ذلك؟`
                ));
                if (!confirmed) {
                    setShowForm(false);
                    if (duplicates.matches[0])
                        navigate(`/patients/${duplicates.matches[0].id}`);
                    return;
                }
            }
            await api.post(`/patients?duplicateConfirmed=${confirmed}`, payload);
            setForm(emptyForm);
            setShowForm(false);
            setPage(0);
            setRefreshKey((current) => current + 1);
        }
        catch (reason) {
            setError((reason as {
                message?: string;
            }).message ?? text("Création impossible.", "تعذر إنشاء ملف المريض."));
        }
        finally {
            submissionLock.current = false;
        }
    }
    return (<>
      <section className={`${ui("panel")} flex min-h-[calc(100vh-230px)] flex-col`} aria-busy={isLoading}>
        {accessMessage && <div role="alert" className="mb-4 flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
          <span>{accessMessage}</span>
          <div className="flex shrink-0 items-center gap-2">
            <button type="button" className="rounded-lg bg-amber-600 px-3 py-2 text-white transition hover:bg-amber-700" onClick={() => navigate(`/calendar?patient=${blockedPatientId}`)}>
              <CalendarDays className="mr-1 inline size-4 rtl:ml-1 rtl:mr-0"/> {text("Planifier un rendez-vous", "برمجة موعد")}
            </button>
            <button type="button" aria-label={text("Fermer", "إغلاق")} className="rounded-lg p-1 text-amber-700 hover:bg-amber-100" onClick={() => setAccessMessage("")}>
              <X className="size-4"/>
            </button>
          </div>
        </div>}
        <div className={ui("toolbar")}><div className={ui("search-field")}><Search size={18}/><input placeholder={text("Nom, téléphone, CIN ou numéro patient…", "الاسم أو الهاتف أو رقم البطاقة الوطنية أو رقم المريض…")} value={query} onChange={(e) => { setQuery(e.target.value); setPage(0); }}/></div>
          <div className="flex items-center gap-3">
            <span className={ui("result-count")}>{text(`${data?.totalElements ?? 0} patient(s)`, `${data?.totalElements ?? 0} مريض`)}</span>
            <button className={ui("button primary")} onClick={() => setShowForm(true)}><Plus size={17}/> {text("Nouveau patient", "مريض جديد")}</button>
          </div>
        </div>
        {loadError ? (
            <div role="alert" className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border border-red-200 bg-red-50 px-5 py-8 text-center">
              <p className="text-sm font-semibold text-red-700">{loadError}</p>
              <button type="button" className="rounded-lg border border-red-200 bg-white px-3.5 py-2 text-xs font-bold text-red-700 transition hover:bg-red-100" onClick={() => setRefreshKey((current) => current + 1)}>
                {text("Réessayer", "إعادة المحاولة")}
              </button>
            </div>
        ) : isLoading && !data ? (
            <div className="flex min-h-56 flex-col items-center justify-center gap-3 text-sm text-slate-500">
              <LoaderCircle className="size-7 animate-spin text-teal-600"/>
              <span>{text("Chargement des patients…", "جارٍ تحميل المرضى…")}</span>
            </div>
        ) : !data?.content.length ? <EmptyState message={query.trim() ? text("Aucun patient ne correspond à votre recherche.", "لا يوجد مريض مطابق لبحثك.") : text("Aucun patient enregistré.", "لم يتم تسجيل أي مريض.")}/> :
            <div className={`${ui("data-table")} flex-1 ${isLoading ? "pointer-events-none opacity-60" : ""}`}><table><thead><tr><th>{text("Patient", "المريض")}</th><th>{text("N° dossier", "رقم الملف")}</th><th>{text("Téléphone", "الهاتف")}</th><th>{text("Ville", "المدينة")}</th><th>{text("Statut", "الحالة")}</th></tr></thead>
            <tbody>{data.content.map((patient) => <tr key={patient.id} className={ui("clickable-row")} onClick={() => void openPatientDossier(patient)}><td><div className={ui("person-cell")}><span className={ui("mini-avatar")}><UserRound size={16}/></span><div><strong>{patient.firstName} {patient.lastName}</strong><small>{patient.cin || text("CIN non renseignée", "رقم البطاقة الوطنية غير مسجل")}</small></div></div></td>
              <td className={ui("mono")}>{patient.patientNumber}</td><td>{patient.primaryPhone}</td><td>{patient.city || "—"}</td>
              <td><StatusBadge value={patient.fileStatus}/></td></tr>)}</tbody></table></div>}
        {data && data.totalElements > 0 && !loadError && (
            <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
              <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span>
                  {text("Patients", "المرضى")} <strong className="font-semibold text-slate-700">{data.number * data.size + 1}</strong>
                  {text(" à ", " إلى ")}
                  <strong className="font-semibold text-slate-700">{data.number * data.size + data.content.length}</strong>
                  {text(" sur ", " من ")}
                  <strong className="font-semibold text-slate-700">{data.totalElements}</strong>
                </span>
                <label className="flex items-center gap-2">
                  <span>{text("Par page", "في الصفحة")}</span>
                  <select
                      aria-label={text("Nombre de patients par page", "عدد المرضى في الصفحة")}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                      value={pageSize}
                      disabled={isLoading}
                      onChange={(event) => {
                          setPageSize(Number(event.target.value) as (typeof patientPageSizes)[number]);
                          setPage(0);
                      }}
                  >
                    {patientPageSizes.map((size) => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
              </div>

              <nav aria-label={text("Pagination des patients", "صفحات قائمة المرضى")} className="flex items-center gap-1.5">
                <button
                    type="button"
                    aria-label={text("Page précédente", "الصفحة السابقة")}
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page === 0 || isLoading}
                    onClick={() => setPage((current) => Math.max(0, current - 1))}
                >
                  <ChevronLeft className="size-4 rtl:rotate-180"/>
                </button>

                {paginationItems(page, data.totalPages).map((item) =>
                    typeof item === "number" ? (
                        <button
                            key={item}
                            type="button"
                            aria-label={text(`Aller à la page ${item + 1}`, `الانتقال إلى الصفحة ${item + 1}`)}
                            aria-current={page === item ? "page" : undefined}
                            className={`grid size-9 place-items-center rounded-lg border text-xs font-bold transition ${
                                page === item
                                    ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                                    : "border-slate-200 bg-white text-slate-600 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700"
                            }`}
                            disabled={isLoading}
                            onClick={() => setPage(item)}
                        >
                          {item + 1}
                        </button>
                    ) : (
                        <span key={item} aria-hidden="true" className="grid size-9 place-items-center text-sm text-slate-400">…</span>
                    )
                )}

                <button
                    type="button"
                    aria-label={text("Page suivante", "الصفحة التالية")}
                    className="grid size-9 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700 disabled:cursor-not-allowed disabled:opacity-40"
                    disabled={page >= data.totalPages - 1 || isLoading}
                    onClick={() => setPage((current) => Math.min(data.totalPages - 1, current + 1))}
                >
                  <ChevronRight className="size-4 rtl:rotate-180"/>
                </button>
              </nav>
            </footer>
        )}
      </section>
      {showForm && <div className={ui("modal-backdrop")}><form className={ui("modal wide patient-modal")} onSubmit={create}>
        <div className={ui("patient-modal-head")}><div><span className={ui("eyebrow")}>{text("Nouveau dossier médical", "ملف طبي جديد")}</span><h2>{text("Ajouter un patient", "إضافة مريض")}</h2>
          <p>{text("Renseignez les informations du patient. Les champs marqués", "أدخل معلومات المريض. الحقول المشار إليها بـ")} <b>*</b> {text("sont obligatoires.", "إلزامية.")}</p></div>
          <button type="button" className={ui("icon-button")} aria-label={text("Fermer", "إغلاق")} onClick={() => setShowForm(false)}><X/></button></div>
        <div className={ui("patient-modal-body")}>
          {error && <div className={ui("alert alert-error")}>{error}</div>}

          <section className={ui("patient-form-section")}>
            <header><span><UserRound/></span><div><h3>{text("Identité du patient", "هوية المريض")}</h3><p>{text("Informations personnelles utilisées dans le dossier médical.", "المعلومات الشخصية المستخدمة في الملف الطبي.")}</p></div></header>
            <div className={ui("form-grid patient-fields")}>
              <label className={ui("patient-field")}><span>{text("Prénom", "الاسم الشخصي")} <b>*</b></span><div className={ui("patient-input")}><UserRound/><input name="firstName" required maxLength={100} autoComplete="given-name" placeholder={text("Saisir le prénom", "أدخل الاسم الشخصي")} value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })}/></div></label>
              <label className={ui("patient-field")}><span>{text("Nom", "الاسم العائلي")} <b>*</b></span><div className={ui("patient-input")}><UsersRound/><input name="lastName" required maxLength={100} autoComplete="family-name" placeholder={text("Saisir le nom", "أدخل الاسم العائلي")} value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })}/></div></label>
              <label className={ui("patient-field")}><span>{text("CIN", "رقم البطاقة الوطنية")} <b>*</b></span><div className={ui("patient-input")}><IdCard/><input name="cin" required maxLength={30} autoCapitalize="characters" placeholder={text("Saisir le numéro de CIN", "أدخل رقم البطاقة الوطنية")} value={form.cin} onChange={(e) => setForm({ ...form, cin: e.target.value.toUpperCase() })}/></div></label>
              <label className={ui("patient-field")}><span>{text("Date de naissance", "تاريخ الميلاد")} <b>*</b></span><div className={ui("patient-input")}><CalendarDays/><input name="birthDate" required type="date" max={new Date().toISOString().slice(0, 10)} value={form.birthDate} onChange={(e) => setForm({ ...form, birthDate: e.target.value })}/></div></label>
              <label className={ui("patient-field")}><span>{text("Sexe", "الجنس")} <b>*</b></span><div className={ui("patient-input")}><UsersRound/><select name="sex" required value={form.sex} onChange={(e) => setForm({ ...form, sex: e.target.value })}><option value="" disabled>{text("Sélectionner le sexe", "اختر الجنس")}</option><option value="HOMME">{text("Homme", "ذكر")}</option><option value="FEMME">{text("Femme", "أنثى")}</option></select></div></label>
            </div>
          </section>

          <section className={ui("patient-form-section")}>
            <header><span><Phone/></span><div><h3>{text("Coordonnées", "معلومات الاتصال")}</h3><p>{text("Moyens de contact du patient.", "معلومات الاتصال الخاصة بالمريض.")}</p></div></header>
            <div className={ui("form-grid patient-fields")}>
              <label className={ui("patient-field")}><span>{text("Téléphone principal", "رقم الهاتف الرئيسي")} <b>*</b></span><div className={ui("patient-input")}><Phone/><input name="primaryPhone" required maxLength={30} inputMode="tel" autoComplete="tel" placeholder={text("Saisir le téléphone principal", "أدخل رقم الهاتف الرئيسي")} value={form.primaryPhone} onChange={(e) => setForm({ ...form, primaryPhone: e.target.value })}/></div></label>
              <label className={ui("patient-field")}><span>{text("Ville", "المدينة")} <b>*</b></span><div className={ui("patient-input")}><MapPin/><input name="city" required maxLength={100} autoComplete="address-level2" placeholder={text("Saisir la ville", "أدخل المدينة")} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })}/></div></label>
            </div>
          </section>

        </div>
        <div className={ui("patient-modal-actions")}><span><ShieldCheck/> {text("Les données sont enregistrées uniquement dans le cabinet.", "تُحفظ البيانات داخل العيادة فقط.")}</span><div>
          <button type="button" className={ui("button ghost")} onClick={() => setShowForm(false)}>{text("Annuler", "إلغاء")}</button>
          <button type="submit" className={ui("button primary")}><Plus aria-hidden="true"/> {text("Créer le dossier patient", "إنشاء ملف المريض")}</button>
        </div></div>
      </form></div>}
    </>);
}

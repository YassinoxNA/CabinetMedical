import { ui } from "../styles";
import { Bell, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, FlaskConical, LayoutDashboard, ClipboardCheck, LogOut, Menu, ReceiptText, Settings, ShieldCheck, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { api } from "../services/api";
import type { AuditLog, Page } from "../types";
import cabinetLogo from "../assets/dental-sabri-logo.png";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useLanguage } from "../i18n/LanguageContext";

const navigation = [
    { to: "/", frenchLabel: "Tableau de bord", arabicLabel: "لوحة القيادة", icon: LayoutDashboard },
    { to: "/patients", frenchLabel: "Patients", arabicLabel: "المرضى", icon: Users },
    { to: "/calendar", frenchLabel: "Calendrier", arabicLabel: "المواعيد", icon: CalendarDays },
    { to: "/invoices", frenchLabel: "Facturation", arabicLabel: "الفوترة", icon: ReceiptText },
    { to: "/laboratories", frenchLabel: "Laboratoires", arabicLabel: "المختبرات", icon: FlaskConical },
    { to: "/settings", frenchLabel: "Paramètres", arabicLabel: "الإعدادات", icon: Settings }
];

export function AppLayout() {
    const [collapsed, setCollapsed] = useState(false);
    const [notificationsOpen, setNotificationsOpen] = useState(false);
    const [doctorActivity, setDoctorActivity] = useState<AuditLog[]>([]);
    const [lastReadAt, setLastReadAt] = useState(() => localStorage.getItem("cabinet.doctorActivityLastRead") || "");
    const { user, logout } = useAuthStore();
    const location = useLocation();
    const { isArabic, locale, text } = useLanguage();
    const unreadNotifications = user?.role === "ASSISTANTE"
        ? doctorActivity.filter((item) => !lastReadAt || item.createdAt > lastReadAt).length
        : 0;
    const activityLabel = (item: AuditLog) => {
        const labels: Record<string, [string, string]> = {
            PATIENT_CREATED: ["a ajouté un patient", "أضاف مريضاً"],
            PATIENT_UPDATED: ["a modifié un dossier patient", "عدّل ملف مريض"],
            PATIENT_ARCHIVED: ["a archivé un dossier patient", "أرشف ملف مريض"],
            APPOINTMENT_CREATED: ["a créé un rendez-vous", "أنشأ موعداً"],
            APPOINTMENT_UPDATED: ["a modifié un rendez-vous", "عدّل موعداً"],
            APPOINTMENT_CANCELLED: ["a annulé un rendez-vous", "ألغى موعداً"],
            PATIENT_ARRIVED: ["a signalé l’arrivée d’un patient", "سجّل وصول مريض"],
            CONSULTATION_CREATED: ["a enregistré une consultation", "سجّل استشارة"],
            TREATMENT_PLAN_CREATED: ["a créé un plan de traitement", "أنشأ خطة علاج"],
            TREATMENT_PLAN_COMPLETED: ["a terminé un plan de traitement", "أنهى خطة علاج"],
            INVOICE_CREATED: ["a créé une facture", "أنشأ فاتورة"],
            INVOICE_CREATED_FROM_CONSULTATION: ["a facturé une consultation", "فوْتر استشارة"],
            PATIENT_PAYMENT_CREATED: ["a enregistré un paiement", "سجّل دفعة"],
            LABORATORY_CREATED: ["a ajouté un laboratoire", "أضاف مختبراً"],
            LAB_JOB_CREATED: ["a créé un travail laboratoire", "أنشأ عملاً للمختبر"],
            LAB_JOB_STATUS_CHANGED: ["a modifié un travail laboratoire", "عدّل عمل المختبر"]
        };
        const label = labels[item.action];
        return label ? text(label[0], label[1]) : item.description;
    };
    const pageTitle = location.pathname === "/" ? text("Tableau de bord", "لوحة القيادة")
        : location.pathname.startsWith("/patients/") ? text("Dossier patient", "ملف المريض")
            : location.pathname.startsWith("/patients") ? text("Patients", "المرضى")
                : location.pathname.startsWith("/calendar") ? text("Calendrier", "المواعيد")
                    : location.pathname.startsWith("/invoices") ? text("Facturation", "الفوترة")
                        : location.pathname.startsWith("/laboratories") ? text("Laboratoires", "المختبرات")
                            : location.pathname.startsWith("/settings") ? text("Paramètres", "الإعدادات")
                                        : text("Cabinet Dentaire", "عيادة الأسنان");
    useEffect(() => {
        if (user?.role !== "ASSISTANTE") {
            setDoctorActivity([]);
            return;
        }
        let active = true;
        const load = async () => {
            try {
                const result = await api.get<Page<AuditLog>>("/audit-logs/doctor-activity?page=0&size=20");
                if (active) setDoctorActivity(result.content);
            } catch {
                // Le backend local peut être momentanément en redémarrage.
            }
        };
        void load();
        const timer = window.setInterval(() => void load(), 20_000);
        return () => { active = false; window.clearInterval(timer); };
    }, [user?.role]);
    const toggleNotifications = () => {
        const opening = !notificationsOpen;
        setNotificationsOpen(opening);
        if (opening && doctorActivity[0]) {
            const timestamp = doctorActivity[0].createdAt;
            localStorage.setItem("cabinet.doctorActivityLastRead", timestamp);
            setLastReadAt(timestamp);
        }
    };
    return (<div className={ui(`app-shell ${collapsed ? "sidebar-collapsed" : ""}`)}>
      <aside className={ui("sidebar")}>
        <div className={ui("brand")}>
          <div className={ui("brand-mark")}>
            <img src={cabinetLogo} alt={text("Logo DENTAL SABRI", "شعار DENTAL SABRI")}/>
          </div>
          {!collapsed && <div className="brand-copy">
            <strong dir="ltr">DENTAL SABRI</strong>
            <span>{text("Prothésiste dentaire", "تقني تركيبات الأسنان")}</span>
          </div>}
          <button
            className={ui("collapse-button")}
            onClick={() => setCollapsed(!collapsed)}
            aria-label={collapsed
                ? text("Développer le menu", "توسيع القائمة")
                : text("Réduire le menu", "طي القائمة")}
          >
            {collapsed ? <Menu size={18}/> : isArabic ? <ChevronRight size={18}/> : <ChevronLeft size={18}/>}
          </button>
        </div>
        <nav aria-label={text("Navigation principale", "القائمة الرئيسية")}>
          {navigation.map(({ to, frenchLabel, arabicLabel, icon: Icon }) => {
            const label = text(frenchLabel, arabicLabel);
            return (
              <NavLink key={to} to={to} end={to === "/"} title={label} className={({ isActive }) => ui(isActive ? "nav-item active" : "nav-item")}>
                <Icon size={20}/><span>{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className={ui("sidebar-footer")}>
          <div className={ui("local-chip")}><ShieldCheck size={15}/><span>{text("Mode local sécurisé", "وضع محلي آمن")}</span></div>
        </div>
      </aside>
      <main className={ui("main-content")}>
        <header className="flex min-h-24 items-center justify-between gap-6 border-b border-slate-200 bg-white px-10 py-3 max-[900px]:px-5">
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-extrabold tracking-tight text-slate-900">{pageTitle}</h1>
            <p className="mt-1 truncate text-xs text-slate-500">
              {location.pathname === "/"
                ? text(
                    `Bienvenue ${user?.role === "DOCTEUR" ? "Dr." : ""} ${user?.lastName ?? ""}, voici l’activité de votre cabinet aujourd’hui.`,
                    `مرحباً ${user?.firstName ?? ""}، إليك نشاط العيادة اليوم.`
                  )
                : text("DENTAL SABRI · Gestion professionnelle du cabinet", "DENTAL SABRI · الإدارة المهنية للعيادة")}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <LanguageSwitcher compact/>
            <div className="flex h-14 items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 shadow-sm max-[700px]:hidden">
              <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-600"><CalendarDays size={17}/></span>
              <time className="leading-tight text-slate-700">
                <strong className="block text-xs font-extrabold">
                  {new Intl.DateTimeFormat(locale, { day: "2-digit", month: "long", year: "numeric" }).format(new Date())}
                </strong>
                <small className="capitalize text-[10px] text-slate-500">
                  {new Intl.DateTimeFormat(locale, { weekday: "long" }).format(new Date())}
                </small>
              </time>
            </div>

            <div className="relative max-[620px]:hidden">
              <button type="button" onClick={toggleNotifications}
                className="relative grid size-12 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600"
                title={text("Notifications", "الإشعارات")} aria-label={text("Notifications", "الإشعارات")}>
                <Bell size={19}/>
                {unreadNotifications > 0 && <span className="absolute -end-1 -top-1 grid min-w-5 place-items-center rounded-full bg-rose-600 px-1.5 py-0.5 text-[10px] font-extrabold text-white">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>}
              </button>
              {notificationsOpen && <div className="absolute end-0 top-[calc(100%+10px)] z-50 w-96 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                  <div>
                    <strong className="block text-sm text-slate-900">{text("Activité du docteur", "نشاط الطبيب")}</strong>
                    <small className="text-[10px] text-slate-500">{text("Modifications enregistrées localement", "التعديلات المسجلة محلياً")}</small>
                  </div>
                  {unreadNotifications > 0 && <span className="rounded-full bg-rose-50 px-2 py-1 text-[10px] font-bold text-rose-700">{unreadNotifications}</span>}
                </div>
                <div className="max-h-96 overflow-y-auto">
                  {user?.role !== "ASSISTANTE"
                    ? <p className="p-5 text-center text-xs text-slate-500">{text("Aucune notification destinée à ce compte.", "لا توجد إشعارات لهذا الحساب.")}</p>
                    : doctorActivity.length === 0
                      ? <p className="p-5 text-center text-xs text-slate-500">{text("Aucune activité récente du docteur.", "لا يوجد نشاط حديث للطبيب.")}</p>
                      : doctorActivity.slice(0, 10).map((item) => <article key={item.id} className="flex gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
                          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-full bg-blue-50 text-blue-600"><ClipboardCheck size={16}/></span>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold leading-5 text-slate-800"><strong>Dr. Sabri</strong> {activityLabel(item)}</p>
                            <time className="mt-1 block text-[10px] text-slate-500">{new Date(item.createdAt).toLocaleString(locale)}</time>
                          </div>
                        </article>)}
                </div>
              </div>}
            </div>

            <div className="group relative">
              <button type="button"
                className="flex h-14 min-w-52 items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-start shadow-sm transition hover:border-blue-200 max-[520px]:min-w-0">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-blue-100 to-cyan-100 text-sm font-extrabold text-blue-700">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </span>
                <span className="min-w-0 flex-1 max-[520px]:hidden">
                  <strong className="block truncate text-xs font-extrabold text-slate-900" dir="auto">
                    {user?.role === "DOCTEUR" ? "Dr. " : ""}{user?.firstName} {user?.lastName}
                  </strong>
                  <small className="block text-[10px] text-slate-500">
                    {user?.role === "DOCTEUR" ? text("Docteur", "طبيب") : text("Assistante", "مساعدة")}
                  </small>
                </span>
                <ChevronDown className="size-4 text-slate-400 max-[520px]:hidden"/>
              </button>
              <div className="invisible absolute end-0 top-[calc(100%+8px)] z-50 w-52 translate-y-1 rounded-xl border border-slate-200 bg-white p-2 opacity-0 shadow-xl transition group-focus-within:visible group-focus-within:translate-y-0 group-focus-within:opacity-100">
                <button type="button" onClick={logout}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-start text-xs font-bold text-rose-600 transition hover:bg-rose-50">
                  <LogOut size={16}/>{text("Se déconnecter", "تسجيل الخروج")}
                </button>
              </div>
            </div>
          </div>
        </header>
        <section className={ui("page-content")}><Outlet /></section>
      </main>
    </div>);
}

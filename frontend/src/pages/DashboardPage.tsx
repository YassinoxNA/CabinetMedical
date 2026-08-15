import {
  Banknote, CalendarDays, CheckCircle2, ChevronRight, Clock3, FlaskConical,
  RefreshCw, Stethoscope, TrendingUp, UserCheck, UsersRound,
  WalletCards, XCircle
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type ComponentType } from "react";
import { Link } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { api } from "../services/api";
import type { Appointment } from "../types";

interface DailyActivity {
  date: string;
  label: string;
  appointments: number;
  consultations: number;
}

interface WeeklyPatients {
  label: string;
  patients: number;
}

interface ConsultationCategory {
  category: string;
  consultations: number;
}

interface MonthlyCollections {
  label: string;
  amount: number;
}

interface DashboardStats {
  generatedAt: string;
  totalPatients: number;
  newPatientsThisMonth: number;
  activePatientsYesterday: number;
  activePatientsToday: number;
  activePatientsThisMonth: number;
  appointmentsYesterday: number;
  appointmentsToday: number;
  appointmentsThisMonth: number;
  appointmentsPlannedToday: number;
  appointmentsCompletedToday: number;
  appointmentsCancelledToday: number;
  consultationsYesterday: number;
  consultationsToday: number;
  consultationsThisMonth: number;
  billedYesterday: number;
  billedToday: number;
  billedThisMonth: number;
  collectedYesterday: number;
  collectedToday: number;
  collectedThisMonth: number;
  outstandingTotal: number;
  laboratoryJobsInProgress: number;
  activityLast7Days: DailyActivity[];
  newPatientsByWeek: WeeklyPatients[];
  consultationsByCategory: ConsultationCategory[];
  collectionsLast6Months: MonthlyCollections[];
}

const statusClosed = new Set(["ANNULE", "ABSENT", "TERMINE"]);

export function DashboardPage() {
  const { locale, text } = useLanguage();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [kpiPeriod, setKpiPeriod] = useState<"yesterday" | "today" | "month">("today");

  const money = useMemo(() => new Intl.NumberFormat(locale, {
    style: "currency", currency: "MAD", minimumFractionDigits: 0, maximumFractionDigits: 0
  }), [locale]);

  const load = useCallback(async () => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 1);
    try {
      const [dashboardResult, appointmentsResult] = await Promise.allSettled([
        api.get<DashboardStats>("/dashboard/stats"),
        api.get<Appointment[]>(`/appointments?from=${start.toISOString()}&to=${end.toISOString()}`)
      ]);
      if (dashboardResult.status === "fulfilled") {
        setStats(dashboardResult.value);
      } else {
        setStats(null);
      }
      setTodayAppointments(
        appointmentsResult.status === "fulfilled" ? appointmentsResult.value : []
      );
    } catch {
      setStats(null);
      setTodayAppointments([]);
    }
  }, []);

  useEffect(() => {
    void load();

    const refreshWhenVisible = () => {
      if (document.visibilityState === "visible") void load();
    };
    const interval = window.setInterval(refreshWhenVisible, 5_000);
    window.addEventListener("focus", refreshWhenVisible);
    document.addEventListener("visibilitychange", refreshWhenVisible);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", refreshWhenVisible);
      document.removeEventListener("visibilitychange", refreshWhenVisible);
    };
  }, [load]);

  const collectionRate = stats?.billedThisMonth
    ? Math.min(100, Math.round(stats.collectedThisMonth / stats.billedThisMonth * 100))
    : 0;
  const isToday = kpiPeriod === "today";
  const isYesterday = kpiPeriod === "yesterday";
  const isMonth = kpiPeriod === "month";
  const periodPatients = isYesterday ? stats?.activePatientsYesterday : isToday ? stats?.activePatientsToday : stats?.activePatientsThisMonth;
  const periodAppointments = isYesterday ? stats?.appointmentsYesterday : isToday ? stats?.appointmentsToday : stats?.appointmentsThisMonth;
  const periodConsultations = isYesterday ? stats?.consultationsYesterday : isToday ? stats?.consultationsToday : stats?.consultationsThisMonth;
  const periodBilled = isYesterday ? stats?.billedYesterday : isToday ? stats?.billedToday : stats?.billedThisMonth;
  const periodCollected = isYesterday ? stats?.collectedYesterday : isToday ? stats?.collectedToday : stats?.collectedThisMonth;
  const periodCollectionRate = periodBilled
    ? Math.min(100, Math.round((periodCollected ?? 0) / periodBilled * 100))
    : 0;
  const arrivedToday = todayAppointments.filter((item) =>
    ["PATIENT_ARRIVE", "EN_CONSULTATION"].includes(item.status)).length;
  const upcoming = todayAppointments
    .filter((item) => !statusClosed.has(item.status) && new Date(item.endsAt) >= new Date())
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 5);

  return <div className="space-y-5 pb-8 text-slate-900">

    <section className="space-y-3">
      <div className="flex justify-end">
        <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1 shadow-sm" role="group" aria-label={text("Période des indicateurs", "فترة المؤشرات")}>
          <button type="button" onClick={() => setKpiPeriod("yesterday")} className={`h-9 rounded-lg px-4 text-xs font-bold transition ${isYesterday ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{text("Hier", "أمس")}</button>
          <button type="button" onClick={() => setKpiPeriod("today")} className={`h-9 rounded-lg px-4 text-xs font-bold transition ${isToday ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{text("Aujourd’hui", "اليوم")}</button>
          <button type="button" onClick={() => setKpiPeriod("month")} className={`h-9 rounded-lg px-4 text-xs font-bold transition ${isMonth ? "bg-teal-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-50"}`}>{text("Ce mois", "هذا الشهر")}</button>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-4 max-[1100px]:grid-cols-2 max-[650px]:grid-cols-1">
        <Kpi icon={UsersRound} tone="blue" label={text(isYesterday ? "Patients actifs hier" : isToday ? "Patients actifs aujourd’hui" : "Patients actifs ce mois", isYesterday ? "المرضى النشطون أمس" : isToday ? "المرضى النشطون اليوم" : "المرضى النشطون هذا الشهر")}
             value={periodPatients ?? 0} detail={text(isYesterday ? "Arrivés ou consultés hier" : isToday ? "Arrivés ou consultés aujourd’hui" : "Patients distincts avec activité", isYesterday ? "حضروا أو تمت استشارتهم أمس" : isToday ? "حضروا أو تمت استشارتهم اليوم" : "مرضى مختلفون لديهم نشاط")}/>
        <Kpi icon={CalendarDays} tone="emerald" label={text(isYesterday ? "Rendez-vous hier" : isToday ? "Rendez-vous aujourd’hui" : "Rendez-vous du mois", isYesterday ? "مواعيد أمس" : isToday ? "مواعيد اليوم" : "مواعيد الشهر")}
             value={periodAppointments ?? 0} detail={isYesterday ? text("Tous les rendez-vous d’hier", "جميع مواعيد أمس") : isToday ? text(`${stats?.appointmentsPlannedToday ?? 0} à venir`, `${stats?.appointmentsPlannedToday ?? 0} قادمة`) : text("Tous les rendez-vous du mois", "جميع مواعيد الشهر")}/>
        <Kpi icon={Stethoscope} tone="violet" label={text(isYesterday ? "Consultations hier" : isToday ? "Consultations aujourd’hui" : "Consultations du mois", isYesterday ? "استشارات أمس" : isToday ? "استشارات اليوم" : "استشارات الشهر")}
             value={periodConsultations ?? 0} detail={text("Activité médicale réelle", "النشاط الطبي الفعلي")}/>
        <Kpi icon={WalletCards} tone="amber" label={text(isYesterday ? "Encaissements hier" : isToday ? "Encaissements aujourd’hui" : "Encaissements du mois", isYesterday ? "مداخيل أمس" : isToday ? "مداخيل اليوم" : "مداخيل الشهر")}
             value={money.format(periodCollected ?? 0)} detail={text(`${periodCollectionRate}% encaissé`, `تم تحصيل ${periodCollectionRate}%`)}/>
      </div>
    </section>

    <section className="grid grid-cols-[1.45fr_1fr] gap-4 max-[1050px]:grid-cols-1">
      <Panel title={text("Évolution sur 7 jours", "تطور النشاط خلال 7 أيام")}
             subtitle={text("Rendez-vous et consultations enregistrés.", "المواعيد والاستشارات المسجلة.")}>
        <div className="mb-3 flex justify-end gap-4 text-[11px] font-semibold text-slate-500">
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-blue-500"/>{text("Rendez-vous", "المواعيد")}</span>
          <span className="flex items-center gap-1.5"><i className="size-2 rounded-full bg-emerald-500"/>{text("Consultations", "الاستشارات")}</span>
        </div>
        <ActivityLineChart data={stats?.activityLast7Days ?? []}/>
      </Panel>

      <Panel title={text("Aujourd’hui", "اليوم")} subtitle={text("État du planning de la journée.", "حالة جدول اليوم.")}>
        <div className="grid grid-cols-[1fr_150px] items-center gap-5 max-[520px]:grid-cols-1">
          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
            <StatusRow icon={Clock3} tone="blue" label={text("À venir", "قادمة")} value={stats?.appointmentsPlannedToday ?? 0}/>
            <StatusRow icon={CheckCircle2} tone="emerald" label={text("Terminés", "مكتملة")} value={stats?.appointmentsCompletedToday ?? 0}/>
            <StatusRow icon={UserCheck} tone="violet" label={text("Arrivés", "وصلوا")} value={arrivedToday}/>
            <StatusRow icon={XCircle} tone="rose" label={text("Annulés / absents", "ملغاة / غياب")} value={stats?.appointmentsCancelledToday ?? 0}/>
          </div>
          <Donut total={stats?.appointmentsToday ?? 0}
                 planned={stats?.appointmentsPlannedToday ?? 0}
                 completed={stats?.appointmentsCompletedToday ?? 0}/>
        </div>
        <Link to="/calendar" className="mt-4 flex h-10 items-center justify-between rounded-xl bg-blue-50 px-4 text-xs font-bold text-blue-700 hover:bg-blue-100">
          {text("Voir le planning complet", "عرض الجدول الكامل")}<ChevronRight className="size-4 rtl:rotate-180"/>
        </Link>
      </Panel>
    </section>

    <section className="grid grid-cols-[1.3fr_1fr_1fr] gap-4 max-[1150px]:grid-cols-2 max-[760px]:grid-cols-1">
      <Panel title={text("Situation financière", "الوضع المالي")} subtitle={text("Mois en cours", "الشهر الحالي")}>
        <div className="grid grid-cols-4 gap-2 max-[650px]:grid-cols-2">
          <MiniStat icon={WalletCards} tone="blue" label={text("Facturé", "المفوتر")} value={money.format(stats?.billedThisMonth ?? 0)}/>
          <MiniStat icon={Banknote} tone="emerald" label={text("Encaissé", "المحصل")} value={money.format(stats?.collectedThisMonth ?? 0)}/>
          <MiniStat icon={TrendingUp} tone="amber" label={text("À recevoir", "المتبقي")} value={money.format(stats?.outstandingTotal ?? 0)}/>
          <MiniStat icon={CheckCircle2} tone="violet" label={text("Taux", "النسبة")} value={`${collectionRate}%`}/>
        </div>
        <div className="mt-5">
          <div className="mb-2 flex justify-between text-xs font-bold text-slate-600"><span>{text("Évolution des encaissements", "تطور التحصيل")}</span><span className="text-emerald-600">{collectionRate}%</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-slate-100"><i className="block h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${collectionRate}%` }}/></div>
        </div>
      </Panel>

      <Panel title={text("Activité clinique", "النشاط السريري")} subtitle={text("Éléments à suivre", "عناصر للمتابعة")}>
        <div className="grid grid-cols-2 gap-3">
          <MiniStat icon={FlaskConical} tone="blue" label={text("Travaux laboratoire", "أعمال المختبر")} value={stats?.laboratoryJobsInProgress ?? 0}/>
          <MiniStat icon={Stethoscope} tone="emerald" label={text("Consultations", "الاستشارات")} value={stats?.consultationsThisMonth ?? 0}/>
          <MiniStat icon={UsersRound} tone="amber" label={text("Nouveaux patients", "مرضى جدد")} value={stats?.newPatientsThisMonth ?? 0}/>
        </div>
      </Panel>

      <Panel title={text("Prochains rendez-vous", "المواعيد القادمة")} subtitle={text("Aujourd’hui", "اليوم")}>
        <div className="space-y-1">
          {upcoming.length ? upcoming.map((item) => <Link
            key={item.id}
            to="/calendar"
            className="grid grid-cols-[44px_1fr_auto] items-center gap-2 rounded-xl px-2 py-2 transition hover:bg-blue-50"
          >
            <time className="text-xs font-extrabold text-blue-600">{new Date(item.startsAt).toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" })}</time>
            <span className="min-w-0"><strong className="block truncate text-xs">{item.patientName}</strong><small className="block truncate text-[10px] text-slate-500">{item.treatmentType || item.reason}</small></span>
            <span className="rounded-full bg-blue-50 px-2 py-1 text-[9px] font-bold text-blue-600">{text("À venir", "قادم")}</span>
          </Link>) : <div className="grid min-h-40 place-items-center text-center text-xs text-slate-400">
            <span><CalendarDays className="mx-auto mb-2 size-7"/>{text("Aucun rendez-vous à venir aujourd’hui.", "لا توجد مواعيد قادمة اليوم.")}</span>
          </div>}
        </div>
      </Panel>
    </section>

    <section className="grid grid-cols-3 gap-4 max-[1050px]:grid-cols-1">
      <Panel
        title={text("Nouveaux patients", "المرضى الجدد")}
        subtitle={text("Répartition par semaine ce mois-ci", "التوزيع الأسبوعي لهذا الشهر")}
      >
        <WeeklyPatientsChart data={stats?.newPatientsByWeek ?? []}/>
      </Panel>

      <Panel
        title={text("Consultations par type", "الاستشارات حسب النوع")}
        subtitle={text("Répartition du mois en cours", "توزيع الشهر الحالي")}
      >
        <ConsultationCategoryChart data={stats?.consultationsByCategory ?? []}/>
      </Panel>

      <Panel
        title={text("Encaissements mensuels", "المداخيل الشهرية")}
        subtitle={text("Évolution des 6 derniers mois (MAD)", "تطور آخر 6 أشهر بالدرهم")}
      >
        <MonthlyCollectionsChart data={stats?.collectionsLast6Months ?? []} locale={locale}/>
      </Panel>
    </section>

    <footer className="flex items-center justify-end gap-2 text-[10px] text-slate-400">
      <RefreshCw className="size-3.5"/>
      {stats ? text(
        `Dernière actualisation : ${new Date(stats.generatedAt).toLocaleString(locale)}`,
        `آخر تحديث: ${new Date(stats.generatedAt).toLocaleString(locale)}`
      ) : text("Connexion au backend local…", "جارٍ الاتصال بالخادم المحلي…")}
    </footer>
  </div>;
}

const tones = {
  blue: "bg-blue-50 text-blue-600",
  emerald: "bg-emerald-50 text-emerald-600",
  violet: "bg-violet-50 text-violet-600",
  amber: "bg-amber-50 text-amber-600",
  rose: "bg-rose-50 text-rose-600"
} as const;

function Kpi({ icon: Icon, tone, label, value, detail }: {
  icon: ComponentType<{ className?: string }>; tone: keyof typeof tones; label: string;
  value: string | number; detail: string;
}) {
  return <article className="flex min-h-28 items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${tones[tone]}`}><Icon className="size-7"/></span>
    <div className="min-w-0"><small className="block truncate text-[10px] font-bold uppercase tracking-wide text-slate-500">{label}</small>
      <strong className="mt-1 block truncate text-2xl font-extrabold">{value}</strong><p className="mt-1 truncate text-[10px] text-slate-500">{detail}</p></div>
  </article>;
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <header className="mb-4"><h2 className="text-base font-extrabold">{title}</h2><p className="mt-0.5 text-[11px] text-slate-500">{subtitle}</p></header>
    {children}
  </article>;
}

function MiniStat({ icon: Icon, tone, label, value }: {
  icon: ComponentType<{ className?: string }>; tone: keyof typeof tones; label: string; value: string | number;
}) {
  return <div className={`rounded-xl p-3 ${tones[tone]}`}><Icon className="mb-3 size-5"/><small className="block text-[9px] font-bold uppercase opacity-70">{label}</small><strong className="mt-1 block truncate text-base font-extrabold">{value}</strong></div>;
}

function StatusRow({ icon: Icon, tone, label, value }: {
  icon: ComponentType<{ className?: string }>; tone: keyof typeof tones; label: string; value: number;
}) {
  return <div className="flex items-center gap-3 px-3 py-2.5"><span className={`grid size-7 place-items-center rounded-lg ${tones[tone]}`}><Icon className="size-4"/></span><strong className="flex-1 text-xs">{label}</strong><b className="text-sm">{value}</b></div>;
}

function Donut({ total, planned, completed }: { total: number; planned: number; completed: number }) {
  const safe = Math.max(1, total);
  const plannedPart = planned / safe * 100;
  const completedPart = completed / safe * 100;
  return <div className="relative mx-auto size-32 rounded-full" style={{
    background: `conic-gradient(#3b82f6 0 ${plannedPart}%, #10b981 ${plannedPart}% ${plannedPart + completedPart}%, #e2e8f0 ${plannedPart + completedPart}% 100%)`
  }}>
    <div className="absolute inset-5 grid place-items-center rounded-full bg-white text-center"><span><strong className="block text-2xl font-extrabold">{total}</strong><small className="text-[10px] text-slate-500">Total</small></span></div>
  </div>;
}

function ActivityLineChart({ data }: { data: DailyActivity[] }) {
  const width = 620;
  const height = 205;
  const paddingX = 28;
  const paddingY = 22;
  const max = Math.max(1, ...data.flatMap((item) => [item.appointments, item.consultations]));
  const points = (key: "appointments" | "consultations") => data.map((item, index) => {
    const x = paddingX + index * ((width - paddingX * 2) / Math.max(1, data.length - 1));
    const y = height - paddingY - item[key] / max * (height - paddingY * 2);
    return { x, y, value: item[key], label: item.label };
  });
  const appointmentPoints = points("appointments");
  const consultationPoints = points("consultations");
  const path = (items: { x: number; y: number }[]) => items.map((item, index) => `${index ? "L" : "M"} ${item.x} ${item.y}`).join(" ");

  return <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${width} ${height + 25}`} className="min-w-[560px]">
      {[0, 1, 2, 3, 4].map((line) => <line key={line} x1={paddingX} x2={width - paddingX} y1={paddingY + line * 40} y2={paddingY + line * 40} stroke="#e2e8f0" strokeDasharray="4 4"/>)}
      <path d={path(appointmentPoints)} fill="none" stroke="#3b82f6" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      <path d={path(consultationPoints)} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {appointmentPoints.map((item, index) => <g key={`a-${index}`}><circle cx={item.x} cy={item.y} r="4" fill="#3b82f6"/><text x={item.x} y={height + 15} textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text></g>)}
      {consultationPoints.map((item, index) => <circle key={`c-${index}`} cx={item.x} cy={item.y} r="4" fill="#10b981"/>)}
    </svg>
  </div>;
}

function WeeklyPatientsChart({ data }: { data: WeeklyPatients[] }) {
  const max = Math.max(1, ...data.map((item) => item.patients));
  return <div className="flex h-52 items-end justify-around gap-3 border-b border-slate-200 px-2 pb-7">
    {data.length ? data.map((item) => <div key={item.label} className="flex h-full flex-1 flex-col justify-end">
      <span className="mb-1 text-center text-[10px] font-bold text-blue-600">{item.patients}</span>
      <div className="mx-auto w-full max-w-12 rounded-t-lg bg-gradient-to-t from-blue-600 to-blue-400 transition-all"
           style={{ height: `${Math.max(7, item.patients / max * 145)}px` }}/>
      <span className="-mb-6 mt-2 whitespace-nowrap text-center text-[10px] font-semibold text-slate-500">{item.label}</span>
    </div>) : <EmptyChart/>}
  </div>;
}

const categoryColors = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#14b8a6"];

function ConsultationCategoryChart({ data }: { data: ConsultationCategory[] }) {
  const total = data.reduce((sum, item) => sum + item.consultations, 0);
  let cursor = 0;
  const gradient = data.map((item, index) => {
    const start = cursor;
    cursor += total ? item.consultations / total * 100 : 0;
    return `${categoryColors[index % categoryColors.length]} ${start}% ${cursor}%`;
  }).join(", ");

  return <div className="grid min-h-52 grid-cols-[140px_1fr] items-center gap-5 max-[450px]:grid-cols-1">
    <div className="relative mx-auto size-32 rounded-full" style={{
      background: total ? `conic-gradient(${gradient})` : "#e2e8f0"
    }}>
      <div className="absolute inset-7 grid place-items-center rounded-full bg-white text-center">
        <span><strong className="block text-xl">{total}</strong><small className="text-[9px] text-slate-400">Total</small></span>
      </div>
    </div>
    <div className="space-y-2">
      {data.map((item, index) => {
        const percent = total ? Math.round(item.consultations / total * 100) : 0;
        return <div key={item.category} className="grid grid-cols-[8px_1fr_auto] items-center gap-2 text-[10px]">
          <i className="size-2 rounded-sm" style={{ backgroundColor: categoryColors[index % categoryColors.length] }}/>
          <span className="truncate font-semibold text-slate-600">{item.category}</span>
          <strong>{percent}%</strong>
        </div>;
      })}
    </div>
  </div>;
}

function MonthlyCollectionsChart({ data, locale }: { data: MonthlyCollections[]; locale: string }) {
  const width = 420;
  const height = 175;
  const padding = 20;
  const max = Math.max(1, ...data.map((item) => item.amount));
  const points = data.map((item, index) => ({
    x: padding + index * ((width - padding * 2) / Math.max(1, data.length - 1)),
    y: height - padding - item.amount / max * (height - padding * 2),
    ...item
  }));
  const line = points.map((item, index) => `${index ? "L" : "M"} ${item.x} ${item.y}`).join(" ");
  const area = points.length ? `${line} L ${points.at(-1)?.x} ${height - padding} L ${points[0].x} ${height - padding} Z` : "";
  const compact = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 });

  return <div className="overflow-x-auto">
    <svg viewBox={`0 0 ${width} ${height + 30}`} className="min-h-52 min-w-[390px]">
      {[0, 1, 2, 3].map((row) => <line key={row} x1={padding} x2={width - padding}
        y1={padding + row * 42} y2={padding + row * 42} stroke="#e2e8f0" strokeDasharray="4 4"/>)}
      <path d={area} fill="#10b981" opacity=".09"/>
      <path d={line} fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
      {points.map((item) => <g key={item.label}>
        <circle cx={item.x} cy={item.y} r="4" fill="#10b981"/>
        <text x={item.x} y={item.y - 10} textAnchor="middle" fontSize="9" fontWeight="700" fill="#059669">
          {compact.format(item.amount)}
        </text>
        <text x={item.x} y={height + 8} textAnchor="middle" fontSize="10" fill="#64748b">{item.label}</text>
      </g>)}
    </svg>
  </div>;
}

function EmptyChart() {
  return <div className="grid h-full flex-1 place-items-center text-xs text-slate-400">Aucune donnée</div>;
}

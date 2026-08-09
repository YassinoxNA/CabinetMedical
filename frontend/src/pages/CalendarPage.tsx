import {
  AlertCircle,
  CalendarCheck2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleUserRound,
  Clock3,
  Columns3,
  Grid3X3,
  List,
  LoaderCircle,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  UserCheck,
  UserRound,
  UsersRound,
  X,
  XCircle
} from "lucide-react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  format,
  isSameMonth,
  startOfDay,
  startOfMonth,
  startOfWeek
} from "date-fns";
import { arMA, fr } from "date-fns/locale";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useLanguage } from "../i18n/LanguageContext";
import { PatientSearchSelect } from "../components/PatientSearchSelect";
import { api } from "../services/api";
import type { Appointment, Page, Patient } from "../types";

interface Setting {
  key: string;
  value: string;
  valueType: string;
}

interface AppointmentForm {
  patientId: string;
  date: string;
  start: string;
  treatmentType: string;
}

type CalendarView = "day" | "week" | "month" | "agenda";

const defaultSchedule: Record<string, string> = {
  sunday: "",
  monday: "09:00-13:00,15:00-18:00",
  tuesday: "09:00-13:00,15:00-18:00",
  wednesday: "09:00-13:00,15:00-18:00",
  thursday: "09:00-13:00,15:00-18:00",
  friday: "09:00-13:00,15:00-18:00",
  saturday: "09:00-13:00"
};

const dayKeys = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const treatmentTypeOptions = [
  { value: "Obturation composite", fr: "Obturation composite", ar: "حشوة كومبوزيت" },
  { value: "Couronne zircone", fr: "Couronne zircone", ar: "تاج زيركون" },
  { value: "Couronne céramo-céramique", fr: "Couronne céramo-céramique", ar: "تاج سيراميك كامل" },
  { value: "Détartrage", fr: "Détartrage", ar: "إزالة الجير" },
  { value: "PAP TCS", fr: "PAP TCS", ar: "تركيبة متحركة PAP TCS" },
  { value: "PAP stellite", fr: "PAP stellite", ar: "تركيبة متحركة معدنية PAP" }
];
const closedStatuses = new Set(["ANNULE", "TERMINE"]);

const createInitialForm = (patientId = ""): AppointmentForm => ({
  patientId,
  date: format(addDays(new Date(), 1), "yyyy-MM-dd"),
  start: "",
  treatmentType: ""
});

const fieldLabelClass = "mb-2 flex items-center gap-1 text-xs font-semibold text-slate-700";
const fieldClass =
  "h-12 w-full rounded-xl border border-slate-200 bg-white px-11 pr-4 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 hover:border-slate-300 focus:border-teal-600 focus:ring-4 focus:ring-teal-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
const fieldIconClass =
  "pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400";
const secondaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:pointer-events-none disabled:opacity-50";
const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white shadow-lg shadow-teal-700/15 transition hover:bg-teal-700 focus:outline-none focus:ring-4 focus:ring-teal-100 disabled:pointer-events-none disabled:opacity-50";
const iconButtonClass =
  "inline-flex size-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40";

const statusStyles: Record<string, { label: string; badge: string; card: string; dot: string }> = {
  PLANIFIE: {
    label: "Planifié",
    badge: "border-blue-200 bg-blue-50 text-blue-700",
    card: "border-l-blue-500",
    dot: "bg-blue-500"
  },
  CONFIRME: {
    label: "Confirmé",
    badge: "border-emerald-200 bg-emerald-50 text-emerald-700",
    card: "border-l-emerald-500",
    dot: "bg-emerald-500"
  },
  PATIENT_ARRIVE: {
    label: "Patient arrivé",
    badge: "border-teal-200 bg-teal-50 text-teal-700",
    card: "border-l-teal-500",
    dot: "bg-teal-500"
  },
  EN_CONSULTATION: {
    label: "En consultation",
    badge: "border-violet-200 bg-violet-50 text-violet-700",
    card: "border-l-violet-500",
    dot: "bg-violet-500"
  },
  TERMINE: {
    label: "Terminé",
    badge: "border-slate-200 bg-slate-100 text-slate-600",
    card: "border-l-slate-400",
    dot: "bg-slate-400"
  },
  ANNULE: {
    label: "Annulé",
    badge: "border-rose-200 bg-rose-50 text-rose-700",
    card: "border-l-rose-400",
    dot: "bg-rose-400"
  },
  ABSENT: {
    label: "Absent",
    badge: "border-amber-200 bg-amber-50 text-amber-700",
    card: "border-l-amber-500",
    dot: "bg-amber-500"
  },
  REPORTE: {
    label: "Reporté",
    badge: "border-orange-200 bg-orange-50 text-orange-700",
    card: "border-l-orange-500",
    dot: "bg-orange-500"
  }
};

const fallbackStatusStyle = {
  label: "Rendez-vous",
  badge: "border-slate-200 bg-slate-100 text-slate-600",
  card: "border-l-slate-400",
  dot: "bg-slate-400"
};

const statusArabicLabels: Record<string, string> = {
  PLANIFIE: "مجدول",
  CONFIRME: "مؤكد",
  PATIENT_ARRIVE: "وصل المريض",
  EN_CONSULTATION: "قيد الاستشارة",
  TERMINE: "مكتمل",
  ANNULE: "ملغى",
  ABSENT: "غائب",
  REPORTE: "مؤجل"
};

function getStatusStyle(status: string, isArabic: boolean) {
  const style = statusStyles[status] ?? {
    ...fallbackStatusStyle,
    label: status.replaceAll("_", " ").toLocaleLowerCase(isArabic ? "ar" : "fr")
  };
  return isArabic
    ? { ...style, label: statusArabicLabels[status] || style.label }
    : style;
}

function getTreatmentTheme(appointment: Appointment) {
  switch (appointment.status) {
    case "CONFIRME":
      return { card: "border-emerald-300 bg-emerald-50 text-emerald-950", accent: "text-emerald-700", dot: "bg-emerald-500" };
    case "PATIENT_ARRIVE":
      return { card: "border-teal-300 bg-teal-50 text-teal-950", accent: "text-teal-700", dot: "bg-teal-500" };
    case "EN_CONSULTATION":
      return { card: "border-violet-300 bg-violet-50 text-violet-950", accent: "text-violet-700", dot: "bg-violet-500" };
    case "TERMINE":
      return { card: "border-slate-300 bg-slate-100 text-slate-800", accent: "text-slate-600", dot: "bg-slate-500" };
    case "ABSENT":
      return { card: "border-amber-300 bg-amber-50 text-amber-950", accent: "text-amber-700", dot: "bg-amber-500" };
    case "REPORTE":
      return { card: "border-orange-300 bg-orange-50 text-orange-950", accent: "text-orange-700", dot: "bg-orange-500" };
    case "ANNULE":
      return { card: "border-rose-300 bg-rose-50 text-rose-950", accent: "text-rose-700", dot: "bg-rose-500" };
    default:
      return { card: "border-blue-300 bg-blue-50 text-blue-950", accent: "text-blue-700", dot: "bg-blue-500" };
  }
}

function isFeedbackError(message: string) {
  return /impossible|indisponible|obligatoire|erreur|conflit|échoué|تعذّر|غير متاح|إلزامية|خطأ|تعارض|فشل/i.test(message);
}

async function loadAllPatients() {
  const firstPage = await api.get<Page<Patient>>("/patients?page=0&size=100");
  if (firstPage.totalPages <= 1) return firstPage.content;

  const remainingPages = await Promise.all(
    Array.from({ length: firstPage.totalPages - 1 }, (_, index) =>
      api.get<Page<Patient>>(`/patients?page=${index + 1}&size=100`)
    )
  );
  return [firstPage, ...remainingPages].flatMap((page) => page.content);
}

export function CalendarPage() {
  const { text, language, isArabic } = useLanguage();
  const dateLocale = language === "ar" ? arMA : fr;
  const [params] = useSearchParams();
  const requestedPatientId = params.get("patient") || "";
  const [reference, setReference] = useState(new Date());
  const [calendarView, setCalendarView] = useState<CalendarView>("month");
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Appointment | null>(null);
  const [form, setForm] = useState<AppointmentForm>(() => createInitialForm(requestedPatientId));
  const [doctorSchedule, setDoctorSchedule] = useState(defaultSchedule);
  const [availableTimes, setAvailableTimes] = useState<string[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [feedback, setFeedback] = useState("");
  const [saving, setSaving] = useState(false);
  const [actionPendingId, setActionPendingId] = useState("");
  const [cancelling, setCancelling] = useState<Appointment | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");

  const weekStart = startOfWeek(reference, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const calendarRange = useMemo(() => {
    if (calendarView === "month") {
      const start = startOfWeek(startOfMonth(reference), { weekStartsOn: 1 });
      // Keep a complete and stable monthly calendar: 6 weeks, Monday to Sunday.
      const end = addDays(start, 42);
      return { start, end };
    }
    if (calendarView === "day") {
      const start = startOfDay(reference);
      return { start, end: addDays(start, 1) };
    }
    return { start: weekStart, end: addDays(weekStart, 7) };
  }, [calendarView, reference]);

  async function load(silent = false) {
    if (!silent) {
      setCalendarLoading(true);
      setLoadError("");
    }
    try {
      const currentDayStart = startOfDay(new Date());
      const calendarRequest = api.get<Appointment[]>(
        `/appointments?from=${calendarRange.start.toISOString()}&to=${calendarRange.end.toISOString()}`
      );
      const todayRequest = api.get<Appointment[]>(
        `/appointments?from=${currentDayStart.toISOString()}&to=${addDays(currentDayStart, 1).toISOString()}`
      ).catch(() => [] as Appointment[]);
      const patientsRequest = loadAllPatients().catch(() => [] as Patient[]);
      const settingsRequest = api.get<Setting[]>("/settings").catch(() => [] as Setting[]);
      const calendar = await calendarRequest;

      setAppointments(
        [...calendar].sort(
          (first, second) =>
            new Date(first.startsAt).getTime() - new Date(second.startsAt).getTime()
          )
      );
      setTodayAppointments(await todayRequest);

      const [loadedPatients, settings] = await Promise.all([patientsRequest, settingsRequest]);
      setPatients(loadedPatients);

      const configuredSchedule = { ...defaultSchedule };
      settings
        .filter((item) => item.key.startsWith("appointment.schedule."))
        .forEach((item) => {
          configuredSchedule[item.key.split(".").pop()!] = item.value || "";
        });
      setDoctorSchedule(configuredSchedule);
    } catch {
      if (!silent) {
        setLoadError(
          text(
            "Le planning n’a pas pu être chargé. Vérifiez que le backend local est démarré, puis réessayez.",
            "تعذّر تحميل جدول المواعيد. تأكد من تشغيل الخادم المحلي ثم أعد المحاولة."
          )
        );
      }
    } finally {
      if (!silent) setCalendarLoading(false);
    }
  }

  useEffect(() => {
    void load();
    const refreshTimer = window.setInterval(() => void load(true), 60_000);
    return () => window.clearInterval(refreshTimer);
  }, [reference, calendarView, language]);

  useEffect(() => {
    if (requestedPatientId) {
      setForm((current) => ({ ...current, patientId: requestedPatientId }));
      setOpen(true);
    }
  }, [requestedPatientId]);

  useEffect(() => {
    if (!open || !form.date) {
      setAvailableTimes([]);
      return;
    }

    let cancelled = false;
    const search = new URLSearchParams({
      date: form.date
    });
    if (editing?.id) {
      search.set("excludedId", editing.id);
    }

    setAvailabilityLoading(true);
    setAvailabilityError("");
    api
      .get<string[]>(`/appointments/available-times?${search.toString()}`)
      .then((times) => {
        if (cancelled) return;
        setAvailableTimes(times);
        setForm((current) => ({
          ...current,
          start: times.includes(current.start) ? current.start : times[0] || ""
        }));
      })
      .catch(() => {
        if (cancelled) return;
        setAvailableTimes([]);
        setAvailabilityError(
          text(
            "Impossible de vérifier les disponibilités. Réessayez dans un instant.",
            "تعذّر التحقق من الأوقات المتاحة. أعد المحاولة بعد قليل."
          )
        );
        setForm((current) => ({ ...current, start: "" }));
      })
      .finally(() => {
        if (!cancelled) setAvailabilityLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, form.date, editing?.id]);

  const visibleAppointments = useMemo(
    () => appointments.filter((item) => item.status !== "ANNULE"),
    [appointments]
  );
  const activeTodayAppointments = useMemo(
    () => todayAppointments.filter((item) => item.status !== "ANNULE"),
    [todayAppointments]
  );
  const todayPatients = useMemo(
    () => new Set(activeTodayAppointments.map((item) => item.patientId)).size,
    [activeTodayAppointments]
  );
  const todayConsultations = useMemo(
    () => activeTodayAppointments.filter((item) =>
      ["PATIENT_ARRIVE", "EN_CONSULTATION", "TERMINE"].includes(item.status)).length,
    [activeTodayAppointments]
  );

  const displayedDays = calendarView === "day" ? [startOfDay(reference)] : weekDays;
  const periodTitle = calendarView === "day"
    ? format(reference, "EEEE d MMMM yyyy", { locale: dateLocale })
    : calendarView === "month"
      ? format(reference, "MMMM yyyy", { locale: dateLocale })
      : `${format(weekStart, "d MMM", { locale: dateLocale })} — ${format(addDays(weekStart, 6), "d MMM yyyy", { locale: dateLocale })}`;

  function movePeriod(direction: -1 | 1) {
    setReference((current) => calendarView === "month"
      ? addMonths(current, direction)
      : addDays(current, direction * (calendarView === "day" ? 1 : 7)));
  }

  function openNewAppointment(date?: string) {
    if (date && date < todayKey) {
      setFeedback(text(
        "Impossible de planifier un rendez-vous à une date antérieure à aujourd’hui.",
        "لا يمكن برمجة موعد بتاريخ يسبق اليوم."
      ));
      return;
    }
    setEditing(null);
    setFeedback("");
    setForm({
      ...createInitialForm(requestedPatientId),
      date: date || createInitialForm().date
    });
    setOpen(true);
  }

  function closeModal() {
    if (saving) return;
    setOpen(false);
    setEditing(null);
    setAvailabilityError("");
  }

  function edit(item: Appointment) {
    const startsAt = new Date(item.startsAt);
    setEditing(item);
    setFeedback("");
    setForm({
      patientId: item.patientId,
      date: format(startsAt, "yyyy-MM-dd"),
      start: format(startsAt, "HH:mm"),
      treatmentType: item.treatmentType || item.reason || ""
    });
    setOpen(true);
  }

  async function save(event: FormEvent) {
    event.preventDefault();
    setFeedback("");

    if (
      !form.patientId ||
      !form.date ||
      !form.start ||
      !form.treatmentType.trim()
    ) {
      setFeedback(text("Tous les champs du rendez-vous sont obligatoires.", "جميع حقول الموعد إلزامية."));
      return;
    }
    if (form.date < todayKey) {
      setFeedback(text(
        "La date du rendez-vous ne peut pas être antérieure à aujourd’hui.",
        "لا يمكن أن يكون تاريخ الموعد قبل تاريخ اليوم."
      ));
      return;
    }
    if (!availableTimes.includes(form.start)) {
      setAvailabilityError(text("Ce créneau n’est plus disponible. Choisissez une autre heure.", "هذا الموعد لم يعد متاحاً. اختر وقتاً آخر."));
      return;
    }

    setSaving(true);
    try {
      const startsAt = new Date(`${form.date}T${form.start}:00`);
      const payload = {
        patientId: form.patientId,
        startsAt: startsAt.toISOString(),
        endsAt: startsAt.toISOString(),
        reason: form.treatmentType.trim(),
        treatmentType: form.treatmentType.trim(),
        observations: null
      };

      if (editing) {
        await api.put(`/appointments/${editing.id}`, payload);
      } else {
        await api.post("/appointments", payload);
      }

      const action = editing
        ? text("modifié", "تعديله")
        : text("créé", "إنشاؤه");
      setFeedback(text(`Rendez-vous ${action} avec succès.`, `تم ${action} الموعد بنجاح.`));
      setOpen(false);
      setEditing(null);
      setForm(createInitialForm());
      await load();
    } catch (reason) {
      setFeedback(
        (reason as { message?: string }).message || text("Rendez-vous impossible sur ce créneau.", "لا يمكن حجز موعد في هذا الوقت.")
      );
    } finally {
      setSaving(false);
    }
  }

  async function arrive(id: string) {
    setActionPendingId(id);
    setFeedback("");
    try {
      await api.post(`/appointments/${id}/arrived`);
      setFeedback(text("Le patient est maintenant indiqué comme arrivé.", "تم تسجيل وصول المريض."));
      await load();
    } catch (reason) {
      setFeedback(
        (reason as { message?: string }).message ||
          text("Impossible de mettre à jour le statut du rendez-vous.", "تعذّر تحديث حالة الموعد.")
      );
    } finally {
      setActionPendingId("");
    }
  }

  function canCancelAppointment(item: Appointment) {
    return !closedStatuses.has(item.status)
      && format(new Date(item.startsAt), "yyyy-MM-dd") > todayKey;
  }

  function requestCancellation(item: Appointment) {
    if (!canCancelAppointment(item)) {
      setFeedback(text(
        "L’annulation est autorisée uniquement avant le jour du rendez-vous.",
        "يمكن إلغاء الموعد فقط قبل يومه."
      ));
      return;
    }
    setCancellationReason("");
    setCancelling(item);
  }

  async function confirmCancellation(event: FormEvent) {
    event.preventDefault();
    if (!cancelling || !cancellationReason.trim()) return;

    setActionPendingId(cancelling.id);
    setFeedback("");
    try {
      await api.post(`/appointments/${cancelling.id}/cancel`, {
        reason: cancellationReason.trim()
      });
      setFeedback(text("Rendez-vous annulé avec succès.", "تم إلغاء الموعد بنجاح."));
      setCancelling(null);
      setCancellationReason("");
      await load();
    } catch (reason) {
      setFeedback(
        (reason as { message?: string }).message || text("Impossible d’annuler ce rendez-vous.", "تعذّر إلغاء هذا الموعد.")
      );
    } finally {
      setActionPendingId("");
    }
  }

  function appointmentGridCard(
    item: Appointment,
    rowStart: number,
    rowSpan: number,
    laneIndex = 0,
    laneCount = 1
  ) {
    const theme = getTreatmentTheme(item);
    const isClosed = closedStatuses.has(item.status);
    const pending = actionPendingId === item.id;
    return (
      <div
        key={item.id}
        className={`group relative z-10 overflow-hidden rounded-lg border px-2 py-1 shadow-sm transition hover:z-20 hover:-translate-y-0.5 hover:shadow-lg ${theme.card} ${item.status === "ANNULE" ? "opacity-60" : ""}`}
        style={{
          gridRow: `${rowStart} / span ${Math.max(1, rowSpan)}`,
          width: `calc(${100 / laneCount}% - 6px)`,
          marginLeft: `calc(${laneIndex * 100 / laneCount}% + 3px)`
        }}
      >
        <button type="button" className="block h-full w-full overflow-hidden text-left" disabled={isClosed} onClick={() => edit(item)}>
          <span className="flex min-w-0 items-center gap-1.5">
            <strong className="min-w-0 flex-1 truncate text-[10px] font-extrabold text-slate-950">
              {item.patientName}
            </strong>
            <time className={`shrink-0 text-[9px] font-extrabold ${theme.accent}`}>
              {format(new Date(item.startsAt), "HH:mm")}
            </time>
          </span>
          <span className="block truncate text-[9px] font-semibold text-slate-700">
            {item.treatmentType || item.reason || text("Consultation", "استشارة")}
          </span>
        </button>
        {!isClosed && rowSpan >= 2 && (
          <div className="absolute bottom-1.5 right-1.5 hidden items-center gap-1 group-hover:flex">
            <button type="button" title={text("Modifier", "تعديل")} disabled={pending}
              className="grid size-6 place-items-center rounded-md bg-white/95 text-blue-700 shadow" onClick={() => edit(item)}>
              <Pencil size={12}/>
            </button>
            {item.status !== "PATIENT_ARRIVE" && item.status !== "EN_CONSULTATION" && (
              <button type="button" title={text("Patient arrivé", "وصل المريض")} disabled={pending}
                className="grid size-6 place-items-center rounded-md bg-white/90 text-emerald-700 shadow" onClick={() => void arrive(item.id)}>
                {pending ? <LoaderCircle className="animate-spin" size={12}/> : <UserCheck size={12}/>} 
              </button>
            )}
            <button type="button" title={text("Annuler", "إلغاء")} disabled={pending || !canCancelAppointment(item)}
              className="grid size-6 place-items-center rounded-md bg-white/90 text-rose-700 shadow" onClick={() => requestCancellation(item)}>
              <XCircle size={12}/>
            </button>
          </div>
        )}
      </div>
    );
  }

  function timeGrid(viewDays: Date[]) {
    const dayKeysInView = new Set(viewDays.map((day) => format(day, "yyyy-MM-dd")));
    const gridAppointments = visibleAppointments.filter((item) =>
      dayKeysInView.has(format(new Date(item.startsAt), "yyyy-MM-dd")));
    const scheduleBounds = viewDays.flatMap((day) =>
      (doctorSchedule[dayKeys[day.getDay()]] || "").split(",").flatMap((period) =>
        period.split("-").map((time) => {
          const [hours, minutes] = time.trim().split(":").map(Number);
          return Number.isFinite(hours) ? hours * 60 + (minutes || 0) : NaN;
        }).filter(Number.isFinite)));
    const appointmentStarts = gridAppointments.map((item) => {
      const date = new Date(item.startsAt);
      return date.getHours() * 60 + date.getMinutes();
    });
    const startMinutes = Math.max(0, Math.floor(Math.min(8 * 60, ...scheduleBounds, ...appointmentStarts) / 60) * 60);
    const endMinutes = Math.min(24 * 60, Math.ceil(Math.max(18 * 60, ...scheduleBounds, ...appointmentStarts) / 60) * 60);
    const quarterRows = Math.max(4, Math.round((endMinutes - startMinutes) / 15));
    const columnClass = viewDays.length === 1
      ? "grid-cols-[72px_minmax(620px,1fr)] min-w-[760px]"
      : "grid-cols-[72px_repeat(7,minmax(185px,1fr))] min-w-[1430px]";

    return <div className="overflow-x-auto bg-white">
      <div className={`grid ${columnClass}`}>
        <div className="border-b border-r border-slate-200 bg-slate-50"/>
        {viewDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const count = gridAppointments.filter((item) => format(new Date(item.startsAt), "yyyy-MM-dd") === key).length;
          const isToday = key === todayKey;
          return <header key={key} className={`border-b border-r border-slate-200 px-3 py-3 text-center last:border-r-0 ${isToday ? "bg-teal-50" : "bg-white"}`}>
            <span className={`block text-[10px] font-extrabold uppercase tracking-wide ${day.getDay() === 0 ? "text-rose-500" : isToday ? "text-teal-700" : "text-slate-500"}`}>
              {format(day, "EEEE", { locale: dateLocale })}
            </span>
            <strong className="mt-1 block text-sm font-bold text-slate-900">{format(day, "d MMM", { locale: dateLocale })}</strong>
            <small className="mt-1 block text-[9px] text-slate-400">{count} {text("RDV", "موعد")}</small>
          </header>;
        })}

        <div className="grid border-r border-slate-200 bg-slate-50" style={{ gridTemplateRows: `repeat(${quarterRows}, 26px)` }}>
          {Array.from({ length: quarterRows }, (_, index) => {
            const minutes = startMinutes + index * 15;
            return <div key={index} className={`${index % 4 === 0 ? "border-t border-slate-200" : "border-t border-dashed border-slate-100"} px-2 text-right`}>
              {index % 4 === 0 && <time className="relative -top-2.5 bg-slate-50 px-1 text-[10px] font-semibold text-slate-500">
                {String(Math.floor(minutes / 60)).padStart(2, "0")}:00
              </time>}
            </div>;
          })}
        </div>

        {viewDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const schedule = (doctorSchedule[dayKeys[day.getDay()]] || "").split(",").filter(Boolean).map((period) => {
            const [start, end] = period.split("-");
            const toMinutes = (value: string) => {
              const [hours, minutes] = value.trim().split(":").map(Number);
              return hours * 60 + minutes;
            };
            return [toMinutes(start), toMinutes(end)] as const;
          });
          const daily = gridAppointments.filter((item) => format(new Date(item.startsAt), "yyyy-MM-dd") === key);
          const now = new Date();
          const nowMinutes = now.getHours() * 60 + now.getMinutes();
          const nowRow = Math.floor((nowMinutes - startMinutes) / 15) + 1;
          return <div key={key} className="relative grid border-r border-slate-200 last:border-r-0" style={{ gridTemplateRows: `repeat(${quarterRows}, 26px)` }}>
            {Array.from({ length: quarterRows }, (_, index) => {
              const minutes = startMinutes + index * 15;
              const working = schedule.some(([start, end]) => minutes >= start && minutes < end);
              return <button key={index} type="button" aria-label={text(`Planifier à ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`, `حجز موعد الساعة ${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`)}
                className={`border-t text-left ${index % 4 === 0 ? "border-slate-200" : "border-dashed border-slate-100"} ${working ? "bg-white hover:bg-teal-50/70" : "bg-slate-50/70"}`}
                onClick={() => working && openNewAppointment(key)}/>;
            })}
            {key === todayKey && nowRow > 0 && nowRow <= quarterRows && <div className="pointer-events-none z-20 border-t-2 border-rose-500" style={{ gridRow: `${nowRow}` }}>
              <i className="relative -left-1 -top-1.5 block size-2.5 rounded-full bg-rose-500"/>
            </div>}
            {daily.map((item) => {
              const starts = new Date(item.startsAt);
              const itemStart = starts.getHours() * 60 + starts.getMinutes();
              const rowStart = Math.floor((itemStart - startMinutes) / 15) + 1;
              return appointmentGridCard(item, rowStart, 1);
            })}
          </div>;
        })}
      </div>
    </div>;
  }

  function monthGrid() {
    const monthDays = eachDayOfInterval({ start: calendarRange.start, end: addDays(calendarRange.end, -1) });
    return <div className="overflow-x-auto bg-white p-4">
      <div className="grid min-w-[980px] grid-cols-7 grid-rows-[auto_repeat(6,minmax(8.5rem,1fr))] overflow-hidden rounded-xl border border-slate-200">
        {monthDays.slice(0, 7).map((day) => <div key={`head-${day.toISOString()}`} className="border-b border-r border-slate-200 bg-slate-50 p-2 text-center text-[10px] font-extrabold uppercase text-slate-500 last:border-r-0">
          {format(day, "EEEE", { locale: dateLocale })}
        </div>)}
        {monthDays.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const isPastDay = key < todayKey;
          const daily = visibleAppointments.filter((item) => format(new Date(item.startsAt), "yyyy-MM-dd") === key);
          return <div key={key} className={`min-h-36 border-b border-r border-slate-200 p-2 text-left transition ${isPastDay ? "bg-slate-100/80 text-slate-400" : "hover:bg-teal-50/50"} ${!isSameMonth(day, reference) ? "bg-slate-50/70 text-slate-400" : isPastDay ? "" : "bg-white"}`}>
            <button type="button" disabled={isPastDay} onClick={() => openNewAppointment(key)} className="rounded-full">
            <strong className={`text-xs ${key === todayKey ? "grid size-7 place-items-center rounded-full bg-teal-600 text-white" : ""}`}>{format(day, "d")}</strong>
            </button>
            <span className="mt-2 grid gap-1">
              {daily.slice(0, 3).map((item) => {
                const theme = getTreatmentTheme(item);
                return <button type="button" onClick={() => edit(item)} key={item.id} className={`truncate rounded-md border px-2 py-1 text-left text-[9px] font-semibold shadow-sm hover:shadow ${theme.card}`}>
                  {format(new Date(item.startsAt), "HH:mm")} · {item.patientName}
                </button>;
              })}
              {daily.length > 3 && <small className="text-[9px] font-bold text-teal-700">+{daily.length - 3} {text("autres", "أخرى")}</small>}
            </span>
          </div>;
        })}
      </div>
    </div>;
  }

  function agendaView() {
    return <div className="grid min-h-[520px] content-start gap-3 bg-slate-50/60 p-5">
      {visibleAppointments.length === 0 ? <div className="grid min-h-[460px] place-items-center rounded-2xl border border-dashed border-slate-200 bg-white text-sm text-slate-400">{text("Aucun rendez-vous sur cette période.", "لا توجد مواعيد في هذه الفترة.")}</div>
        : visibleAppointments.map((item) => {
          const theme = getTreatmentTheme(item);
          const style = getStatusStyle(item.status, isArabic);
          return <article key={item.id} className={`grid grid-cols-[120px_minmax(0,1fr)_auto] items-center gap-4 rounded-xl border border-l-4 border-slate-200 bg-white p-4 shadow-sm max-[700px]:grid-cols-1 ${style.card}`}>
            <time className={`text-sm font-extrabold ${theme.accent}`}>{format(new Date(item.startsAt), "EEE d MMM", { locale: dateLocale })}<small className="mt-1 block text-[10px] text-slate-500">{format(new Date(item.startsAt), "HH:mm")}</small></time>
            <div><strong className="text-sm text-slate-900">{item.patientName}</strong><p className="mt-1 text-xs text-slate-500">{item.treatmentType || item.reason || text("Consultation", "استشارة")}</p><span className={`mt-2 inline-flex rounded-full border px-2 py-1 text-[9px] font-bold uppercase ${style.badge}`}>{style.label}</span></div>
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" className={secondaryButtonClass} disabled={closedStatuses.has(item.status)} onClick={() => edit(item)}><Pencil size={14}/>{text("Modifier", "تعديل")}</button>
              <button type="button" className={`${secondaryButtonClass} text-rose-700`} disabled={!canCancelAppointment(item)} onClick={() => requestCancellation(item)}><XCircle size={14}/>{text("Annuler", "إلغاء")}</button>
            </div>
          </article>;
        })}
    </div>;
  }

  return (
    <>
      <h1 className="sr-only">{text("Planning des rendez-vous", "جدول المواعيد")}</h1>

      <section className="mb-5 grid grid-cols-4 gap-3 max-[1100px]:grid-cols-2 max-[640px]:grid-cols-1">
        <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-50 text-teal-700">
            <CalendarCheck2 size={20} />
          </span>
          <div>
            <small className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {text("Rendez-vous aujourd’hui", "مواعيد اليوم")}
            </small>
            <strong className="mt-0.5 block text-2xl font-extrabold text-slate-900">
              {activeTodayAppointments.length}
            </strong>
            <span className="text-[10px] text-slate-500">{text("planning du jour", "برنامج اليوم")}</span>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <UsersRound size={20} />
          </span>
          <div>
            <small className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {text("Patients aujourd’hui", "مرضى اليوم")}
            </small>
            <strong className="mt-0.5 block text-2xl font-extrabold text-slate-900">
              {todayPatients}
            </strong>
            <span className="text-[10px] text-slate-500">{text("patients distincts", "مرضى مختلفون")}</span>
          </div>
        </article>

        <article className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-700">
            <UserCheck size={20} />
          </span>
          <div>
            <small className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {text("Consultations", "الاستشارات")}
            </small>
            <strong className="mt-0.5 block text-2xl font-extrabold text-slate-900">
              {todayConsultations}
            </strong>
            <span className="text-[10px] text-slate-500">{text("arrivés, en cours ou terminés", "وصلوا أو قيد العلاج أو انتهوا")}</span>
          </div>
        </article>

      </section>

      <section className="min-h-[calc(100vh-250px)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4">
          <div className="flex flex-wrap items-center gap-3">
            <button className={primaryButtonClass} type="button" onClick={() => openNewAppointment()}>
              <Plus size={18} />
              {text("Nouveau rendez-vous", "موعد جديد")}
            </button>
            <button type="button" className={secondaryButtonClass} onClick={() => setReference(new Date())}>
              <CalendarDays size={17} />
              {text("Aujourd’hui", "اليوم")}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className={iconButtonClass}
              aria-label={text("Période précédente", "الفترة السابقة")}
              onClick={() => movePeriod(-1)}
            >
              <ChevronLeft size={18} />
            </button>

            <div className="min-w-52 text-center">
              <strong className="block text-base font-extrabold capitalize text-slate-900">{periodTitle}</strong>
            </div>

            <button
              type="button"
              className={iconButtonClass}
              aria-label={text("Période suivante", "الفترة التالية")}
              onClick={() => movePeriod(1)}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="relative flex flex-wrap items-center gap-2">
            <div className="inline-flex overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              {([
                ["day", text("Jour", "يوم"), Columns3],
                ["week", text("Semaine", "أسبوع"), CalendarDays],
                ["month", text("Mois", "شهر"), Grid3X3],
                ["agenda", text("Agenda", "اللائحة"), List]
              ] as const).map(([value, label, Icon]) => (
                <button key={value} type="button" onClick={() => setCalendarView(value)}
                  className={`inline-flex h-10 items-center gap-1.5 border-r border-slate-200 px-3 text-xs font-bold transition last:border-r-0 ${calendarView === value ? "bg-teal-50 text-teal-700" : "text-slate-600 hover:bg-slate-50"}`}>
                  <Icon size={14}/>{label}
                </button>
              ))}
            </div>
            <button
              type="button"
              className={iconButtonClass}
              aria-label={text("Actualiser le planning", "تحديث الجدول")}
              title={text("Actualiser le planning", "تحديث الجدول")}
              disabled={calendarLoading}
              onClick={() => void load()}
            >
              <RefreshCw className={calendarLoading ? "animate-spin" : ""} size={17} />
            </button>
          </div>
        </div>

        {feedback && (
          <div
            className={`mx-5 mt-4 flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${
              isFeedbackError(feedback)
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
            role="status"
          >
            {isFeedbackError(feedback) ? (
              <AlertCircle className="mt-0.5 size-4 shrink-0" />
            ) : (
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
            )}
            <span>{feedback}</span>
            <button
              type="button"
              className="ml-auto text-current opacity-60 transition hover:opacity-100"
              aria-label={text("Fermer le message", "إغلاق الرسالة")}
              onClick={() => setFeedback("")}
            >
              <X size={16} />
            </button>
          </div>
        )}

        {loadError ? (
          <div className="grid min-h-96 place-items-center p-8 text-center">
            <div className="max-w-md">
              <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
                <AlertCircle size={25} />
              </span>
              <h2 className="mt-4 text-lg font-bold text-slate-900">{text("Planning indisponible", "الجدول غير متاح")}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{loadError}</p>
              <button
                type="button"
                className={`${secondaryButtonClass} mt-5`}
                onClick={() => void load()}
              >
                <RefreshCw size={16} />
                {text("Réessayer", "إعادة المحاولة")}
              </button>
            </div>
          </div>
        ) : (
          <div className="relative overflow-x-auto bg-slate-50/70">
            {calendarLoading && (
              <div className="absolute inset-0 z-20 grid place-items-center bg-white/75 backdrop-blur-[2px]">
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm font-semibold text-slate-700 shadow-lg">
                  <LoaderCircle className="size-5 animate-spin text-teal-600" />
                  {text("Mise à jour du planning…", "جارٍ تحديث الجدول…")}
                </div>
              </div>
            )}

            {calendarView === "month"
              ? monthGrid()
              : calendarView === "agenda"
                ? agendaView()
                : timeGrid(displayedDays)}

            {false && (
            <div className="grid min-w-[1470px] grid-cols-7 gap-3">
              {weekDays.map((day) => {
                const key = format(day, "yyyy-MM-dd");
                const daily = appointments.filter(
                  (item) => format(new Date(item.startsAt), "yyyy-MM-dd") === key
                );
                const activeDaily = daily.filter((item) => item.status !== "ANNULE");
                const periods = (doctorSchedule[dayKeys[day.getDay()]] || "")
                  .split(",")
                  .filter(Boolean);
                const isToday = key === todayKey;

                return (
                  <article
                    className={`flex min-h-[520px] min-w-0 flex-col overflow-hidden rounded-2xl border bg-white shadow-sm ${
                      isToday
                        ? "border-teal-400 ring-2 ring-teal-100"
                        : "border-slate-200"
                    }`}
                    key={day.toISOString()}
                  >
                    <header
                      className={`border-b px-4 py-4 ${
                        isToday
                          ? "border-teal-600 bg-teal-600 text-white"
                          : "border-slate-200 bg-white text-slate-900"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-baseline gap-2">
                          <span
                            className={`text-[10px] font-extrabold uppercase tracking-[0.12em] ${
                              isToday ? "text-teal-100" : "text-slate-400"
                            }`}
                          >
                            {format(day, "EEE", { locale: dateLocale })}
                          </span>
                          <strong className="text-2xl font-extrabold">{format(day, "d")}</strong>
                        </div>
                        <span
                          className={`rounded-full px-2 py-1 text-[9px] font-bold ${
                            isToday
                              ? "bg-white/15 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {activeDaily.length} {text("RDV", "موعد")}
                        </span>
                      </div>

                      <div className="mt-3 flex min-h-5 flex-wrap gap-1">
                        {periods.length > 0 ? (
                          periods.map((period) => (
                            <span
                              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-1 text-[8px] font-semibold ${
                                isToday
                                  ? "bg-white/15 text-teal-50"
                                  : "bg-teal-50 text-teal-700"
                              }`}
                              key={period}
                            >
                              <Clock3 size={10} />
                              {period}
                            </span>
                          ))
                        ) : (
                          <span
                            className={`text-[9px] ${
                              isToday ? "text-teal-100" : "text-slate-400"
                            }`}
                          >
                            {text("Docteur absent", "الطبيب غائب")}
                          </span>
                        )}
                      </div>
                    </header>

                    <div className="flex flex-1 flex-col gap-2.5 p-3">
                      {daily.length === 0 ? (
                        <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-3 py-8 text-center">
                          <span className="grid size-10 place-items-center rounded-xl bg-white text-slate-400 shadow-sm">
                            <CalendarDays size={19} />
                          </span>
                          <strong className="mt-3 text-xs text-slate-600">
                            {text("Aucun rendez-vous", "لا توجد مواعيد")}
                          </strong>
                          <p className="mt-1 text-[9px] leading-4 text-slate-400">
                            {text("La journée est disponible selon les horaires affichés.", "اليوم متاح حسب الأوقات المعروضة.")}
                          </p>
                        </div>
                      ) : (
                        daily.map((item) => {
                          const status = getStatusStyle(item.status, isArabic);
                          const isClosed = closedStatuses.has(item.status);
                          const pending = actionPendingId === item.id;

                          return (
                            <div
                              className={`rounded-xl border border-l-4 border-slate-200 bg-white p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                                status.card
                              } ${item.status === "ANNULE" ? "opacity-60" : ""}`}
                              key={item.id}
                            >
                              <button
                                type="button"
                                className="block w-full text-left disabled:cursor-default"
                                disabled={isClosed}
                                onClick={() => edit(item)}
                              >
                                <div className="flex items-start justify-between gap-2">
                                  <div>
                                    <time className="text-sm font-extrabold text-slate-900">
                                      {format(new Date(item.startsAt), "HH:mm")}
                                      <span className="mx-1 text-slate-300">—</span>
                                      {format(new Date(item.endsAt), "HH:mm")}
                                    </time>
                                    <span className="mt-0.5 block text-[9px] text-slate-400">
                                      {Math.round(
                                        (new Date(item.endsAt).getTime() -
                                          new Date(item.startsAt).getTime()) /
                                          60000
                                      )}{" "}
                                      min
                                    </span>
                                  </div>
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[8px] font-bold ${status.badge}`}
                                  >
                                    <i className={`size-1.5 rounded-full ${status.dot}`} />
                                    {status.label}
                                  </span>
                                </div>

                                <strong className="mt-3 block truncate text-xs font-bold text-slate-800">
                                  {item.patientName}
                                </strong>
                                <span className="mt-1 block truncate text-[10px] text-slate-500">
                                  {item.treatmentType || item.reason || text("Rendez-vous", "موعد")}
                                </span>
                                {item.phone && (
                                  <span className="mt-2 flex items-center gap-1.5 text-[9px] text-slate-400">
                                    <Phone size={11} />
                                    {item.phone}
                                  </span>
                                )}
                              </button>

                              {!isClosed && (
                                <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                                  <button
                                    type="button"
                                    className="inline-flex size-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-blue-50 hover:text-blue-700 disabled:opacity-40"
                                    title={text("Modifier le rendez-vous", "تعديل الموعد")}
                                    aria-label={text(`Modifier le rendez-vous de ${item.patientName}`, `تعديل موعد ${item.patientName}`)}
                                    disabled={pending}
                                    onClick={() => edit(item)}
                                  >
                                    <Pencil size={14} />
                                  </button>
                                  {item.status !== "PATIENT_ARRIVE" &&
                                    item.status !== "EN_CONSULTATION" && (
                                      <button
                                        type="button"
                                        className="inline-flex size-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-emerald-50 hover:text-emerald-700 disabled:opacity-40"
                                        title={text("Marquer le patient comme arrivé", "تسجيل وصول المريض")}
                                        aria-label={text(`Marquer ${item.patientName} comme arrivé`, `تسجيل وصول ${item.patientName}`)}
                                        disabled={pending}
                                        onClick={() => void arrive(item.id)}
                                      >
                                        {pending ? (
                                          <LoaderCircle className="animate-spin" size={14} />
                                        ) : (
                                          <UserCheck size={14} />
                                        )}
                                      </button>
                                    )}
                                  <button
                                    type="button"
                                    className="ml-auto inline-flex size-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 disabled:opacity-40"
                                    title={text("Annuler le rendez-vous", "إلغاء الموعد")}
                                    aria-label={text(`Annuler le rendez-vous de ${item.patientName}`, `إلغاء موعد ${item.patientName}`)}
                                    disabled={pending}
                                    onClick={() => requestCancellation(item)}
                                  >
                                    <XCircle size={14} />
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}

                      {periods.length > 0 && (
                        <button
                          type="button"
                          className="mt-auto inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-dashed border-teal-200 bg-teal-50/50 text-[10px] font-bold text-teal-700 transition hover:border-teal-400 hover:bg-teal-50"
                          onClick={() => openNewAppointment(key)}
                        >
                          <Plus size={14} />
                          {text("Planifier ce jour", "حجز موعد في هذا اليوم")}
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
            )}
          </div>
        )}

        <footer className="flex items-center justify-center border-t border-slate-200 bg-white px-4 py-2.5">
          <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] font-semibold">
            {[
              ["bg-emerald-50 text-emerald-700 ring-emerald-200", "bg-emerald-500", text("Confirmé", "مؤكد")],
              ["bg-orange-50 text-orange-700 ring-orange-200", "bg-orange-500", text("Modifié", "معدل")],
              ["bg-rose-50 text-rose-700 ring-rose-200", "bg-rose-500", text("Annulé", "ملغى")]
            ].map(([classes, color, label]) => (
              <span className={`flex items-center gap-2 rounded-full px-3 py-1.5 ring-1 ${classes}`} key={label}>
                <i className={`size-2 rounded-full ${color}`} />
                {label}
              </span>
            ))}
          </div>
        </footer>
      </section>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="appointment-dialog-title"
        >
          <form
            className="max-h-[94vh] w-full max-w-3xl overflow-auto rounded-3xl bg-slate-50 shadow-2xl"
            onSubmit={save}
          >
            <div className="flex items-start justify-between border-b border-slate-200 bg-white px-7 py-6">
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-[0.18em] text-teal-700">
                  {text("Planning", "جدولة")}
                </span>
                <h2
                  className="mt-1 text-2xl font-extrabold text-slate-950"
                  id="appointment-dialog-title"
                >
                  {editing ? text("Modifier le rendez-vous", "تعديل الموعد") : text("Nouveau rendez-vous", "موعد جديد")}
                </h2>
                <p className="mt-1.5 text-xs text-slate-500">
                  {text("Les champs marqués", "الحقول المميزة بـ")} <b className="text-rose-500">*</b> {text("sont obligatoires.", "إلزامية.")}
                </p>
              </div>
              <button
                type="button"
                className={iconButtonClass}
                aria-label={text("Fermer", "إغلاق")}
                disabled={saving}
                onClick={closeModal}
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid gap-4 p-7">
              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-teal-50 text-teal-700">
                    <UserRound size={19} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{text("Dossier patient", "ملف المريض")}</h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {text("Sélectionnez la personne concernée par ce rendez-vous.", "اختر المريض المعني بهذا الموعد.")}
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className={fieldLabelClass}>
                    {text("Rechercher et sélectionner un patient", "البحث عن مريض واختياره")} <b className="text-rose-500">*</b>
                  </span>
                  <PatientSearchSelect
                    patients={patients}
                    value={form.patientId}
                    onChange={(patientId) => setForm((current) => ({ ...current, patientId }))}
                    ariaLabel={text("Rechercher et sélectionner un patient", "البحث عن مريض واختياره")}
                    placeholder={text("Nom, CIN, téléphone ou n° de dossier", "الاسم، رقم البطاقة، الهاتف أو رقم الملف")}
                    emptyMessage={text("Aucun patient trouvé", "لم يتم العثور على أي مريض")}
                    disabled={Boolean(editing)}
                  />
                </label>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-blue-700">
                    <Clock3 size={19} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{text("Date et créneau", "التاريخ والوقت")}</h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {text("Seules les heures libres sont proposées.", "تُعرض فقط الأوقات المتاحة.")}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 max-[650px]:grid-cols-1">
                  <label className="block">
                    <span className={fieldLabelClass}>
                      {text("Date", "التاريخ")} <b className="text-rose-500">*</b>
                    </span>
                    <div className="relative">
                      <CalendarDays className={fieldIconClass} />
                      <input
                        className={fieldClass}
                        type="date"
                        required
                        min={todayKey}
                        value={form.date}
                        onChange={(event) => setForm({ ...form, date: event.target.value })}
                      />
                    </div>
                  </label>

                  

                  <label className="block">
                    <span className={fieldLabelClass}>
                      {text("Heure disponible", "الوقت المتاح")} <b className="text-rose-500">*</b>
                    </span>
                    <div className="relative">
                      {availabilityLoading ? (
                        <LoaderCircle className={`${fieldIconClass} animate-spin`} />
                      ) : (
                        <Clock3 className={fieldIconClass} />
                      )}
                      <select
                        className={fieldClass}
                        required
                        disabled={
                          availabilityLoading ||
                          Boolean(availabilityError) ||
                          availableTimes.length === 0
                        }
                        value={form.start}
                        onChange={(event) => setForm({ ...form, start: event.target.value })}
                      >
                        {availabilityLoading ? (
                          <option value="">{text("Recherche des créneaux libres…", "جارٍ البحث عن الأوقات المتاحة…")}</option>
                        ) : availabilityError ? (
                          <option value="">{text("Disponibilités indisponibles", "الأوقات المتاحة غير متوفرة")}</option>
                        ) : availableTimes.length === 0 ? (
                          <option value="">{text("Aucun créneau libre pour cette date", "لا يوجد وقت متاح لهذا التاريخ")}</option>
                        ) : (
                          availableTimes.map((time) => (
                            <option value={time} key={time}>
                              {time}
                            </option>
                          ))
                        )}
                      </select>
                    </div>

                  </label>
                </div>

                {availabilityError && (
                  <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-medium text-rose-700">
                    <AlertCircle className="mt-0.5 size-4 shrink-0" />
                    {availabilityError}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-5 flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-xl bg-violet-50 text-violet-700">
                    <Stethoscope size={19} />
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-slate-800">{text("Soin prévu", "العلاج المقرر")}</h3>
                    <p className="mt-0.5 text-[10px] text-slate-500">
                      {text("Indiquez le type de traitement prévu pour le patient.", "أدخل نوع العلاج المقرر للمريض.")}
                    </p>
                  </div>
                </div>

                <label className="block">
                  <span className={fieldLabelClass}>
                    {text("Type de traitement", "نوع العلاج")} <b className="text-rose-500">*</b>
                  </span>
                  <div className="relative">
                    <Stethoscope className={fieldIconClass} />
                    <select
                      className={`${fieldClass} appearance-none`}
                      required
                      value={form.treatmentType}
                      onChange={(event) =>
                        setForm({ ...form, treatmentType: event.target.value })
                      }
                    >
                      <option value="" disabled>
                        {text("Sélectionner un type de traitement", "اختر نوع العلاج")}
                      </option>
                      {form.treatmentType &&
                        !treatmentTypeOptions.some((option) => option.value === form.treatmentType) && (
                          <option value={form.treatmentType}>{form.treatmentType}</option>
                        )}
                      {treatmentTypeOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {text(option.fr, option.ar)}
                        </option>
                      ))}
                    </select>
                  </div>
                </label>
              </section>

            </div>

            <div className="flex items-center justify-between gap-4 border-t border-slate-200 bg-white px-7 py-5 max-[800px]:flex-col max-[800px]:items-stretch">
              <p className="flex items-center gap-2 text-[10px] text-slate-500">
                <ShieldCheck className="size-4 text-teal-700" />
                {text("Les conflits d’horaires sont contrôlés automatiquement.", "يتم التحقق تلقائياً من تعارض المواعيد.")}
              </p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className={secondaryButtonClass}
                  disabled={saving}
                  onClick={closeModal}
                >
                  {text("Annuler", "إلغاء")}
                </button>
                <button
                  type="submit"
                  className={primaryButtonClass}
                  disabled={
                    saving ||
                    availabilityLoading ||
                    Boolean(availabilityError) ||
                    availableTimes.length === 0
                  }
                >
                  {saving ? (
                    <>
                      <LoaderCircle className="animate-spin" size={17} />
                      {text("Enregistrement…", "جارٍ الحفظ…")}
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={17} />
                      {editing ? text("Enregistrer les modifications", "حفظ التعديلات") : text("Planifier le rendez-vous", "جدولة الموعد")}
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {cancelling && (
        <div
          className="fixed inset-0 z-[60] grid place-items-center bg-slate-950/60 p-5 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-dialog-title"
        >
          <form
            className="w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl"
            onSubmit={confirmCancellation}
          >
            <div className="flex items-start gap-4 border-b border-slate-100 px-6 py-5">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-rose-50 text-rose-600">
                <XCircle size={21} />
              </span>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-extrabold uppercase tracking-[0.16em] text-rose-600">
                  {text("Confirmation", "تأكيد")}
                </span>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950" id="cancel-dialog-title">
                  {text("Annuler le rendez-vous", "إلغاء الموعد")}
                </h2>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {cancelling.patientName} ·{" "}
                  {format(new Date(cancelling.startsAt), text("EEEE d MMMM à HH:mm", "EEEE d MMMM، HH:mm"), { locale: dateLocale })}
                </p>
              </div>
              <button
                type="button"
                className={iconButtonClass}
                aria-label={text("Fermer", "إغلاق")}
                disabled={actionPendingId === cancelling.id}
                onClick={() => setCancelling(null)}
              >
                <X size={17} />
              </button>
            </div>

            <div className="px-6 py-5">
              <label className="block">
                <span className={fieldLabelClass}>
                  {text("Motif d’annulation", "سبب الإلغاء")} <b className="text-rose-500">*</b>
                </span>
                <textarea
                  className="min-h-28 w-full resize-y rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                  required
                  maxLength={500}
                  autoFocus
                  placeholder={text("Saisir le motif d’annulation", "أدخل سبب الإلغاء")}
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                />
              </label>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-100 bg-slate-50 px-6 py-4">
              <button
                type="button"
                className={secondaryButtonClass}
                disabled={actionPendingId === cancelling.id}
                onClick={() => setCancelling(null)}
              >
                {text("Conserver le rendez-vous", "الاحتفاظ بالموعد")}
              </button>
              <button
                type="submit"
                className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 text-sm font-bold text-white shadow-lg shadow-rose-700/15 transition hover:bg-rose-700 disabled:pointer-events-none disabled:opacity-50"
                disabled={
                  actionPendingId === cancelling.id || !cancellationReason.trim()
                }
              >
                {actionPendingId === cancelling.id ? (
                  <LoaderCircle className="animate-spin" size={17} />
                ) : (
                  <XCircle size={17} />
                )}
                {text("Confirmer l’annulation", "تأكيد الإلغاء")}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}

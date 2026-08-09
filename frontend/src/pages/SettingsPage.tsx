import {
  BriefcaseBusiness, Building2, CalendarClock, CheckCircle2, Clock3,
  Download, FileSpreadsheet, HardDrive, DatabaseBackup, AlertTriangle, LockKeyhole,
  Languages, Mail, MapPin, Phone, RefreshCw, Save, ShieldCheck, Usb, UserRound,
  FolderOpen, Info, Plus
} from "lucide-react";
import { useEffect, useState } from "react";
import cabinetLogo from "../assets/dental-sabri-logo.png";
import { useLanguage } from "../i18n/LanguageContext";
import { api, getServerUrl, isServerOnThisComputer } from "../services/api";
import { ui } from "../styles";
import { useAuthStore } from "../store/authStore";

export interface Setting {
  key: string;
  value: string;
  valueType: string;
}

type Tab = "cabinet" | "schedule" | "export" | "backup";

interface BackupRecord {
  id: string;
  filePath: string;
  fileSize: number | null;
  backupType: "MANUELLE" | "AUTOMATIQUE";
  status: "REUSSIE" | "REUSSIE_LOCALE" | "ECHEC" | "EN_COURS";
  startedAt: string;
  errorMessage?: string | null;
}

interface GsmPort {
  systemPortName: string;
  descriptivePortName: string;
}

export const scheduleDefaults: Setting[] = [
  { key: "appointment.schedule.monday", value: "09:00-13:00,15:00-18:00", valueType: "STRING" },
  { key: "appointment.schedule.tuesday", value: "09:00-13:00,15:00-18:00", valueType: "STRING" },
  { key: "appointment.schedule.wednesday", value: "09:00-13:00,15:00-18:00", valueType: "STRING" },
  { key: "appointment.schedule.thursday", value: "09:00-13:00,15:00-18:00", valueType: "STRING" },
  { key: "appointment.schedule.friday", value: "09:00-13:00,15:00-18:00", valueType: "STRING" },
  { key: "appointment.schedule.saturday", value: "09:00-13:00", valueType: "STRING" },
  { key: "appointment.schedule.sunday", value: "", valueType: "STRING" }
];

const defaults: Setting[] = [
  { key: "cabinet.name", value: "DENTAL SABRI", valueType: "STRING" },
  { key: "cabinet.doctor", value: "Khalid", valueType: "STRING" },
  { key: "cabinet.address", value: "Aït Berra, Tinghir", valueType: "STRING" },
  { key: "cabinet.phone", value: "06 90 33 70 82", valueType: "STRING" },
  { key: "cabinet.email", value: "khalidsabri804@gm.com", valueType: "STRING" },
  { key: "cabinet.specialty", value: "Prothésiste dentaire", valueType: "STRING" },
  { key: "cabinet.taxIdentifier", value: "", valueType: "STRING" },
  { key: "cabinet.logo.path", value: "classpath:/branding/dental-sabri-logo.png", valueType: "STRING" },
  ...scheduleDefaults
];

const dayLabels: Record<string, string> = {
  monday: "Lundi", tuesday: "Mardi", wednesday: "Mercredi", thursday: "Jeudi",
  friday: "Vendredi", saturday: "Samedi", sunday: "Dimanche"
};

export function SettingsPage() {
  const { language, setLanguage, text } = useLanguage();
  const role = useAuthStore((state) => state.user?.role);
  const canEdit = role === "DOCTEUR";
  const [settings, setSettings] = useState<Setting[]>(defaults);
  const [tab, setTab] = useState<Tab>("cabinet");
  const [saved, setSaved] = useState("");
  const [feedback, setFeedback] = useState("");
  const [busy, setBusy] = useState<"" | "excel" | "backup" | "directory" | "restore">("");
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [backupDirectory, setBackupDirectory] = useState<string | null>(null);
  const [localBackupDirectory, setLocalBackupDirectory] = useState<string | null>(null);
  const [backupHostComputer, setBackupHostComputer] = useState(false);

  async function load() {
    const stored = await api.get<Setting[]>("/settings");
    setSettings(defaults.map((fallback) => stored.find((item) => item.key === fallback.key) || fallback)
      .concat(stored.filter((item) => !defaults.some((fallback) => fallback.key === item.key))));
  }

  useEffect(() => {
    void load().catch(() => setFeedback(text(
      "Certains paramètres locaux ne sont pas disponibles.",
      "بعض الإعدادات المحلية غير متاحة."
    )));
  }, []);

  async function save(setting: Setting) {
    try {
      await api.put("/settings", setting);
      setSaved(setting.key);
      setFeedback(text("Paramètre enregistré.", "تم حفظ الإعداد."));
      window.setTimeout(() => setSaved(""), 1800);
    } catch (reason) {
      setFeedback((reason as { message?: string }).message || text("Enregistrement impossible.", "تعذّر الحفظ."));
    }
  }

  async function saveSchedule(items: Setting[]) {
    try {
      await Promise.all(items.map((item) => api.put("/settings", item)));
      setSaved("schedule.all");
      setFeedback(text("Les horaires du docteur ont été enregistrés.", "تم حفظ أوقات عمل الطبيب."));
      window.setTimeout(() => setSaved(""), 1800);
    } catch (reason) {
      setFeedback((reason as { message?: string }).message || text("Enregistrement des horaires impossible.", "تعذّر حفظ أوقات العمل."));
    }
  }

  async function exportExcel() {
    try {
      setBusy("excel");
      const date = new Date().toISOString().slice(0, 10);
      await api.download("/exports/cabinet.xlsx", `DENTAL-SABRI-export-${date}.xlsx`);
      setFeedback(text("Le fichier Excel complet a été téléchargé.", "تم تنزيل ملف Excel الكامل."));
    } catch {
      setFeedback(text("Le téléchargement Excel n’a pas pu être effectué.", "تعذّر تنزيل ملف Excel."));
    } finally {
      setBusy("");
    }
  }

  async function loadBackups() {
    const [history, directory, localDirectory, serverIsLocal] = await Promise.all([
      api.get<BackupRecord[]>("/backups"),
      window.desktop?.getBackupDirectory() ?? Promise.resolve(null),
      window.desktop?.getLocalBackupDirectory() ?? Promise.resolve(null),
      isServerOnThisComputer()
    ]);
    const latestSuccessful = history.find((backup) => backup.status.startsWith("REUSSIE"));
    const backupFileIsHere = latestSuccessful && window.desktop
      ? await window.desktop.isBackupFileLocal(latestSuccessful.filePath) : false;
    setBackups(history);
    setBackupHostComputer(serverIsLocal || backupFileIsHere);
    setBackupDirectory(directory);
    setLocalBackupDirectory(localDirectory);
  }

  async function createBackup() {
    try {
      setBusy("backup");
      await api.post<BackupRecord>("/backups");
      await loadBackups();
      setFeedback(text("Sauvegarde terminée.", "تم إنشاء النسخة الاحتياطية بنجاح."));
    } catch (reason) {
      setFeedback((reason as { message?: string }).message || text("Sauvegarde impossible.", "تعذر إنشاء النسخة الاحتياطية."));
    } finally {
      setBusy("");
    }
  }

  async function chooseBackupInBrowser() {
    return new Promise<File | null>((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = ".backup";
      input.onchange = () => resolve(input.files?.[0] ?? null);
      input.click();
    });
  }

  async function restoreBackup(backup?: BackupRecord) {
    let selectedPath: string | null = null;
    let selectedUpload: File | null = null;
    if (!backup) {
      if (window.desktop) selectedPath = await window.desktop.selectBackupFile();
      else selectedUpload = await chooseBackupInBrowser();
      if (!selectedPath && !selectedUpload) return;
    }
    const confirmed = window.confirm(text(
      "Attention : les données actuelles seront remplacées par celles de cette sauvegarde. Une copie de sécurité sera créée avant la restauration. Continuer ?",
      "تنبيه: سيتم استبدال البيانات الحالية ببيانات هذه النسخة. سيتم إنشاء نسخة أمان قبل الاسترجاع. هل تريد المتابعة؟"
    ));
    if (!confirmed) return;
    try {
      setBusy("restore");
      setFeedback(text("Création d’une copie de sécurité avant restauration…", "جارٍ إنشاء نسخة أمان قبل الاسترجاع…"));
      if (backup && (!window.desktop || !backupHostComputer)) {
        const result = await api.post<{ message: string }>(`/backups/${backup.id}/restore`);
        setFeedback(result.message);
        window.setTimeout(() => window.location.reload(), 1200);
      } else if (selectedUpload) {
        const form = new FormData();
        form.append("file", selectedUpload);
        const result = await api.upload<{ message: string }>("/backups/restore", form);
        setFeedback(result.message);
        window.setTimeout(() => window.location.reload(), 1200);
      } else {
        const localPath = backup?.filePath || selectedPath;
        if (!localPath || !window.desktop) throw new Error(text("Fichier de sauvegarde introuvable.", "ملف النسخة الاحتياطية غير موجود."));
        await api.post<BackupRecord>("/backups");
        const result = await window.desktop.restoreBackupFile(localPath);
        setFeedback(result.message);
      }
    } catch (reason) {
      setFeedback((reason as { message?: string }).message || text("Restauration impossible.", "تعذر استرجاع النسخة."));
    } finally {
      setBusy("");
    }
  }

  async function chooseBackupDirectory() {
    try {
      setBusy("directory");
      const directory = await window.desktop?.selectBackupDirectory();
      if (directory) {
        setBackupDirectory(directory);
        setFeedback(text("Emplacement externe enregistré. Lancez une sauvegarde de test.", "تم حفظ مكان النسخ الخارجي. أنشئ نسخة تجريبية الآن."));
      }
    } finally {
      setBusy("");
    }
  }

  async function openBackupDirectory(target: "local" | "external") {
    if (!window.desktop) return;
    const opened = await window.desktop.openBackupDirectory(target);
    if (!opened) setFeedback(text("Impossible d’ouvrir le dossier de sauvegarde.", "تعذر فتح مجلد النسخ الاحتياطية."));
  }

  async function copyBackup(backup: BackupRecord) {
    if (!window.desktop) return;
    const stamp = new Date(backup.startedAt).toISOString().replace(/[-:T]/g, "").slice(0, 14);
    const result = await window.desktop.copyBackupFile(getServerUrl(), backup.id, `cabinet-${stamp}.backup`);
    if (!result.canceled) setFeedback(result.success
      ? text(`Copie enregistrée : ${result.path}`, `تم حفظ النسخة: ${result.path}`)
      : result.message);
  }

  useEffect(() => {
    if (tab === "backup") void loadBackups().catch(() => setFeedback(text(
      "Historique des sauvegardes indisponible.", "سجل النسخ الاحتياطية غير متاح."
    )));
  }, [tab]);

  const appointmentSettings = settings.filter((setting) => setting.key.startsWith("appointment.schedule."));

  return <>
    {feedback && <div className={ui("alert alert-success")}>{feedback}</div>}
    {tab === "cabinet" && <div className={ui("alert alert-info")}><LockKeyhole size={16}/> {text("Informations officielles en lecture seule.", "المعلومات الرسمية متاحة للقراءة فقط.")}</div>}
    <section className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-teal-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-xl bg-teal-50 text-teal-700">
          <Languages size={21}/>
        </span>
        <div>
          <h2 className="text-sm font-extrabold text-slate-900">
            {text("Langue de l’interface", "لغة الواجهة")}
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            {text(
              "Ce choix est conservé uniquement sur cet ordinateur.",
              "يُحفظ هذا الاختيار على هذا الحاسوب فقط."
            )}
          </p>
        </div>
      </div>
      <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1" role="group" aria-label={text("Langue de l’interface", "لغة الواجهة")}>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${language === "fr" ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
          aria-pressed={language === "fr"}
          onClick={() => setLanguage("fr")}
        >
          Français
        </button>
        <button
          type="button"
          className={`rounded-lg px-4 py-2 text-xs font-bold transition ${language === "ar" ? "bg-teal-700 text-white shadow-sm" : "text-slate-600 hover:bg-white"}`}
          aria-pressed={language === "ar"}
          onClick={() => setLanguage("ar")}
        >
          العربية
        </button>
      </div>
    </section>
    <div className={ui("settings-layout")}>
      <aside className={ui("settings-tabs")}>
        <button className={ui(tab === "cabinet" ? "active" : "")} onClick={() => setTab("cabinet")}><ShieldCheck/> {text("Cabinet et PDF", "العيادة وملفات PDF")}</button>
        <button className={ui(tab === "schedule" ? "active" : "")} onClick={() => setTab("schedule")}><CalendarClock/> {text("Horaires du docteur", "أوقات عمل الطبيب")}</button>
        <button className={ui(tab === "export" ? "active" : "")} onClick={() => setTab("export")}><FileSpreadsheet/> {text("Export Excel", "تصدير Excel")}</button>
        <button className={ui(tab === "backup" ? "active" : "")} onClick={() => setTab("backup")}><DatabaseBackup/> {text("Sauvegardes", "النسخ الاحتياطية")}</button>
      </aside>

      <section className={`${ui("panel settings-panel")} min-h-[calc(100vh-390px)]`}>
        {tab === "backup" ? <BackupSettingsRedesigned busy={busy} backups={backups} directory={backupDirectory} localDirectory={localBackupDirectory}
            localServer={backupHostComputer} createBackup={createBackup} chooseDirectory={chooseBackupDirectory} openDirectory={openBackupDirectory} restoreBackup={restoreBackup} copyBackup={copyBackup}/>
          : tab === "export" ? <ExportSettings busy={busy} exportExcel={exportExcel}/>
          : tab === "schedule" ? <>
            <div className={ui("panel-title")}>
              <div><span className={ui("eyebrow")}>{text("Disponibilité médicale", "التوفر الطبي")}</span><h2>{text("Présence hebdomadaire du docteur", "الحضور الأسبوعي للطبيب")}</h2>
                <p className={ui("settings-hint")}>{text("Ces plages déterminent les heures proposées lors de la planification d’un rendez-vous.", "تحدد هذه الفترات الساعات المقترحة عند جدولة موعد.")}</p></div>
              <button className={ui("button primary")} disabled={!canEdit} onClick={() => void saveSchedule(appointmentSettings)}>
                <Save size={17}/>{saved === "schedule.all" ? text("Enregistré", "تم الحفظ") : text("Enregistrer tous les horaires", "حفظ جميع الأوقات")}
              </button>
            </div>
            <ScheduleSettings settings={settings} setSettings={setSettings} save={save} saved={saved} canEdit={canEdit}/>
          </> : <>
            <div className={ui("panel-title")}><div><span className={ui("eyebrow")}>{text("Identité du cabinet", "هوية العيادة")}</span><h2>{text("Informations du cabinet et factures PDF", "معلومات العيادة وفواتير PDF")}</h2></div></div>
            <CabinetInformation/>
          </>}
      </section>
    </div>
  </>;
}

function updateSetting(settings: Setting[], setting: Setting, value: string) {
  return settings.map((item) => item.key === setting.key ? { ...item, value } : item);
}

function GsmSettings({ settings, setSettings, ports, loading, canEdit, saved, refresh, saveAll }: {
  settings: Setting[];
  setSettings: (value: Setting[]) => void;
  ports: GsmPort[];
  loading: boolean;
  canEdit: boolean;
  saved: string;
  refresh: () => Promise<void>;
  saveAll: () => Promise<void>;
}) {
  const { text } = useLanguage();
  const enabled = settings.find((item) => item.key === "gsm.enabled")!;
  const port = settings.find((item) => item.key === "gsm.port")!;
  const update = (setting: Setting, value: string) => setSettings(updateSetting(settings, setting, value));

  return <div className="space-y-5">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <span className="text-[11px] font-black uppercase tracking-[.18em] text-teal-700">
          {text("Communication locale", "اتصال محلي")}
        </span>
        <h2 className="mt-1 text-xl font-black text-slate-900">
          {text("Envoi automatique par modem GSM", "الإرسال التلقائي عبر مودم GSM")}
        </h2>
        <p className="mt-1 max-w-2xl text-sm text-slate-500">
          {text(
            "Les confirmations, modifications et annulations de rendez-vous sont envoyées sans Internet avec un modem USB et une carte SIM.",
            "يتم إرسال تأكيدات المواعيد وتعديلاتها وإلغائها بدون إنترنت باستعمال مودم USB وشريحة SIM."
          )}
        </p>
      </div>
      <button type="button" className={ui("button ghost")} disabled={loading} onClick={() => void refresh()}>
        <RefreshCw size={17} className={loading ? "animate-spin" : ""}/>
        {text("Actualiser les ports", "تحديث المنافذ")}
      </button>
    </div>

    <div className={`rounded-2xl border p-5 ${ports.length ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid size-11 place-items-center rounded-xl ${ports.length ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
          <Usb size={21}/>
        </span>
        <div>
          <strong className="block text-sm text-slate-900">
            {ports.length
              ? text(`${ports.length} port(s) détecté(s)`, `تم اكتشاف ${ports.length} منفذ`)
              : text("Aucun modem détecté", "لم يتم اكتشاف أي مودم")}
          </strong>
          <small className="mt-1 block text-slate-500">
            {text("Branchez le modem GSM USB avec une carte SIM active.", "اربط مودم GSM عبر USB مع شريحة SIM مفعلة.")}
          </small>
        </div>
      </div>
    </div>

    <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-2">
      <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 p-4">
        <span>
          <strong className="block text-sm text-slate-900">{text("SMS automatiques", "رسائل SMS تلقائية")}</strong>
          <small className="mt-1 block text-slate-500">{text("Création, modification et annulation.", "الإنشاء والتعديل والإلغاء.")}</small>
        </span>
        <input
          type="checkbox"
          className="size-5 accent-teal-600"
          disabled={!canEdit}
          checked={enabled.value === "true"}
          onChange={(event) => update(enabled, String(event.target.checked))}
        />
      </label>

      <label className="block rounded-xl border border-slate-200 p-4">
        <span className="mb-2 block text-sm font-bold text-slate-900">{text("Port du modem", "منفذ المودم")}</span>
        <select
          className="h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
          disabled={!canEdit}
          value={port.value}
          onChange={(event) => update(port, event.target.value)}
        >
          <option value="">{text("Détection automatique", "اكتشاف تلقائي")}</option>
          {ports.map((item) => <option key={item.systemPortName} value={item.systemPortName}>
            {item.systemPortName} — {item.descriptivePortName}
          </option>)}
        </select>
      </label>
    </div>

    <div className="flex justify-end">
      <button type="button" className={ui("button primary")} disabled={!canEdit} onClick={() => void saveAll()}>
        <Save size={17}/>
        {saved === "gsm.all" ? text("Enregistré", "تم الحفظ") : text("Enregistrer le modem", "حفظ إعدادات المودم")}
      </button>
    </div>
  </div>;
}

function ScheduleSettings({ settings, setSettings, save, saved, canEdit }: {
  settings: Setting[];
  setSettings: (value: Setting[]) => void;
  save: (value: Setting) => Promise<void>;
  saved: string;
  canEdit: boolean;
}) {
  const { text } = useLanguage();
  const schedules = settings.filter((item) => item.key.startsWith("appointment.schedule."));
  const presentDays = schedules.filter((item) => item.value.trim()).length;
  const periods = schedules.reduce((total, item) => total + item.value.split(",").filter((part) => part.trim()).length, 0);

  return <div className={ui("schedule-settings")}>
    <div className={ui("schedule-summary")}>
      <article><CalendarClock/><div><small>{text("Jours de présence", "أيام الحضور")}</small><strong>{presentDays} / 7</strong></div></article>
      <article><Clock3/><div><small>{text("Plages de travail", "فترات العمل")}</small><strong>{periods}</strong></div></article>
    </div>
    <div className={ui("schedule-legend")}><span><i className="bg-emerald-500"/>{text("Présent", "حاضر")}</span><span><i className="bg-slate-300"/>{text("Absent", "غائب")}</span><em>{text("Format accepté", "الصيغة المقبولة")} : 09:00-13:00,15:00-18:00</em></div>
    <div className={ui("weekly-schedule")}>{schedules.map((setting) => {
      const day = setting.key.split(".").pop()!;
      const dayPeriods = setting.value.split(",").map((part) => part.trim()).filter(Boolean);
      return <label key={setting.key} className={ui(setting.value ? "present" : "absent")}>
        <span><strong>{text(dayLabels[day], ({ monday: "الاثنين", tuesday: "الثلاثاء", wednesday: "الأربعاء", thursday: "الخميس", friday: "الجمعة", saturday: "السبت", sunday: "الأحد" } as Record<string, string>)[day])}</strong><small>{setting.value ? <><CheckCircle2/> {text("Présent", "حاضر")}</> : text("Absent", "غائب")}</small></span>
        <div className={ui("period-chips")}>{dayPeriods.length
          ? dayPeriods.map((period) => <em key={period}><Clock3/>{period}</em>)
          : <em>{text("Journée non travaillée", "يوم غير مُشتغل")}</em>}</div>
        <div><input placeholder="Ex. 09:00-13:00,15:00-18:00" disabled={!canEdit} value={setting.value}
          onChange={(event) => setSettings(updateSetting(settings, setting, event.target.value))}/>
          <button className={ui("icon-button")} disabled={!canEdit} onClick={() => void save(setting)} title={text("Enregistrer", "حفظ")}><Save/></button></div>
        {saved === setting.key && <small>{text("Enregistré", "تم الحفظ")}</small>}
      </label>;
    })}</div>
  </div>;
}

function SoftwareUpdateSettings({ status, check }: { status: SoftwareUpdateStatus | null; check: () => Promise<void> }) {
  const { text } = useLanguage();
  const checking = status?.state === "checking" || status?.state === "downloading" || status?.state === "ready";
  const positive = status?.state === "up-to-date" || status?.state === "available" || status?.state === "ready";
  return <div className="space-y-5">
    <div className={ui("panel-title")}>
      <div>
        <span className={ui("eyebrow")}>{text("MISES À JOUR DU LOGICIEL", "تحديثات البرنامج")}</span>
        <h2>{text("Mise à jour automatique par Internet", "التحديث التلقائي عبر الإنترنت")}</h2>
        <p className={ui("settings-hint")}>{text(
          "Le logiciel vérifie les nouvelles versions par Internet ou depuis une clé USB. Il reste utilisable sans Internet.",
          "يتحقق البرنامج من الإصدارات الجديدة عبر الإنترنت أو من مفتاح USB، ويبقى قابلاً للاستعمال دون إنترنت."
        )}</p>
      </div>
      <button className={ui("button primary")} disabled={!window.desktop || checking} onClick={() => void check()}>
        <RefreshCw className={checking ? "animate-spin" : ""} size={17}/>
        {checking ? text("Vérification…", "جارٍ التحقق…") : text("Vérifier maintenant", "تحقق الآن")}
      </button>
    </div>
    <div className={`rounded-2xl border p-5 ${positive ? "border-emerald-200 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}>
      <div className="flex items-start gap-4">
        <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${positive ? "bg-emerald-100 text-emerald-700" : "bg-white text-slate-600"}`}>
          {positive ? <CheckCircle2 size={22}/> : <Download size={22}/>} 
        </span>
        <div>
          <strong className="block text-sm text-slate-900">{status?.message || text("Préparation de la vérification…", "جارٍ إعداد التحقق…")}</strong>
          {status?.currentVersion && <p className="mt-2 text-xs text-slate-600">{text("Version installée", "الإصدار المثبت")} : {status.currentVersion}</p>}
          {status?.state === "downloading" && typeof status.progress === "number" &&
            <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-white"><div className="h-full bg-teal-600" style={{ width: `${status.progress}%` }}/></div>}
        </div>
      </div>
    </div>
    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 text-sm text-blue-900">
      <p className="font-bold">{text("Protection des données", "حماية البيانات")}</p>
      <p className="mt-2">{text(
        "Avant toute installation, une sauvegarde complète est créée automatiquement. Une mise à jour ne supprime pas les patients, rendez-vous, factures ou laboratoires.",
        "قبل كل تثبيت تُنشأ نسخة احتياطية كاملة تلقائياً. لا يحذف التحديث المرضى أو المواعيد أو الفواتير أو المختبرات."
      )}</p>
    </div>
  </div>;
}

function BackupSettings({ busy, backups, directory, localDirectory, localServer, createBackup, chooseDirectory }: {
  busy: string;
  backups: BackupRecord[];
  directory: string | null;
  localDirectory: string | null;
  localServer: boolean;
  createBackup: () => Promise<void>;
  chooseDirectory: () => Promise<void>;
}) {
  const { text } = useLanguage();
  const latest = backups[0];
  const protectedExternally = latest?.status === "REUSSIE";
  return <div className="space-y-6">
    <div className={ui("panel-title")}>
      <div>
        <span className={ui("eyebrow")}>{text("Protection des données", "حماية البيانات")}</span>
        <h2>{text("Sauvegarde automatique quotidienne", "نسخة احتياطية تلقائية كل يوم")}</h2>
        <p className={ui("settings-hint")}>{text(
          "Le logiciel conserve les 30 dernières sauvegardes. Pour résister à une panne du PC, choisissez un disque USB externe ou un dossier synchronisé.",
          "يحتفظ البرنامج بآخر 30 نسخة. للحماية من تعطل الحاسوب اختر قرص USB خارجياً أو مجلداً متزامناً."
        )}</p>
      </div>
      <button className={ui("button primary")} disabled={busy !== ""} onClick={() => void createBackup()}>
        <DatabaseBackup size={17}/>{busy === "backup" ? text("Sauvegarde…", "جارٍ النسخ…") : text("Sauvegarder maintenant", "إنشاء نسخة الآن")}
      </button>
    </div>

    <section>
      <h3 className="mb-3 text-sm font-extrabold text-slate-900">
        {text("Où enregistrer les sauvegardes ?", "أين يتم حفظ النسخ الاحتياطية؟")}
      </h3>
      <div className="grid gap-4 lg:grid-cols-2">
        <article className="rounded-2xl border border-teal-200 bg-teal-50/60 p-5">
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-100 text-teal-700"><DatabaseBackup size={21}/></span>
            <div className="min-w-0">
              <strong className="block text-sm text-slate-900">{text("1. Emplacement interne du logiciel", "1. المجلد الداخلي للبرنامج")}</strong>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text(
                "Toujours actif. Le logiciel y crée automatiquement une copie quotidienne.",
                "مفعّل دائماً. ينشئ البرنامج فيه نسخة يومية تلقائياً."
              )}</p>
              <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-[11px] text-teal-800">
                {localDirectory || text("Emplacement sécurisé géré automatiquement", "مجلد آمن يديره البرنامج تلقائياً")}
              </code>
            </div>
          </div>
        </article>

        <article className={`rounded-2xl border p-5 ${directory ? "border-emerald-200 bg-emerald-50/60" : "border-slate-200 bg-slate-50"}`}>
          <div className="flex items-start gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${directory ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}><Usb size={21}/></span>
            <div className="min-w-0">
              <strong className="block text-sm text-slate-900">{text("2. Copie externe recommandée", "2. نسخة خارجية موصى بها")}</strong>
              <p className="mt-1 text-xs leading-5 text-slate-600">{text(
                "Choisissez un autre disque, une clé USB ou un dossier synchronisé pour résister à une panne du PC.",
                "اختر قرصاً آخر أو مفتاح USB أو مجلداً متزامناً للحماية من تعطل الحاسوب."
              )}</p>
              <code className="mt-3 block break-all rounded-lg bg-white px-3 py-2 text-[11px] text-slate-700">
                {directory || "Exemple : D:\\Sauvegardes Cabinet Dentaire"}
              </code>
            </div>
          </div>
        </article>
      </div>
      <p className="mt-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-xs leading-5 text-blue-800">
        {text("Exemple de fichier créé : cabinet-20260808-103000.backup. Ne modifiez pas ce fichier ; il sert à restaurer toutes les données PostgreSQL.",
          "مثال للملف: cabinet-20260808-103000.backup. لا تعدّل هذا الملف؛ فهو مخصص لاسترجاع جميع بيانات PostgreSQL.")}
      </p>
    </section>

    <div className={`rounded-2xl border p-5 ${directory ? "border-emerald-200 bg-emerald-50/60" : "border-amber-200 bg-amber-50/60"}`}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className={`grid size-11 shrink-0 place-items-center rounded-xl ${directory ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
            {directory ? <HardDrive size={21}/> : <AlertTriangle size={21}/>}
          </span>
          <div className="min-w-0">
            <strong className="block text-sm text-slate-900">{directory
              ? text("Copie externe configurée", "تم إعداد النسخة الخارجية")
              : text("Protection externe non configurée", "لم يتم إعداد الحماية الخارجية")}</strong>
            <small className="mt-1 block truncate text-slate-600">{directory || text(
              "Les sauvegardes restent sur le même PC et ne protègent pas contre une panne du disque.",
              "النسخ موجودة على نفس الحاسوب ولا تحمي من تعطل القرص."
            )}</small>
          </div>
        </div>
        <button className={ui("button ghost")} disabled={!localServer || busy !== "" || !window.desktop} onClick={() => void chooseDirectory()}>
          <HardDrive size={17}/>{busy === "directory" ? text("Ouverture…", "جارٍ الفتح…") : text("Choisir le dossier", "اختيار المجلد")}
        </button>
      </div>
      {!localServer && <p className="mt-3 text-xs font-semibold text-amber-800">{text(
        "Ce réglage doit être effectué une seule fois sur le PC Assistante.",
        "يجب ضبط هذا الإعداد مرة واحدة من حاسوب المساعدة."
      )}</p>}
    </div>

    <div>
      <h3 className="mb-3 text-sm font-extrabold text-slate-900">{text("Dernières sauvegardes", "آخر النسخ الاحتياطية")}</h3>
      {!latest ? <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{text("Aucune sauvegarde pour le moment.", "لا توجد نسخة احتياطية بعد.")}</p>
        : <div className="overflow-hidden rounded-xl border border-slate-200">
          {backups.slice(0, 5).map((backup) => <div key={backup.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 last:border-0">
            <div><strong className="block text-sm text-slate-800">{new Date(backup.startedAt).toLocaleString()}</strong>
              <small className="text-slate-500">{backup.backupType === "AUTOMATIQUE" ? text("Automatique", "تلقائية") : text("Manuelle", "يدوية")}</small></div>
            <span className={`rounded-full px-3 py-1 text-xs font-bold ${backup.status === "REUSSIE" ? "bg-emerald-100 text-emerald-700" : backup.status === "REUSSIE_LOCALE" ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-700"}`}>
              {backup.status === "REUSSIE" ? text("Locale + externe", "محلية + خارجية") : backup.status === "REUSSIE_LOCALE" ? text("Locale seulement", "محلية فقط") : text("Échec", "فشل")}
            </span>
          </div>)}
        </div>}
      {latest?.errorMessage && !protectedExternally && <p className="mt-3 text-xs font-semibold text-amber-800">{latest.errorMessage}</p>}
    </div>
  </div>;
}

function BackupSettingsRedesigned({ busy, backups, directory, localDirectory, localServer, createBackup, chooseDirectory, openDirectory, restoreBackup, copyBackup }: {
  busy: string;
  backups: BackupRecord[];
  directory: string | null;
  localDirectory: string | null;
  localServer: boolean;
  createBackup: () => Promise<void>;
  chooseDirectory: () => Promise<void>;
  openDirectory: (target: "local" | "external") => Promise<void>;
  restoreBackup: (backup?: BackupRecord) => Promise<void>;
  copyBackup: (backup: BackupRecord) => Promise<void>;
}) {
  const { text } = useLanguage();
  const [showAll, setShowAll] = useState(false);
  const activeDirectory = directory || localDirectory;
  const rows = showAll ? backups : backups.slice(0, 3);
  const formatSize = (bytes: number | null) => bytes == null ? "—" : `${(bytes / 1024 / 1024).toFixed(1).replace(".", ",")} Mo`;
  const statusLabel = (status: BackupRecord["status"]) => status === "REUSSIE"
    ? text("Réussie + copie externe", "ناجحة + نسخة خارجية")
    : status === "REUSSIE_LOCALE" ? text("Réussie", "ناجحة")
      : status === "EN_COURS" ? text("En cours", "قيد التنفيذ") : text("Échec", "فشل");

  return <div className="space-y-5">
    <section>
      <span className={ui("eyebrow")}>{text("Emplacement des sauvegardes", "مكان النسخ الاحتياطية")}</span>

      <div className="mt-3 grid items-stretch gap-4 lg:grid-cols-[1fr_360px]">
        <div className="space-y-3 rounded-2xl border border-slate-100 bg-white p-4 text-sm text-slate-700">
          <p className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-600"/>{text("Sauvegarde automatique quotidienne activée", "النسخ الاحتياطي اليومي مفعّل")}</p>
          <p className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-600"/>{text("Conservation des 30 dernières sauvegardes", "الاحتفاظ بآخر 30 نسخة")}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${directory ? "border-emerald-200 bg-emerald-50/60" : "border-teal-200 bg-teal-50/60"}`}>
          <div className="flex gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-white text-teal-700 shadow-sm"><ShieldCheck size={22}/></span>
            <div className="min-w-0">
              <strong className="block text-sm text-emerald-800">{directory ? text("Protection externe active", "الحماية الخارجية مفعلة") : text("Sauvegarde locale active", "النسخ المحلي مفعّل")}</strong>
              <p className="mt-1 break-all text-xs leading-5 text-slate-600">{activeDirectory || text("L’emplacement exact apparaîtra dans l’application Windows.", "سيظهر المكان الدقيق داخل تطبيق Windows.")}</p>
            </div>
          </div>
        </div>
      </div>

    </section>

    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-4 py-4">
        <span className={ui("eyebrow")}>{text("Dernières sauvegardes", "آخر النسخ الاحتياطية")}</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead className="bg-slate-50 text-slate-500"><tr>
            <th className="px-4 py-3 font-bold">{text("Date et heure", "التاريخ والوقت")}</th>
            <th className="px-4 py-3 font-bold">{text("Type", "النوع")}</th>
            <th className="px-4 py-3 font-bold">{text("Emplacement", "المكان")}</th>
            <th className="px-4 py-3 font-bold">{text("Taille", "الحجم")}</th>
            <th className="px-4 py-3 font-bold">{text("Statut", "الحالة")}</th>
            <th className="px-4 py-3 text-center font-bold">{text("Restaurer", "استرجاع")}</th>
          </tr></thead>
          <tbody className="divide-y divide-slate-100">
            {rows.length ? rows.map((backup) => <tr key={backup.id} className="text-slate-700">
              <td className="whitespace-nowrap px-4 py-3 font-semibold">{new Date(backup.startedAt).toLocaleString()}</td>
              <td className="px-4 py-3">{backup.backupType === "AUTOMATIQUE" ? text("Automatique", "تلقائية") : text("Manuelle", "يدوية")}</td>
              <td className="max-w-64 truncate px-4 py-3" title={directory || backup.filePath}>{directory || backup.filePath}</td>
              <td className="whitespace-nowrap px-4 py-3">{formatSize(backup.fileSize)}</td>
              <td className="px-4 py-3"><span className={`whitespace-nowrap rounded-full px-2.5 py-1 font-bold ${backup.status.startsWith("REUSSIE") ? "bg-emerald-100 text-emerald-700" : backup.status === "EN_COURS" ? "bg-blue-100 text-blue-700" : "bg-red-100 text-red-700"}`}>{statusLabel(backup.status)}</span></td>
              <td className="px-4 py-3"><div className="flex items-center justify-center gap-2">
                <button className={ui("icon-button")} disabled={busy !== "" || !backup.status.startsWith("REUSSIE")}
                  title={text("Restaurer cette sauvegarde", "استرجاع هذه النسخة")} onClick={() => void restoreBackup(backup)}><RefreshCw size={16}/></button>
              </div></td>
            </tr>) : <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-slate-500">{text("Aucune sauvegarde pour le moment.", "لا توجد نسخة احتياطية بعد.")}</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
        {backups.length > 3 ? <button className={ui("button ghost")} onClick={() => setShowAll((value) => !value)}>
          {showAll ? text("Afficher les 3 dernières", "عرض آخر 3 نسخ") : text("Voir toutes les sauvegardes", "عرض جميع النسخ")}
        </button> : <span className="px-3 text-xs font-semibold text-slate-500">{text(
          "Toutes les sauvegardes sont déjà affichées.", "جميع النسخ الاحتياطية معروضة بالفعل."
        )}</span>}
        <div className="flex flex-wrap items-center gap-2">
          <button className={ui("button ghost")} disabled={busy !== ""} onClick={() => void restoreBackup()}>
            <RefreshCw size={17}/>{busy === "restore" ? text("Restauration…", "جارٍ الاسترجاع…") : text("Restaurer une sauvegarde", "استرجاع نسخة احتياطية")}
          </button>
          <button className={ui("button primary")} disabled={busy !== ""} onClick={() => void createBackup()}>
            <Plus size={17}/>{busy === "backup" ? text("Sauvegarde…", "جارٍ النسخ…") : text("Sauvegarde manuelle maintenant", "إنشاء نسخة يدوية الآن")}
          </button>
        </div>
      </div>
    </section>

    <div className="flex items-start gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 text-xs leading-5 text-blue-800">
      <Info className="mt-0.5 size-5 shrink-0"/><p><strong className="block text-slate-900">{text("À propos des sauvegardes", "حول النسخ الاحتياطية")}</strong>{text("La sauvegarde contient la base de données complète : patients, rendez-vous, factures, paiements et laboratoires.", "تحتوي النسخة على قاعدة البيانات الكاملة: المرضى والمواعيد والفواتير والمدفوعات والمختبرات.")}</p>
    </div>
  </div>;
}

function ExportSettings({ busy, exportExcel }: {
  busy: string;
  exportExcel: () => Promise<void>;
}) {
  const { text } = useLanguage();
  return <>
    <div className={ui("panel-title")}><div><span className={ui("eyebrow")}>{text("Données du cabinet", "بيانات العيادة")}</span><h2>{text("Export Excel complet", "تصدير Excel كامل")}</h2>
      <p className={ui("settings-hint")}>{text("Téléchargez une copie lisible et structurée de vos données, sans créer de sauvegarde technique.", "نزّل نسخة واضحة ومنظمة من بياناتك دون إنشاء نسخة احتياطية تقنية.")}</p></div></div>
    <div className={ui("export-excel-card")}>
      <span><FileSpreadsheet/></span><div><small>{text("Classeur Microsoft Excel", "مصنف Microsoft Excel")}</small><h3>DENTAL SABRI — {text("Données complètes", "البيانات الكاملة")}</h3>
      <p>{text("Le fichier contient les données liées au tableau de bord, aux patients, rendez-vous, visites, factures, paiements, laboratoires et dépenses.", "يحتوي الملف على البيانات المرتبطة بلوحة القيادة والمرضى والمواعيد والزيارات والفواتير والمدفوعات والمختبرات والمصاريف.")}</p>
          <button className={ui("button ghost")} disabled={busy !== ""} onClick={() => void exportExcel()}><Download/>{busy === "excel" ? text("Téléchargement…", "جارٍ التنزيل…") : text("Télécharger Excel (.xlsx)", "تنزيل Excel (.xlsx)")}</button>
        <em>{text("Le fichier sera enregistré directement dans votre dossier Téléchargements.", "سيُحفظ الملف مباشرة في مجلد التنزيلات.")}</em></div>
    </div>
  </>;
}

function CabinetInformation() {
  const { text } = useLanguage();
  const information = [
    { label: text("Nom du cabinet", "اسم العيادة"), value: "DENTAL SABRI", icon: Building2 },
    { label: text("Responsable", "المسؤول"), value: "Khalid", icon: UserRound },
    { label: text("Spécialité", "التخصص"), value: text("Prothésiste dentaire", "تركيبات الأسنان"), icon: BriefcaseBusiness },
    { label: text("Téléphone", "الهاتف"), value: "06 90 33 70 82", icon: Phone },
    { label: text("Adresse e-mail", "البريد الإلكتروني"), value: "khalidsabri804@gm.com", icon: Mail },
    { label: text("Adresse", "العنوان"), value: "Aït Berra, Tinghir", icon: MapPin }
  ];
  return <div className={ui("cabinet-readonly")}>
    <div className={ui("cabinet-logo-preview")}><img src={cabinetLogo} alt={text("Logo officiel DENTAL SABRI", "الشعار الرسمي DENTAL SABRI")}/>
      <div><span className={ui("eyebrow")}>{text("Logo officiel", "الشعار الرسمي")}</span><strong>DENTAL SABRI</strong>
        <small><LockKeyhole size={13}/> {text("Utilisé dans l’application et les documents PDF", "مستخدم في التطبيق ومستندات PDF")}</small></div></div>
    <div className={ui("cabinet-info-grid")}>{information.map(({ label, value, icon: Icon }) =>
      <article key={label}><span><Icon size={18}/></span><div><small>{label}</small><strong>{value}</strong></div></article>)}</div>
  </div>;
}

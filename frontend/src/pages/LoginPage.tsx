import { ui } from "../styles";
import { AlertCircle, Eye, EyeOff, LockKeyhole, Mail, RefreshCw, ShieldCheck, WifiOff } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import cabinetLogo from "../assets/dental-sabri-logo.png";
import { LanguageSwitcher } from "../components/LanguageSwitcher";
import { useLanguage } from "../i18n/LanguageContext";
import { api, ensureAutomaticServerConnection } from "../services/api";

export function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [detectingServer, setDetectingServer] = useState(true);
  const [updateStatus, setUpdateStatus] = useState<SoftwareUpdateStatus | null>(null);
  const login = useAuthStore((state) => state.login);
  const navigate = useNavigate();
  const { language, isArabic, text } = useLanguage();
  const emailPattern = /^[^\s@]+@[^\s@]+\.com$/i;

  useEffect(() => {
    setError("");
    setFieldErrors({});
  }, [language]);

  useEffect(() => {
    void api.getRememberedCredentials().then((credentials) => {
      if (!credentials) return;
      setUsername(credentials.username);
      setPassword(credentials.password);
    });
    void ensureAutomaticServerConnection()
      .catch(() => setError(text(
        "PC Assistante introuvable. Vérifiez que le Hotspot est actif et que les deux PC sont connectés.",
        "تعذر العثور على حاسوب المساعدة. تأكد من تشغيل نقطة الاتصال وربط الحاسوبين."
      )))
      .finally(() => setDetectingServer(false));
  }, []);

  useEffect(() => {
    if (!window.desktop) return;
    void window.desktop.getSoftwareUpdateStatus().then(setUpdateStatus);
    return window.desktop.onSoftwareUpdateStatus(setUpdateStatus);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    const normalizedUsername = username.trim();
    const errors: { username?: string; password?: string } = {};

    if (!normalizedUsername) {
      errors.username = text("L’adresse e-mail est obligatoire.", "البريد الإلكتروني مطلوب.");
    } else if (!emailPattern.test(normalizedUsername)) {
      errors.username = text(
        "Utilisez une adresse valide au format nom@domaine.com.",
        "استخدم بريداً إلكترونياً صالحاً بالصيغة name@domain.com."
      );
    }
    if (!password) {
      errors.password = text("Le mot de passe est obligatoire.", "كلمة المرور مطلوبة.");
    }
    if (Object.keys(errors).length) {
      setFieldErrors(errors);
      return;
    }

    setSubmitting(true);
    setError("");
    setFieldErrors({});
    try {
      await ensureAutomaticServerConnection();
      await login(normalizedUsername, password);
      navigate("/");
    } catch (reason) {
      const backendError = reason as { message?: string; code?: string; status?: number };
      const backendMessage = backendError.message;
      if (!isArabic && backendError.code === "NETWORK_ERROR") {
        setError("Connexion impossible. Cliquez sur Actualiser puis réessayez.");
        return;
      }
      if (!isArabic && (backendError.status ?? 0) >= 500) {
        setError("Le serveur local se prepare. Patientez quelques secondes puis cliquez sur Actualiser.");
        return;
      }
      setError(isArabic
        ? "تعذر تسجيل الدخول. تحقق من البريد الإلكتروني وكلمة المرور."
        : backendMessage === "Le serveur du cabinet ne répond pas correctement."
          ? "Connexion impossible. Veuillez réessayer."
          : backendMessage ?? "Identifiants incorrects.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className={ui("login-page")}>
      <section className={ui("login-visual")}>
        <div className={ui("login-logo")}>
          <img src={cabinetLogo} alt={text("Logo DENTAL SABRI", "شعار DENTAL SABRI")} />
        </div>
        <span className={ui("eyebrow light")}>DENTAL SABRI</span>
        <h1>{text("Votre cabinet,", "عيادتكم،")}<br />{text("parfaitement organisé.", "منظمة بكل احترافية.")}</h1>
        <p>{text(
          "Patients, rendez-vous, traitements et finances dans une application locale, rapide et sécurisée.",
          "المرضى والمواعيد والعلاجات والماليات في تطبيق محلي سريع وآمن."
        )}</p>
        <div className={ui("login-features")}>
          <span><WifiOff size={18} /> {text("Fonctionne sans Internet", "يعمل دون إنترنت")}</span>
          <span><ShieldCheck size={18} /> {text("Données conservées au cabinet", "البيانات محفوظة داخل العيادة")}</span>
        </div>
      </section>

      <section className={`${ui("login-panel")} relative`}>
        <div className="absolute end-6 top-6 z-10"><LanguageSwitcher /></div>
        <form className={ui("login-card")} onSubmit={submit} noValidate>
          <div className={ui("login-card-icon")}><LockKeyhole size={22} /></div>
          <span className={ui("eyebrow")}>{text("Accès sécurisé", "دخول آمن")}</span>
          <h2>{text("Bienvenue", "مرحباً")}</h2>
          <p>{text("Connectez-vous à votre espace de travail.", "سجّل الدخول إلى مساحة عملك.")}</p>
          {error && (
            <div className={`${ui("alert alert-error")} justify-between`}>
              <span>{error}</span>
              <button
                type="button"
                className={ui("button ghost compact")}
                onClick={() => window.location.reload()}
              >
                <RefreshCw size={13} /> {text("Actualiser", "تحديث")}
              </button>
            </div>
          )}
          {detectingServer && <div className="mb-4 flex items-center gap-2 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs font-bold text-teal-800">
            <RefreshCw size={14} className="animate-spin"/>
            {text("Connexion automatique au cabinet…", "جارٍ الاتصال تلقائياً بالعيادة…")}
          </div>}
          <div className={ui("login-required-note")}><span>*</span> {text("Tous les champs sont obligatoires", "جميع الحقول إلزامية")}</div>

          <label className={ui("login-field")}>
            <span className={ui("login-field-label")}>{text("Adresse e-mail", "البريد الإلكتروني")} <b>*</b></span>
            <div className={ui("login-input-shell", fieldErrors.username ? "invalid" : "")}>
              <Mail />
              <input
                type="email"
                inputMode="email"
                autoComplete="username"
                placeholder={text("exemple@domaine.com", "name@domain.com")}
                dir="ltr"
                value={username}
                onChange={(event) => {
                  setUsername(event.target.value);
                  setFieldErrors((current) => ({ ...current, username: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.username)}
                autoFocus
                required
                pattern="^[^\s@]+@[^\s@]+\.[cC][oO][mM]$"
              />
            </div>
            {fieldErrors.username && <small className={ui("field-error")}><AlertCircle />{fieldErrors.username}</small>}
          </label>

          <label className={ui("login-field")}>
            <span className={ui("login-field-label")}>{text("Mot de passe", "كلمة المرور")} <b>*</b></span>
            <div className={ui("login-input-shell password", fieldErrors.password ? "invalid" : "")}>
              <LockKeyhole />
              <input
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                placeholder={text("Saisissez votre mot de passe", "أدخل كلمة المرور")}
                value={password}
                onChange={(event) => {
                  setPassword(event.target.value);
                  setFieldErrors((current) => ({ ...current, password: undefined }));
                }}
                aria-invalid={Boolean(fieldErrors.password)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                title={showPassword ? text("Masquer le mot de passe", "إخفاء كلمة المرور") : text("Afficher le mot de passe", "إظهار كلمة المرور")}
                aria-label={showPassword ? text("Masquer le mot de passe", "إخفاء كلمة المرور") : text("Afficher le mot de passe", "إظهار كلمة المرور")}
              >
                {showPassword ? <EyeOff /> : <Eye />}
              </button>
            </div>
            {fieldErrors.password && <small className={ui("field-error")}><AlertCircle />{fieldErrors.password}</small>}
          </label>

          <button className={ui("button primary full")} disabled={submitting}>
            {submitting ? text("Connexion…", "جارٍ تسجيل الدخول…") : text("Se connecter", "تسجيل الدخول")}
          </button>
          <small className={ui("login-help")}>{text(
            "Application locale • Assistance technique réservée au cabinet",
            "تطبيق محلي • الدعم التقني مخصص للعيادة"
          )}</small>
          {updateStatus && <div className="mt-3 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400">
            {(["checking", "downloading", "ready"] as SoftwareUpdateStatus["state"][]).includes(updateStatus.state) &&
              <RefreshCw size={12} className="animate-spin"/>}
            <span>{updateStatus.state === "not-configured"
              ? text(`Version ${updateStatus.currentVersion} - canal de mise à jour à connecter`, `الإصدار ${updateStatus.currentVersion}`)
              : updateStatus.message}</span>
          </div>}
        </form>
      </section>
    </main>
  );
}

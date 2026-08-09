import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import cabinetLogo from "./assets/dental-sabri-logo.png";
import { AppLayout } from "./components/AppLayout";
import { CalendarPage } from "./pages/CalendarPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LaboratoriesPage } from "./pages/LaboratoriesPage";
import { LoginPage } from "./pages/LoginPage";
import { PatientsPage } from "./pages/PatientsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { PatientDetailPage } from "./pages/PatientDetailPage";
import { useAuthStore } from "./store/authStore";
import { useLanguage } from "./i18n/LanguageContext";

const INITIAL_LOADING_DURATION_MS = 3000;

function ApplicationLoadingScreen() {
    const { text } = useLanguage();

    return (
        <main
            role="status"
            aria-live="polite"
            aria-label={text(
                "Chargement de l’application DENTAL SABRI",
                "جارٍ تحميل تطبيق DENTAL SABRI"
            )}
            className="relative grid min-h-screen place-items-center overflow-hidden bg-[#071827] px-6 text-white"
        >
          <div aria-hidden="true" className="absolute -left-28 -top-28 size-96 rounded-full bg-teal-500/10 blur-3xl"/>
          <div aria-hidden="true" className="absolute -bottom-36 -right-24 size-[30rem] rounded-full bg-cyan-300/8 blur-3xl"/>

          <section className="relative flex w-full max-w-sm flex-col items-center rounded-3xl border border-white/10 bg-white/5 px-8 py-10 text-center shadow-2xl shadow-black/25 backdrop-blur-sm">
            <div className="mb-5 grid size-20 place-items-center overflow-hidden rounded-2xl bg-[#0b8d86] shadow-xl shadow-teal-950/40">
              <img src={cabinetLogo} alt="" aria-hidden="true" className="size-full object-cover"/>
            </div>
            <p className="text-[10px] font-extrabold uppercase tracking-[0.24em] text-teal-300">DENTAL SABRI</p>
            <h1 className="mt-2 text-xl font-bold tracking-tight">
              {text("Préparation de votre cabinet", "جارٍ تجهيز عيادتكم")}
            </h1>
            <p className="mt-2 text-xs leading-5 text-slate-400">
              {text(
                  "Chargement sécurisé de votre espace de travail local…",
                  "جارٍ تحميل مساحة العمل المحلية بشكل آمن…"
              )}
            </p>

            <div className="mt-7 grid place-items-center">
              <span
                  aria-hidden="true"
                  className="size-11 animate-spin rounded-full border-[3px] border-white/15 border-t-teal-300"
              />
            </div>
            <span className="sr-only">
              {text("Chargement en cours, veuillez patienter.", "جارٍ التحميل، يُرجى الانتظار.")}
            </span>
          </section>
        </main>
    );
}

function ProtectedLayout() {
    const user = useAuthStore((state) => state.user);
    return user ? <AppLayout /> : <Navigate to="/login" replace/>;
}
export default function App() {
    const restore = useAuthStore((state) => state.restore);
    const authLoading = useAuthStore((state) => state.loading);
    const [minimumLoadingElapsed, setMinimumLoadingElapsed] = useState(false);

    useEffect(() => {
        const timer = window.setTimeout(() => setMinimumLoadingElapsed(true), INITIAL_LOADING_DURATION_MS);
        void restore();
        return () => window.clearTimeout(timer);
    }, [restore]);

    if (authLoading || !minimumLoadingElapsed) {
        return <ApplicationLoadingScreen />;
    }

    return <Routes>
    <Route path="/login" element={<LoginPage />}/>
    <Route element={<ProtectedLayout />}>
      <Route index element={<DashboardPage />}/>
      <Route path="/patients" element={<PatientsPage />}/>
      <Route path="/patients/:id" element={<PatientDetailPage />}/>
      <Route path="/calendar" element={<CalendarPage />}/>
      <Route path="/invoices" element={<InvoicesPage />}/>
      <Route path="/laboratories" element={<LaboratoriesPage />}/>
      <Route path="/settings" element={<SettingsPage />}/>
    </Route>
    <Route path="*" element={<Navigate to="/" replace/>}/>
  </Routes>;
}

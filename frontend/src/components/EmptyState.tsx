import { ui } from "../styles";
import { Inbox } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

const arabicMessages: Record<string, string> = {
    "Aucun patient ne correspond à votre recherche.": "لا يوجد مريض يطابق بحثك.",
    "Aucun patient enregistré.": "لم يتم تسجيل أي مريض.",
    "Aucune consultation enregistrée.": "لم يتم تسجيل أي استشارة.",
    "Aucun plan de traitement.": "لا توجد خطة علاج.",
    "Aucun rendez-vous dans l’historique.": "لا توجد مواعيد في السجل.",
    "Aucune facture pour ce patient.": "لا توجد فاتورة لهذا المريض.",
    "Aucun paiement pour ce patient.": "لا توجد دفعة لهذا المريض.",
    "Toutes les opérations ont été vérifiées.": "تمت مراجعة جميع العمليات.",
    "Aucune activité enregistrée.": "لم يتم تسجيل أي نشاط.",
    "Aucun laboratoire enregistré.": "لم يتم تسجيل أي مختبر.",
    "Aucun travail laboratoire.": "لا توجد أعمال مخبرية.",
    "Sélectionnez un laboratoire pour consulter son crédit.": "اختر مختبراً لعرض رصيده.",
    "Sélectionnez un patient ou créez son premier document.": "اختر مريضاً أو أنشئ أول مستند له."
};

export function EmptyState({ message, arabicMessage }: {
    message: string;
    arabicMessage?: string;
}) {
    const { text } = useLanguage();
    return <div className={ui("empty-state")}><Inbox size={28}/><span>{text(message, arabicMessage ?? arabicMessages[message] ?? message)}</span></div>;
}

import { ui } from "../styles";
import { useLanguage } from "../i18n/LanguageContext";

const statusLabels: Record<string, [string, string]> = {
    ACTIVE: ["Actif", "نشط"],
    BLOCKED: ["Bloqué", "محظور"],
    NOUVEAU: ["Nouveau", "جديد"],
    NOUVEAU_TRAITEMENT_PLANIFIE: ["Nouveau traitement planifié", "علاج جديد مبرمج"],
    EN_COURS: ["En cours", "قيد التنفيذ"],
    EN_ATTENTE: ["En attente", "قيد الانتظار"],
    TRAITEMENT_TERMINE: ["Dernier traitement terminé", "اكتمل العلاج الأخير"],
    PAIEMENT_INCOMPLET: ["Paiement incomplet", "دفع غير مكتمل"],
    SOLDE: ["Soldé", "مسدد"],
    DOSSIER_COMPLET: ["Dossier complet", "ملف مكتمل"],
    ARCHIVE: ["Archivé", "مؤرشف"],
    EN_ATTENTE_VERIFICATION: ["En attente de vérification", "في انتظار المراجعة"],
    VERIFIE_PAR_DOCTEUR: ["Vérifié par le docteur", "راجعه الطبيب"],
    MODIFIE_PAR_DOCTEUR: ["Modifié par le docteur", "عدّله الطبيب"],
    A_CORRIGER: ["À corriger", "يتطلب التصحيح"],
    PLANIFIE: ["Planifié", "مجدول"],
    CONFIRME: ["Confirmé", "مؤكد"],
    PATIENT_ARRIVE: ["Patient arrivé", "وصل المريض"],
    EN_CONSULTATION: ["En consultation", "في الاستشارة"],
    TERMINE: ["Terminé", "مكتمل"],
    ANNULE: ["Annulé", "ملغى"],
    ABSENT: ["Absent", "متغيب"],
    REPORTE: ["Reporté", "مؤجل"],
    SUIVI_NECESSAIRE: ["En cours", "قيد العلاج"],
    A_PREPARER: ["À préparer", "قيد التحضير"],
    ENVOYE: ["Envoyé", "مُرسل"],
    PRET: ["Prêt", "جاهز"],
    RECU: ["Reçu", "مُستلم"],
    POSE_AU_PATIENT: ["Posé au patient", "تم تركيبه للمريض"],
    A_REFAIRE: ["À refaire", "يجب إعادته"],
    BROUILLON: ["Brouillon", "مسودة"],
    VALIDEE: ["Validée", "معتمدة"],
    PARTIELLEMENT_PAYEE: ["Partiellement payée", "مدفوعة جزئياً"],
    SOLDEE: ["Soldée", "مسددة"],
    ANNULEE: ["Annulée", "ملغاة"],
    NON_PAYEE: ["Non payée", "غير مدفوعة"],
    EN_RETARD: ["En retard", "متأخرة"],
    ECHEC: ["Échec", "فشل"],
    OUVERTE: ["Ouverte", "مفتوحة"],
    FERMEE: ["Fermée", "مغلقة"]
};

export function StatusBadge({ value }: {
    value: string;
}) {
    const { text } = useLanguage();
    const normalized = value.trim().toUpperCase().replaceAll(" ", "_");
    const dangerStatuses = ["ANNULE", "ANNULEE", "BLOCKED", "ECHEC", "A_CORRIGER", "A_REFAIRE", "EN_RETARD", "ABSENT"];
    const warningStatuses = ["NOUVEAU_TRAITEMENT_PLANIFIE", "EN_ATTENTE", "EN_ATTENTE_VERIFICATION", "PARTIELLEMENT_PAYEE", "PAIEMENT_INCOMPLET", "NON_PAYEE", "BROUILLON", "SUIVI_NECESSAIRE", "A_PREPARER"];
    const successStatuses = ["ACTIVE", "CONFIRME", "TERMINE", "TRAITEMENT_TERMINE", "SOLDE", "SOLDEE", "DOSSIER_COMPLET", "VALIDEE", "VERIFIE_PAR_DOCTEUR", "PRET", "RECU", "FERMEE"];
    const tone = dangerStatuses.includes(normalized) ? "danger"
        : warningStatuses.includes(normalized) ? "warning"
            : successStatuses.includes(normalized) ? "success"
                : "neutral";
    const translatedLabel = statusLabels[normalized];
    const fallback = value.replaceAll("_", " ");
    return <span className={ui(`badge badge-${tone}`)}>{translatedLabel ? text(...translatedLabel) : fallback}</span>;
}

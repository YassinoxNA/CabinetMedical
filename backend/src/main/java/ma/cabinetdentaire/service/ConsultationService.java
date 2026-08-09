package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.dto.ConsultationRequest;
import ma.cabinetdentaire.dto.ConsultationResponse;
import ma.cabinetdentaire.dto.ConsultationBillingRequest;
import ma.cabinetdentaire.dto.PaymentRequest;
import ma.cabinetdentaire.entity.Consultation;
import ma.cabinetdentaire.entity.PatientInvoice;
import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.repository.ConsultationRepository;
import ma.cabinetdentaire.repository.AppointmentRepository;
import ma.cabinetdentaire.entity.PatientFileStatus;
import ma.cabinetdentaire.entity.TreatmentPlan;
import ma.cabinetdentaire.entity.User;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.HttpStatus;

import java.math.BigDecimal;
import java.time.Clock;
import java.util.List;
import java.util.UUID;

@Service
public class ConsultationService {
    private final ConsultationRepository repository;
    private final AppointmentRepository appointmentRepository;
    private final PatientService patientService;
    private final TreatmentPlanService planService;
    private final InvoiceService invoiceService;
    private final AuditService auditService;
    private final Clock clock = Clock.systemUTC();

    public ConsultationService(ConsultationRepository repository, AppointmentRepository appointmentRepository,
                               PatientService patientService,
                               TreatmentPlanService planService, InvoiceService invoiceService, AuditService auditService) {
        this.repository = repository;
        this.appointmentRepository = appointmentRepository;
        this.patientService = patientService;
        this.planService = planService;
        this.invoiceService = invoiceService;
        this.auditService = auditService;
    }

    @Transactional(readOnly = true)
    public List<ConsultationResponse> list(UUID patientId) {
        patientService.requireEntity(patientId);
        return repository.findAllByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(patientId)
                .stream().map(ConsultationMapper::toResponse).toList();
    }

    @Transactional
    public ConsultationResponse create(UUID patientId, ConsultationRequest request,
                                       User actor, ClientRequestInfo client) {
        var patient = patientService.requireEntity(patientId);
        if (patient.getFileStatus() == PatientFileStatus.TRAITEMENT_TERMINE) {
            var lastConsultation = repository
                    .findFirstByPatientIdAndDeletedAtIsNullOrderByConsultationAtDesc(patientId)
                    .orElse(null);
            if (lastConsultation != null
                    && !appointmentRepository.existsNewAppointmentAfter(
                            patientId, lastConsultation.getConsultationAt())) {
                throw new BusinessException("NEW_APPOINTMENT_REQUIRED",
                        "Planifiez un nouveau rendez-vous avant de créer une nouvelle consultation.",
                        HttpStatus.CONFLICT);
            }
        }
        TreatmentPlan plan = request.treatmentPlanId() == null
                ? null : planService.requireEntity(request.treatmentPlanId());
        if (plan != null && !plan.getPatient().getId().equals(patientId)) {
            throw new IllegalArgumentException("Le plan de traitement appartient à un autre patient.");
        }
        Consultation consultation = repository.save(new Consultation(
                patient, plan, request.consultationAt(), request.reason(), request.diagnosis(),
                request.diseaseType(), request.tooth(), request.treatmentPerformed(),
                request.observations(), request.prescription(), request.price(),
                request.treatmentStatus()
        ));
        patient.updateTreatmentStatus(request.treatmentStatus(), request.consultationAt());
        auditService.record(actor, "CONSULTATION_CREATED", "CONSULTATION", "CONSULTATION",
                consultation.getId(), "Nouvelle consultation pour " + patient.getPatientNumber() + ".", client);
        return ConsultationMapper.toResponse(consultation);
    }

    @Transactional
    public ConsultationResponse createWithBilling(UUID patientId, ConsultationBillingRequest billing,
                                                  User actor, ClientRequestInfo client) {
        ConsultationRequest request = billing.consultation();
        BigDecimal paid = billing.amountPaid();

        if (billing.billingMode() == ConsultationBillingRequest.BillingMode.NOUVEAU_SOIN) {
            if (request.price() == null || request.price().signum() <= 0) {
                throw new BusinessException("INVALID_TREATMENT_PRICE",
                        "Le prix total du nouveau soin doit être supérieur à 0.", HttpStatus.BAD_REQUEST);
            }
            if (paid.compareTo(request.price()) > 0) {
                throw new BusinessException("PAYMENT_EXCEEDS_TREATMENT_PRICE",
                        "Le paiement du jour ne peut pas dépasser le prix total du soin.", HttpStatus.BAD_REQUEST);
            }
        } else {
            if (billing.invoiceId() == null) {
                throw new BusinessException("INVOICE_REQUIRED",
                        "Sélectionnez le soin en cours à régler.", HttpStatus.BAD_REQUEST);
            }
            if (request.price() != null && request.price().signum() != 0) {
                throw new BusinessException("FOLLOW_UP_MUST_NOT_ADD_PRICE",
                        "Une visite de suivi ne doit pas ajouter un nouveau prix.", HttpStatus.BAD_REQUEST);
            }
            if (paid.signum() <= 0) {
                throw new BusinessException("PAYMENT_REQUIRED",
                        "Saisissez le versement effectué pendant cette visite.", HttpStatus.BAD_REQUEST);
            }
        }

        ConsultationResponse response = create(patientId, request, actor, client);
        Consultation consultation = repository.findById(response.id()).orElseThrow();
        PatientInvoice invoice;

        if (billing.billingMode() == ConsultationBillingRequest.BillingMode.NOUVEAU_SOIN) {
            var createdInvoice = invoiceService.createForConsultation(consultation, actor, client);
            invoice = invoiceService.requireEntity(createdInvoice.id());
        } else {
            invoice = invoiceService.requireEntity(billing.invoiceId());
            if (!invoice.getPatient().getId().equals(patientId)
                    || invoice.getInvoiceType() != PatientInvoice.Type.FACTURE
                    || invoice.getStatus() == PatientInvoice.Status.ANNULEE
                    || invoice.getStatus() == PatientInvoice.Status.BROUILLON
                    || invoice.getRemainingAmount().signum() <= 0) {
                throw new BusinessException("INVOICE_NOT_PAYABLE_FOR_PATIENT",
                        "Le soin sélectionné ne peut pas recevoir ce paiement.", HttpStatus.BAD_REQUEST);
            }
        }

        if (paid.signum() > 0) {
            invoiceService.pay(new PaymentRequest(
                    invoice.getId(), paid, clock.instant(), billing.paymentMethod(), null,
                    billing.billingMode() == ConsultationBillingRequest.BillingMode.NOUVEAU_SOIN
                            ? "Premier versement du soin."
                            : "Versement pendant une visite de suivi."
            ), actor, client);
        }
        return response;
    }
}

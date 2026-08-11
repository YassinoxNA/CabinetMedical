package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.dto.InvoiceRequest;
import ma.cabinetdentaire.dto.InvoiceResponse;
import ma.cabinetdentaire.entity.PatientInvoice;
import ma.cabinetdentaire.entity.Consultation;
import ma.cabinetdentaire.repository.PatientInvoiceRepository;
import ma.cabinetdentaire.dto.PaymentRequest;
import ma.cabinetdentaire.dto.PaymentResponse;
import ma.cabinetdentaire.entity.PatientPayment;
import ma.cabinetdentaire.repository.PatientPaymentRepository;
import ma.cabinetdentaire.entity.User;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.ZoneId;
import java.util.List;
import java.util.UUID;

@Service
public class InvoiceService {
    private final PatientInvoiceRepository invoices;
    private final PatientPaymentRepository payments;
    private final PatientService patientService;
    private final JdbcTemplate jdbc;
    private final AuditService audit;
    private final Clock clock = Clock.systemUTC();

    public InvoiceService(PatientInvoiceRepository invoices, PatientPaymentRepository payments,
                          PatientService patientService, JdbcTemplate jdbc, AuditService audit) {
        this.invoices = invoices; this.payments = payments; this.patientService = patientService;
        this.jdbc = jdbc; this.audit = audit;
    }

    @Transactional
    public InvoiceResponse create(InvoiceRequest request, User actor, ClientRequestInfo client) {
        var patient = patientService.requireEntity(request.patientId());
        String prefix = request.type() == PatientInvoice.Type.DEVIS ? "DEV"
                : request.type() == PatientInvoice.Type.AVOIR ? "AVR" : "FAC";
        String number = nextNumber(prefix, request.invoiceDate().getYear());
        PatientInvoice invoice = new PatientInvoice(patient, number, request.type(),
                request.invoiceDate(), request.notes());
        request.items().forEach(i -> invoice.addItem(i.description(), i.tooth(), i.quantity(), i.unitPrice()));
        invoices.save(invoice);
        audit.record(actor, "INVOICE_CREATED", "INVOICE", "PATIENT_INVOICE", invoice.getId(),
                "Création de " + number + ".", client);
        return InvoiceMapper.toResponse(invoice);
    }

    @Transactional
    public InvoiceResponse update(UUID id, InvoiceRequest request, User actor, ClientRequestInfo client) {
        PatientInvoice invoice = require(id);
        if (!invoice.getPatient().getId().equals(request.patientId())) {
            throw new BusinessException("INVOICE_PATIENT_IMMUTABLE",
                    "Le patient d'un document existant ne peut pas etre remplace.", HttpStatus.BAD_REQUEST);
        }
        try {
            invoice.beginUpdate(request.type(), request.invoiceDate(), request.notes());
            request.items().forEach(i -> invoice.addItem(i.description(), i.tooth(), i.quantity(), i.unitPrice()));
            invoice.finishUpdate();
        } catch (IllegalStateException e) {
            throw new BusinessException("INVOICE_NOT_EDITABLE", e.getMessage(), HttpStatus.CONFLICT);
        }
        audit.record(actor, "INVOICE_UPDATED", "INVOICE", "PATIENT_INVOICE", id,
                "Modification de " + invoice.getInvoiceNumber() + ".", client);
        return InvoiceMapper.toResponse(invoice);
    }

    @Transactional
    public void delete(UUID id, User actor, ClientRequestInfo client) {
        PatientInvoice invoice = require(id);
        String number = invoice.getInvoiceNumber();
        if (invoice.isEditableDraft() && !payments.existsByInvoiceIdAndCancelledAtIsNull(id)) {
            invoices.delete(invoice);
            audit.record(actor, "INVOICE_DELETED", "INVOICE", "PATIENT_INVOICE", id,
                    "Suppression du brouillon " + number + ".", client);
            return;
        }
        try {
            var cancelledAt = clock.instant();
            payments.findAllByInvoiceIdAndCancelledAtIsNull(id)
                    .forEach(payment -> payment.cancel(cancelledAt));
            invoice.cancel(cancelledAt);
        } catch (IllegalStateException e) {
            throw new BusinessException("INVOICE_NOT_DELETABLE", e.getMessage(), HttpStatus.CONFLICT);
        }
        audit.record(actor, "INVOICE_CANCELLED", "INVOICE", "PATIENT_INVOICE", id,
                "Annulation de " + number + " et de ses reglements actifs.", client);
    }

    @Transactional
    public InvoiceResponse createForConsultation(Consultation consultation, User actor, ClientRequestInfo client) {
        if (invoices.existsByItemsConsultationId(consultation.getId())) {
            throw new BusinessException("CONSULTATION_ALREADY_INVOICED",
                    "Cette consultation a déjà été facturée.", HttpStatus.CONFLICT);
        }
        var invoiceDate = consultation.getConsultationAt().atZone(ZoneId.of("Africa/Casablanca")).toLocalDate();
        String number = nextNumber("FAC", invoiceDate.getYear());
        PatientInvoice invoice = new PatientInvoice(
                consultation.getPatient(), number, PatientInvoice.Type.FACTURE, invoiceDate,
                "Facture générée automatiquement depuis la consultation.");
        String description = consultation.getTreatmentPerformed() != null
                ? consultation.getTreatmentPerformed()
                : consultation.getDiseaseType();
        description = description.length() > 255 ? description.substring(0, 255) : description;
        invoice.addConsultation(consultation, description, consultation.getTooth(), consultation.getPrice());
        invoice.validate(clock.instant());
        invoices.save(invoice);
        audit.record(actor, "INVOICE_CREATED_FROM_CONSULTATION", "INVOICE", "PATIENT_INVOICE",
                invoice.getId(), "Création automatique de " + number + " depuis la consultation.", client);
        return InvoiceMapper.toResponse(invoice);
    }

    @Transactional(readOnly = true)
    public InvoiceResponse get(UUID id) { return InvoiceMapper.toResponse(require(id)); }

    @Transactional(readOnly = true)
    public PatientInvoice requireEntity(UUID id) { return require(id); }

    @Transactional(readOnly = true)
    public List<InvoiceResponse> byPatient(UUID patientId) {
        return invoices.findAllByPatientIdOrderByInvoiceDateDesc(patientId)
                .stream().map(InvoiceMapper::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<PaymentResponse> paymentsByPatient(UUID patientId) {
        return payments.findAllByPatientIdAndCancelledAtIsNullOrderByPaymentDateDesc(patientId)
                .stream().map(PaymentMapper::toResponse).toList();
    }

    @Transactional
    public InvoiceResponse validate(UUID id, User actor, ClientRequestInfo client) {
        PatientInvoice invoice = require(id);
        try { invoice.validate(clock.instant()); }
        catch (IllegalStateException e) {
            throw new BusinessException("EMPTY_INVOICE", e.getMessage(), HttpStatus.BAD_REQUEST);
        }
        audit.record(actor, "INVOICE_VALIDATED", "INVOICE", "PATIENT_INVOICE", id,
                "Validation de " + invoice.getInvoiceNumber() + ".", client);
        return InvoiceMapper.toResponse(invoice);
    }

    @Transactional
    public PaymentResponse pay(PaymentRequest request, User actor, ClientRequestInfo client) {
        PatientInvoice invoice = require(request.invoiceId());
        if (invoice.getStatus() == PatientInvoice.Status.BROUILLON
                || invoice.getStatus() == PatientInvoice.Status.ANNULEE) {
            throw new BusinessException("INVOICE_NOT_PAYABLE",
                    "La facture doit être validée avant paiement.", HttpStatus.BAD_REQUEST);
        }
        try { invoice.applyPayment(request.amount()); }
        catch (IllegalArgumentException e) {
            throw new BusinessException("PAYMENT_EXCEEDS_BALANCE", e.getMessage(), HttpStatus.BAD_REQUEST);
        }
        String receipt = nextNumber("REC", request.paymentDate().atZone(
                java.time.ZoneId.of("Africa/Casablanca")).getYear());
        PatientPayment payment = payments.save(new PatientPayment(
                invoice, receipt, request.amount(), request.paymentDate(), request.paymentMethod(),
                request.reference(), request.notes(), actor.getId()));
        audit.record(actor, "PATIENT_PAYMENT_CREATED", "PAYMENT", "PATIENT_PAYMENT", payment.getId(),
                "Paiement " + receipt + " de " + request.amount() + " MAD.", client);
        return PaymentMapper.toResponse(payment);
    }

    private String nextNumber(String type, int year) {
        Long value = jdbc.queryForObject("""
                insert into document_sequences(sequence_type, sequence_year, current_value)
                values (?, ?, 1)
                on conflict (sequence_type, sequence_year)
                do update set current_value = document_sequences.current_value + 1
                returning current_value
                """, Long.class, type, year);
        return "%s-%d-%06d".formatted(type, year, value);
    }

    private PatientInvoice require(UUID id) {
        return invoices.findById(id).orElseThrow(() -> new BusinessException(
                "INVOICE_NOT_FOUND", "Facture introuvable.", HttpStatus.NOT_FOUND));
    }
}

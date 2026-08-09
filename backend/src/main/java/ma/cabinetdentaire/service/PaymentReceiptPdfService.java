package ma.cabinetdentaire.service;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.repository.PatientPaymentRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDType1Font;
import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.text.DecimalFormat;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service
public class PaymentReceiptPdfService {
    private final PatientPaymentRepository payments;
    private final PdfBrandingService branding;
    private final DecimalFormat money = new DecimalFormat("#,##0.00");

    public PaymentReceiptPdfService(PatientPaymentRepository payments, PdfBrandingService branding) {
        this.payments = payments;
        this.branding = branding;
    }

    @Transactional(readOnly = true)
    public byte[] generate(UUID id) throws IOException {
        var payment = payments.findById(id).orElseThrow(() -> new BusinessException(
                "PAYMENT_NOT_FOUND", "Paiement introuvable.", HttpStatus.NOT_FOUND));
        Map<String, String> cfg = branding.settings();
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A5);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 545;
                branding.drawLogo(document, content, 35, y - 45, 58, 45, cfg);
                text(content, bold(), 15, 105, y, cfg.getOrDefault("cabinet.name", "Cabinet Dentaire"));
                y -= 16;
                text(content, regular(), 8, 105, y, join(cfg.get("cabinet.doctor"), cfg.get("cabinet.specialty")));
                y -= 13;
                text(content, regular(), 8, 105, y, cfg.getOrDefault("cabinet.address", ""));
                y -= 13;
                text(content, regular(), 8, 105, y, join(cfg.get("cabinet.phone"), cfg.get("cabinet.email")));
                y -= 28;
                text(content, bold(), 18, 35, y, "REÇU DE PAIEMENT " + payment.getReceiptNumber());
                y -= 32;
                var patient = payment.getPatient();
                text(content, regular(), 10, 35, y, "Patient : " + patient.getFirstName() + " " + patient.getLastName());
                y -= 19;
                text(content, regular(), 10, 35, y, "Dossier : " + patient.getPatientNumber());
                y -= 19;
                text(content, regular(), 10, 35, y, "Facture : " + payment.getInvoice().getInvoiceNumber());
                y -= 19;
                text(content, regular(), 10, 35, y, "Date : " + DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm")
                        .withZone(ZoneId.of("Africa/Casablanca")).format(payment.getPaymentDate()));
                y -= 36;
                text(content, bold(), 12, 35, y, "Montant reçu");
                text(content, bold(), 16, 265, y, money.format(payment.getAmount()) + " MAD");
                y -= 28;
                text(content, regular(), 10, 35, y, "Mode de paiement : " + payment.getPaymentMethod().name().replace('_', ' '));
                if (payment.getReference() != null) {
                    y -= 18;
                    text(content, regular(), 10, 35, y, "Référence : " + payment.getReference());
                }
                y -= 45;
                text(content, regular(), 9, 35, y, "Merci pour votre confiance.");
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private void text(PDPageContentStream content, PDType1Font font, float size, float x, float y, String value) throws IOException {
        content.beginText(); content.setFont(font, size); content.newLineAtOffset(x, y);
        content.showText(value == null ? "" : value.replaceAll("[^\\x20-\\x7EÀ-ÿ]", " ")); content.endText();
    }
    private String join(String first, String second) {
        return java.util.stream.Stream.of(first, second).filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(" | "));
    }
    private PDType1Font regular() { return new PDType1Font(Standard14Fonts.FontName.HELVETICA); }
    private PDType1Font bold() { return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD); }
}

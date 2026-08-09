package ma.cabinetdentaire.service;

import ma.cabinetdentaire.exception.BusinessException;
import ma.cabinetdentaire.repository.SupplierInvoiceRepository;
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
import java.time.format.DateTimeFormatter;
import java.util.Map;
import java.util.UUID;

@Service
public class SupplierInvoicePdfService {
    private final SupplierInvoiceRepository invoices;
    private final PdfBrandingService branding;
    private final DecimalFormat money = new DecimalFormat("#,##0.00");

    public SupplierInvoicePdfService(SupplierInvoiceRepository invoices, PdfBrandingService branding) {
        this.invoices = invoices;
        this.branding = branding;
    }

    @Transactional(readOnly = true)
    public byte[] generate(UUID id) throws IOException {
        var invoice = invoices.findById(id).orElseThrow(() -> new BusinessException(
                "SUPPLIER_INVOICE_NOT_FOUND", "Facture fournisseur introuvable.", HttpStatus.NOT_FOUND));
        Map<String, String> cfg = branding.settings();
        try (PDDocument document = new PDDocument(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            PDPage page = new PDPage(PDRectangle.A4);
            document.addPage(page);
            try (PDPageContentStream content = new PDPageContentStream(document, page)) {
                float y = 790;
                branding.drawLogo(document, content, 45, y - 55, 70, 55, cfg);
                text(content, bold(), 16, 130, y, cfg.getOrDefault("cabinet.name", "Cabinet Dentaire"));
                y -= 17;
                text(content, regular(), 9, 130, y, join(cfg.get("cabinet.doctor"), cfg.get("cabinet.specialty")));
                y -= 14;
                text(content, regular(), 9, 130, y, cfg.getOrDefault("cabinet.address", ""));
                y -= 14;
                text(content, regular(), 9, 130, y, join(cfg.get("cabinet.phone"), cfg.get("cabinet.email")));
                y -= 32;
                text(content, bold(), 18, 45, y, "FACTURE LABORATOIRE " + invoice.getInvoiceNumber());
                y -= 25;
                text(content, regular(), 10, 45, y, "Laboratoire : " + invoice.getLaboratory().getName());
                y -= 17;
                text(content, regular(), 10, 45, y, "Date : " + invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                if (invoice.getDueDate() != null) {
                    y -= 17;
                    text(content, regular(), 10, 45, y, "Échéance : " + invoice.getDueDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));
                }
                y -= 35;
                line(content, 45, y, 550);
                y -= 25;
                text(content, bold(), 11, 350, y, "Montant total :");
                text(content, bold(), 11, 475, y, money.format(invoice.getTotalAmount()) + " MAD");
                y -= 22;
                text(content, regular(), 10, 350, y, "Montant payé :");
                text(content, regular(), 10, 475, y, money.format(invoice.getPaidAmount()) + " MAD");
                y -= 22;
                text(content, bold(), 12, 350, y, "Reste à payer :");
                text(content, bold(), 12, 475, y, money.format(invoice.getRemainingAmount()) + " MAD");
                y -= 40;
                text(content, regular(), 10, 45, y, "Statut : " + invoice.getStatus().name().replace('_', ' '));
                if (invoice.getNotes() != null && !invoice.getNotes().isBlank()) {
                    y -= 22;
                    text(content, regular(), 9, 45, y, "Notes : " + invoice.getNotes());
                }
            }
            document.save(output);
            return output.toByteArray();
        }
    }

    private void text(PDPageContentStream content, PDType1Font font, float size, float x, float y, String value) throws IOException {
        content.beginText();
        content.setFont(font, size);
        content.newLineAtOffset(x, y);
        content.showText(safe(value));
        content.endText();
    }

    private void line(PDPageContentStream content, float x, float y, float x2) throws IOException {
        content.moveTo(x, y);
        content.lineTo(x2, y);
        content.stroke();
    }

    private String safe(String value) {
        return value == null ? "" : value.replaceAll("[^\\x20-\\x7EÀ-ÿ]", " ");
    }

    private String join(String first, String second) {
        return java.util.stream.Stream.of(first, second).filter(value -> value != null && !value.isBlank())
                .collect(java.util.stream.Collectors.joining(" | "));
    }

    private PDType1Font regular() { return new PDType1Font(Standard14Fonts.FontName.HELVETICA); }
    private PDType1Font bold() { return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD); }
}

package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.service.PaymentReceiptPdfService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/patient-payments")
public class PaymentDocumentController {
    private final PaymentReceiptPdfService pdf;

    public PaymentDocumentController(PaymentReceiptPdfService pdf) {
        this.pdf = pdf;
    }

    @GetMapping(value = "/{id}/pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<byte[]> pdf(@PathVariable UUID id) throws IOException {
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=recu-paiement.pdf")
                .body(pdf.generate(id));
    }
}

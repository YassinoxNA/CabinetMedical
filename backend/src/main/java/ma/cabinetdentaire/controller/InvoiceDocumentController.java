package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;
import ma.cabinetdentaire.service.InvoicePdfService;import org.springframework.http.*;import org.springframework.web.bind.annotation.*;import java.io.IOException;import java.util.UUID;
@RestController @RequestMapping("/api/v1/patient-invoices") public class InvoiceDocumentController{
 private final InvoicePdfService service;public InvoiceDocumentController(InvoicePdfService s){service=s;}
 @GetMapping(value="/{id}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)public ResponseEntity<byte[]> pdf(@PathVariable UUID id)throws IOException{
  return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=\"facture-"+id+".pdf\"").body(service.generate(id));}
}

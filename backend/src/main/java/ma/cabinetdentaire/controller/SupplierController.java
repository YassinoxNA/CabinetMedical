package ma.cabinetdentaire.controller;

import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.security.AuthenticatedUser;import ma.cabinetdentaire.service.SupplierService;import ma.cabinetdentaire.service.UserService;
import org.springframework.http.HttpStatus;import org.springframework.security.core.annotation.AuthenticationPrincipal;import org.springframework.web.bind.annotation.*;
import java.util.*;import static ma.cabinetdentaire.dto.SupplierModels.*;
import ma.cabinetdentaire.service.SupplierInvoicePdfService;
import org.springframework.http.*;
import java.io.IOException;
@RestController @RequestMapping("/api/v1") public class SupplierController {
 private final SupplierService service;private final UserService users;private final SupplierInvoicePdfService pdf;
 public SupplierController(SupplierService s,UserService u,SupplierInvoicePdfService pdf){service=s;users=u;this.pdf=pdf;}
 @PostMapping("/supplier-invoices") @ResponseStatus(HttpStatus.CREATED) public InvoiceResponse invoice(@Valid @RequestBody InvoiceRequest r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){return service.create(r,users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
 @PostMapping("/supplier-payments") @ResponseStatus(HttpStatus.CREATED) public PaymentResponse payment(@Valid @RequestBody PaymentRequest r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){return service.pay(r,users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
 @GetMapping("/laboratories/{id}/supplier-invoices") public List<InvoiceResponse> invoices(@PathVariable UUID id){return service.invoices(id);}
 @GetMapping(value="/supplier-invoices/{id}/pdf",produces=MediaType.APPLICATION_PDF_VALUE)
 public ResponseEntity<byte[]> pdf(@PathVariable UUID id)throws IOException{
  return ResponseEntity.ok().header(HttpHeaders.CONTENT_DISPOSITION,"attachment; filename=facture-laboratoire.pdf").body(pdf.generate(id));}
}

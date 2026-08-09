package ma.cabinetdentaire.service;

import ma.cabinetdentaire.mapper.*;
import ma.cabinetdentaire.service.*;import ma.cabinetdentaire.exception.BusinessException;import ma.cabinetdentaire.repository.LaboratoryRepository;
import ma.cabinetdentaire.dto.SupplierModels.*;import ma.cabinetdentaire.entity.*;import ma.cabinetdentaire.repository.SupplierInvoiceRepository;import ma.cabinetdentaire.repository.SupplierPaymentRepository;
import ma.cabinetdentaire.entity.User;import org.springframework.http.HttpStatus;import org.springframework.stereotype.Service;import org.springframework.transaction.annotation.Transactional;import java.util.*;
@Service public class SupplierService {
 private final SupplierInvoiceRepository invoices;private final SupplierPaymentRepository payments;private final LaboratoryRepository labs;private final AuditService audit;
 public SupplierService(SupplierInvoiceRepository i,SupplierPaymentRepository p,LaboratoryRepository l,AuditService a){invoices=i;payments=p;labs=l;audit=a;}
 @Transactional public InvoiceResponse create(InvoiceRequest r,User actor,ClientRequestInfo c){
  var lab=labs.findById(r.laboratoryId()).orElseThrow(()->new BusinessException("LAB_NOT_FOUND","Laboratoire introuvable.",HttpStatus.NOT_FOUND));
  var i=invoices.save(new SupplierInvoice(lab,r.invoiceNumber(),r.invoiceDate(),r.dueDate(),r.totalAmount(),r.attachmentPath(),r.notes()));
  audit.record(actor,"SUPPLIER_INVOICE_CREATED","SUPPLIER","SUPPLIER_INVOICE",i.getId(),"Facture fournisseur "+r.invoiceNumber()+".",c);return SupplierMapper.toResponse(i);}
 @Transactional public PaymentResponse pay(PaymentRequest r,User actor,ClientRequestInfo c){
  var i=invoices.findById(r.invoiceId()).orElseThrow(()->new BusinessException("SUPPLIER_INVOICE_NOT_FOUND","Facture fournisseur introuvable.",HttpStatus.NOT_FOUND));
  try{i.pay(r.amount());}catch(IllegalArgumentException e){throw new BusinessException("PAYMENT_EXCEEDS_BALANCE",e.getMessage(),HttpStatus.BAD_REQUEST);}
  var p=payments.save(new SupplierPayment(i,r.amount(),r.paymentDate(),r.paymentMethod(),r.reference(),r.notes(),actor.getId()));
  audit.record(actor,"SUPPLIER_PAYMENT_CREATED","SUPPLIER","SUPPLIER_PAYMENT",p.getId(),"Paiement fournisseur de "+r.amount()+" MAD.",c);return SupplierMapper.toResponse(p);}
 @Transactional(readOnly=true) public List<InvoiceResponse> invoices(UUID lab){return invoices.findAllByLaboratoryIdOrderByInvoiceDateDesc(lab).stream().map(SupplierMapper::toResponse).toList();}
}

package ma.cabinetdentaire.service;
import ma.cabinetdentaire.entity.PatientInvoice;
import org.apache.pdfbox.pdmodel.*;import org.apache.pdfbox.pdmodel.common.PDRectangle;import org.apache.pdfbox.pdmodel.font.Standard14Fonts;
import org.apache.pdfbox.pdmodel.font.PDType1Font;import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.io.*;import java.text.DecimalFormat;import java.time.format.DateTimeFormatter;import java.util.*;
@Service public class InvoicePdfService {
 private final InvoiceService invoices;private final PdfBrandingService branding;private final DecimalFormat money=new DecimalFormat("#,##0.00");
 public InvoicePdfService(InvoiceService i,PdfBrandingService b){invoices=i;branding=b;}
 @Transactional(readOnly=true)
 public byte[] generate(UUID id)throws IOException{PatientInvoice invoice=invoices.requireEntity(id);Map<String,String> cfg=branding.settings();
  try(PDDocument doc=new PDDocument();ByteArrayOutputStream out=new ByteArrayOutputStream()){PDPage page=new PDPage(PDRectangle.A4);doc.addPage(page);
   try(PDPageContentStream cs=new PDPageContentStream(doc,page)){float y=790;
    branding.drawLogo(doc,cs,45,y-55,70,55,cfg);
    text(cs,bold(),16,130,y,cfg.getOrDefault("cabinet.name","Cabinet Dentaire"));
    y-=17;text(cs,regular(),9,130,y,join(cfg.get("cabinet.doctor"),cfg.get("cabinet.specialty")));
    y-=14;text(cs,regular(),9,130,y,cfg.getOrDefault("cabinet.address",""));
    y-=14;text(cs,regular(),9,130,y,join(cfg.get("cabinet.phone"),cfg.get("cabinet.email")));y-=30;
    text(cs,bold(),18,45,y,invoice.getInvoiceType().name()+" "+invoice.getInvoiceNumber());y-=22;
    text(cs,regular(),10,45,y,"Date : "+invoice.getInvoiceDate().format(DateTimeFormatter.ofPattern("dd/MM/yyyy")));y-=16;
    var p=invoice.getPatient();text(cs,regular(),10,45,y,"Patient : "+p.getFirstName()+" "+p.getLastName()+" — "+p.getPatientNumber());y-=28;
    text(cs,bold(),10,45,y,"Désignation");text(cs,bold(),10,330,y,"Qté");text(cs,bold(),10,390,y,"Prix unitaire");text(cs,bold(),10,500,y,"Total");y-=8;line(cs,45,y,550);y-=18;
    for(var item:invoice.getItems()){text(cs,regular(),9,45,y,item.getDescription()+(item.getTooth()==null?"":" — Dent "+item.getTooth()));text(cs,regular(),9,330,y,item.getQuantity().toPlainString());
     text(cs,regular(),9,390,y,money.format(item.getUnitPrice())+" MAD");text(cs,regular(),9,500,y,money.format(item.getLineTotal())+" MAD");y-=18;}
    y-=5;line(cs,330,y,550);y-=20;text(cs,bold(),10,390,y,"Total :");text(cs,bold(),10,480,y,money.format(invoice.getTotalAmount())+" MAD");y-=18;
    text(cs,regular(),10,390,y,"Payé :");text(cs,regular(),10,480,y,money.format(invoice.getPaidAmount())+" MAD");y-=18;
    text(cs,bold(),11,390,y,"Reste :");text(cs,bold(),11,480,y,money.format(invoice.getRemainingAmount())+" MAD");y-=35;
    text(cs,regular(),9,45,y,"Statut : "+invoice.getStatus().name());if(invoice.getNotes()!=null){y-=18;text(cs,regular(),9,45,y,"Notes : "+invoice.getNotes());}}
   doc.save(out);return out.toByteArray();}}
 private void text(PDPageContentStream cs,PDType1Font font,float size,float x,float y,String value)throws IOException{cs.beginText();cs.setFont(font,size);cs.newLineAtOffset(x,y);cs.showText(safe(value));cs.endText();}
 private void line(PDPageContentStream cs,float x,float y,float x2)throws IOException{cs.moveTo(x,y);cs.lineTo(x2,y);cs.stroke();}
 private String safe(String s){return s==null?"":s.replaceAll("[^\\x20-\\x7EÀ-ÿ]"," ");}
 private String join(String first,String second){return java.util.stream.Stream.of(first,second).filter(v->v!=null&&!v.isBlank()).collect(java.util.stream.Collectors.joining(" | "));}
 private PDType1Font regular(){return new PDType1Font(Standard14Fonts.FontName.HELVETICA);}
 private PDType1Font bold(){return new PDType1Font(Standard14Fonts.FontName.HELVETICA_BOLD);}
}

package ma.cabinetdentaire.service;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.HorizontalAlignment;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.List;

@Service
public class CabinetExcelExportService {
    private static final byte[] TEAL = new byte[]{11, (byte) 141, (byte) 134};
    private static final byte[] NAVY = new byte[]{7, 24, 39};
    private static final byte[] LIGHT_TEAL = new byte[]{(byte) 225, (byte) 244, (byte) 241};
    private static final ZoneId CABINET_ZONE = ZoneId.of("Africa/Casablanca");

    private final JdbcTemplate jdbc;

    public CabinetExcelExportService(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Transactional(readOnly = true)
    public byte[] export() {
        try (XSSFWorkbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Styles styles = createStyles(workbook);
            List<SheetResult> results = new ArrayList<>();
            for (SheetDefinition definition : definitions()) {
                results.add(writeDataSheet(workbook, styles, definition));
            }
            writeSummary(workbook, styles, results);
            workbook.setActiveSheet(0);
            workbook.write(output);
            return output.toByteArray();
        } catch (Exception exception) {
            throw new IllegalStateException("Impossible de générer l'export Excel du cabinet.", exception);
        }
    }

    private SheetResult writeDataSheet(XSSFWorkbook workbook, Styles styles, SheetDefinition definition) {
        Sheet sheet = workbook.createSheet(definition.name());
        sheet.createFreezePane(0, 1);
        sheet.setDisplayGridlines(false);
        int[] widths = {0};
        int[] rowIndex = {0};
        int[] columnWidths = new int[40];

        jdbc.query(definition.sql(), resultSet -> {
            ResultSetMetaData metadata = resultSet.getMetaData();
            int columnCount = metadata.getColumnCount();
            widths[0] = columnCount;
            Row header = sheet.createRow(rowIndex[0]++);
            header.setHeightInPoints(26);
            for (int column = 1; column <= columnCount; column++) {
                String label = metadata.getColumnLabel(column);
                Cell cell = header.createCell(column - 1);
                cell.setCellValue(label);
                cell.setCellStyle(styles.header());
                columnWidths[column - 1] = Math.max(12, label.length() + 3);
            }
            while (resultSet.next()) {
                Row row = sheet.createRow(rowIndex[0]++);
                for (int column = 1; column <= columnCount; column++) {
                    Object value = resultSet.getObject(column);
                    Cell cell = row.createCell(column - 1);
                    writeValue(cell, value, styles);
                    columnWidths[column - 1] = Math.min(42,
                            Math.max(columnWidths[column - 1], displayLength(value) + 2));
                }
            }
            return null;
        });

        if (widths[0] > 0) {
            int lastRow = Math.max(0, rowIndex[0] - 1);
            sheet.setAutoFilter(new CellRangeAddress(0, lastRow, 0, widths[0] - 1));
            for (int column = 0; column < widths[0]; column++) {
                sheet.setColumnWidth(column, Math.min(42, columnWidths[column]) * 256);
            }
        }
        return new SheetResult(definition.name(), Math.max(0, rowIndex[0] - 1), widths[0],
                definition.amountColumn());
    }

    private void writeSummary(XSSFWorkbook workbook, Styles styles, List<SheetResult> results) {
        Sheet sheet = workbook.createSheet("Tableau de bord");
        workbook.setSheetOrder("Tableau de bord", 0);
        sheet.setDisplayGridlines(false);
        sheet.setColumnWidth(0, 34 * 256);
        sheet.setColumnWidth(1, 22 * 256);
        sheet.setColumnWidth(2, 42 * 256);

        Row title = sheet.createRow(0);
        title.setHeightInPoints(36);
        Cell titleCell = title.createCell(0);
        titleCell.setCellValue("DENTAL SABRI — Tableau de bord du cabinet");
        titleCell.setCellStyle(styles.title());
        sheet.addMergedRegion(new CellRangeAddress(0, 0, 0, 2));

        Row generated = sheet.createRow(1);
        generated.createCell(0).setCellValue("Généré le");
        Cell generatedValue = generated.createCell(1);
        generatedValue.setCellValue(java.util.Date.from(Instant.now()));
        generatedValue.setCellStyle(styles.dateTime());

        Row note = sheet.createRow(3);
        Cell noteCell = note.createCell(0);
        noteCell.setCellValue("Données confidentielles : conservez ce classeur dans un emplacement sécurisé.");
        noteCell.setCellStyle(styles.note());
        sheet.addMergedRegion(new CellRangeAddress(3, 3, 0, 2));

        Row kpiHeader = sheet.createRow(5);
        kpiHeader.createCell(0).setCellValue("Indicateur");
        kpiHeader.createCell(1).setCellValue("Valeur");
        kpiHeader.createCell(2).setCellValue("Période / détail");
        for (Cell cell : kpiHeader) cell.setCellStyle(styles.header());

        int kpiRow = 6;
        kpiRow = writeKpi(sheet, styles, kpiRow, "Patients enregistrés",
                count("SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL"), "Total dossiers");
        kpiRow = writeKpi(sheet, styles, kpiRow, "Nouveaux patients",
                count("SELECT COUNT(*) FROM patients WHERE deleted_at IS NULL AND created_at >= date_trunc('month', CURRENT_DATE)"), "Mois en cours");
        kpiRow = writeKpi(sheet, styles, kpiRow, "Rendez-vous aujourd’hui",
                count("""
                        SELECT COUNT(*) FROM appointments
                        WHERE starts_at >= CURRENT_DATE
                          AND starts_at < CURRENT_DATE + INTERVAL '1 day'
                          AND status NOT IN ('ANNULE', 'ABSENT', 'REPORTE')
                        """), "Planning actif");
        kpiRow = writeKpi(sheet, styles, kpiRow, "Consultations",
                count("SELECT COUNT(*) FROM consultations WHERE deleted_at IS NULL AND consultation_at >= date_trunc('month', CURRENT_DATE)"), "Mois en cours");
        kpiRow = writeMoneyKpi(sheet, styles, kpiRow, "Total facturé",
                amount("SELECT COALESCE(SUM(total_amount), 0) FROM patient_invoices WHERE status <> 'ANNULEE'"), "Toutes les factures");
        kpiRow = writeMoneyKpi(sheet, styles, kpiRow, "Total encaissé",
                amount("SELECT COALESCE(SUM(amount), 0) FROM patient_payments WHERE cancelled_at IS NULL"), "Tous les règlements");
        kpiRow = writeMoneyKpi(sheet, styles, kpiRow, "Crédit patients restant",
                amount("SELECT COALESCE(SUM(remaining_amount), 0) FROM patient_invoices WHERE status NOT IN ('ANNULEE', 'BROUILLON')"), "Reste à recevoir");
        kpiRow = writeKpi(sheet, styles, kpiRow, "Travaux laboratoire en cours",
                count("SELECT COUNT(*) FROM laboratory_jobs WHERE status IN ('A_PREPARER', 'ENVOYE', 'EN_COURS', 'PRET', 'A_REFAIRE')"), "À suivre");

        int summaryStart = kpiRow + 2;
        Row header = sheet.createRow(summaryStart);
        header.createCell(0).setCellValue("Rubrique");
        header.createCell(1).setCellValue("Nombre d'enregistrements");
        header.createCell(2).setCellValue("Total (MAD)");
        for (Cell cell : header) cell.setCellStyle(styles.header());

        int rowNumber = summaryStart + 1;
        for (SheetResult result : results) {
            Row row = sheet.createRow(rowNumber++);
            row.createCell(0).setCellValue(result.name());
            Cell count = row.createCell(1);
            count.setCellValue(result.rowCount());
            count.setCellStyle(styles.integer());
            if (result.amountColumn() != null && result.rowCount() > 0) {
                Cell total = row.createCell(2);
                total.setCellFormula("SUM('" + result.name() + "'!" + result.amountColumn() + "2:"
                        + result.amountColumn() + (result.rowCount() + 1) + ")");
                total.setCellStyle(styles.money());
            }
        }
        sheet.createFreezePane(0, 6);
    }

    private int writeKpi(Sheet sheet, Styles styles, int rowNumber, String label, long value, String detail) {
        Row row = sheet.createRow(rowNumber);
        row.createCell(0).setCellValue(label);
        Cell valueCell = row.createCell(1);
        valueCell.setCellValue(value);
        valueCell.setCellStyle(styles.integer());
        row.createCell(2).setCellValue(detail);
        return rowNumber + 1;
    }

    private int writeMoneyKpi(Sheet sheet, Styles styles, int rowNumber,
                              String label, BigDecimal value, String detail) {
        Row row = sheet.createRow(rowNumber);
        row.createCell(0).setCellValue(label);
        Cell valueCell = row.createCell(1);
        valueCell.setCellValue(value.doubleValue());
        valueCell.setCellStyle(styles.money());
        row.createCell(2).setCellValue(detail);
        return rowNumber + 1;
    }

    private long count(String sql) {
        Long value = jdbc.queryForObject(sql, Long.class);
        return value == null ? 0L : value;
    }

    private BigDecimal amount(String sql) {
        BigDecimal value = jdbc.queryForObject(sql, BigDecimal.class);
        return value == null ? BigDecimal.ZERO : value;
    }

    private void writeValue(Cell cell, Object value, Styles styles) {
        if (value == null) {
            return;
        }
        if (value instanceof Number number) {
            cell.setCellValue(number.doubleValue());
            cell.setCellStyle(value instanceof BigDecimal ? styles.money() : styles.integer());
        } else if (value instanceof Boolean bool) {
            cell.setCellValue(bool ? "Oui" : "Non");
        } else if (value instanceof Date date) {
            cell.setCellValue(date.toLocalDate());
            cell.setCellStyle(styles.date());
        } else if (value instanceof Timestamp timestamp) {
            cell.setCellValue(timestamp.toLocalDateTime());
            cell.setCellStyle(styles.dateTime());
        } else if (value instanceof LocalDate date) {
            cell.setCellValue(date);
            cell.setCellStyle(styles.date());
        } else if (value instanceof LocalDateTime dateTime) {
            cell.setCellValue(dateTime);
            cell.setCellStyle(styles.dateTime());
        } else if (value instanceof OffsetDateTime dateTime) {
            cell.setCellValue(dateTime.atZoneSameInstant(CABINET_ZONE).toLocalDateTime());
            cell.setCellStyle(styles.dateTime());
        } else if (value instanceof Instant instant) {
            cell.setCellValue(LocalDateTime.ofInstant(instant, CABINET_ZONE));
            cell.setCellStyle(styles.dateTime());
        } else {
            cell.setCellValue(String.valueOf(value));
        }
    }

    private int displayLength(Object value) {
        if (value == null) return 0;
        return Math.min(40, String.valueOf(value).length());
    }

    private Styles createStyles(XSSFWorkbook workbook) {
        Font whiteBold = workbook.createFont();
        whiteBold.setBold(true);
        whiteBold.setColor(IndexedColors.WHITE.getIndex());

        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 18);
        titleFont.setColor(IndexedColors.WHITE.getIndex());

        CellStyle header = workbook.createCellStyle();
        header.setFillForegroundColor(new XSSFColor(TEAL));
        header.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        header.setFont(whiteBold);
        header.setAlignment(HorizontalAlignment.LEFT);
        header.setBorderBottom(BorderStyle.THIN);
        header.setBottomBorderColor(IndexedColors.WHITE.getIndex());

        CellStyle title = workbook.createCellStyle();
        title.setFillForegroundColor(new XSSFColor(NAVY));
        title.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        title.setFont(titleFont);
        title.setAlignment(HorizontalAlignment.LEFT);
        title.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);

        CellStyle date = workbook.createCellStyle();
        date.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd"));
        CellStyle dateTime = workbook.createCellStyle();
        dateTime.setDataFormat(workbook.createDataFormat().getFormat("yyyy-mm-dd hh:mm"));
        CellStyle money = workbook.createCellStyle();
        money.setDataFormat(workbook.createDataFormat().getFormat("#,##0.00"));
        CellStyle integer = workbook.createCellStyle();
        integer.setDataFormat(workbook.createDataFormat().getFormat("#,##0"));

        CellStyle note = workbook.createCellStyle();
        note.setFillForegroundColor(new XSSFColor(LIGHT_TEAL));
        note.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        note.setWrapText(true);

        return new Styles(header, title, date, dateTime, money, integer, note);
    }

    private List<SheetDefinition> definitions() {
        return List.of(
                new SheetDefinition("Patients", """
                        SELECT patient_number AS "N° patient", first_name AS "Prénom", last_name AS "Nom",
                               cin AS "CIN", primary_phone AS "Téléphone", secondary_phone AS "Téléphone 2",
                               birth_date AS "Date de naissance", sex AS "Sexe", email AS "E-mail",
                               address AS "Adresse", city AS "Ville", coverage_type AS "Couverture",
                               membership_number AS "N° adhésion", allergies AS "Allergies",
                               medical_history AS "Antécédents", observations AS "Observations",
                               file_status AS "Statut dossier", last_visit_at AS "Dernière visite",
                               created_at AS "Créé le"
                        FROM patients WHERE deleted_at IS NULL ORDER BY last_name, first_name
                        """, null),
                new SheetDefinition("Rendez-vous", """
                        SELECT p.patient_number AS "N° patient", p.first_name AS "Prénom", p.last_name AS "Nom",
                               a.starts_at AS "Début", a.ends_at AS "Fin", a.reason AS "Motif",
                               a.treatment_type AS "Type de soin", a.status AS "Statut",
                               a.cancellation_reason AS "Motif annulation",
                               a.created_at AS "Créé le"
                        FROM appointments a JOIN patients p ON p.id = a.patient_id
                        ORDER BY a.starts_at DESC
                        """, null),
                new SheetDefinition("Consultations", """
                        SELECT p.patient_number AS "N° patient", p.first_name AS "Prénom", p.last_name AS "Nom",
                               c.consultation_at AS "Date", c.reason AS "Motif", c.diagnosis AS "Diagnostic",
                               c.disease_type AS "Type de maladie", c.tooth AS "Dent",
                               c.treatment_performed AS "Soin réalisé", c.prescription AS "Ordonnance",
                               c.price AS "Montant (MAD)", c.treatment_status AS "Statut", c.observations AS "Observations"
                        FROM consultations c JOIN patients p ON p.id = c.patient_id
                        WHERE c.deleted_at IS NULL ORDER BY c.consultation_at DESC
                        """, "K"),
                new SheetDefinition("Plans de traitement", """
                        SELECT p.patient_number AS "N° patient", p.first_name AS "Prénom", p.last_name AS "Nom",
                               tp.plan_number AS "N° plan", tp.title AS "Intitulé", tp.start_date AS "Début",
                               tp.status AS "Statut", tp.completed_at AS "Terminé le", tp.notes AS "Notes"
                        FROM treatment_plans tp JOIN patients p ON p.id = tp.patient_id
                        WHERE tp.deleted_at IS NULL ORDER BY tp.start_date DESC
                        """, null),
                new SheetDefinition("Factures patients", """
                        SELECT pi.invoice_number AS "N° facture", pi.invoice_date AS "Date",
                               p.patient_number AS "N° patient", p.first_name AS "Prénom", p.last_name AS "Nom",
                               pi.total_amount AS "Total (MAD)", pi.paid_amount AS "Payé (MAD)",
                               pi.remaining_amount AS "Reste (MAD)", pi.invoice_type AS "Type",
                               pi.status AS "Statut", pi.notes AS "Notes"
                        FROM patient_invoices pi JOIN patients p ON p.id = pi.patient_id
                        ORDER BY pi.invoice_date DESC, pi.invoice_number DESC
                        """, "F"),
                new SheetDefinition("Paiements patients", """
                        SELECT pp.receipt_number AS "N° reçu", pp.payment_date AS "Date",
                               p.patient_number AS "N° patient", p.first_name AS "Prénom", p.last_name AS "Nom",
                               pp.amount AS "Montant (MAD)", pp.payment_method AS "Mode",
                               pp.reference AS "Référence", pi.invoice_number AS "N° facture", pp.notes AS "Notes"
                        FROM patient_payments pp JOIN patients p ON p.id = pp.patient_id
                        LEFT JOIN patient_invoices pi ON pi.id = pp.invoice_id
                        WHERE pp.cancelled_at IS NULL ORDER BY pp.payment_date DESC
                        """, "F"),
                new SheetDefinition("Laboratoires", """
                        SELECT name AS "Laboratoire", manager_name AS "Responsable", phone AS "Téléphone",
                               email AS "E-mail", address AS "Adresse", city AS "Ville",
                               tax_identifier AS "Identifiant fiscal", active AS "Actif", observations AS "Observations"
                        FROM laboratories ORDER BY name
                        """, null),
                new SheetDefinition("Travaux laboratoire", """
                        SELECT l.name AS "Laboratoire", p.patient_number AS "N° patient",
                               p.first_name AS "Prénom", p.last_name AS "Nom", lj.job_type AS "Travail",
                               lj.tooth AS "Dent", lj.shade AS "Teinte", lj.sent_date AS "Envoyé le",
                               lj.expected_date AS "Prévu le", lj.received_date AS "Reçu le",
                               lj.laboratory_price AS "Prix laboratoire (MAD)", lj.status AS "Statut",
                               lj.description AS "Description", lj.notes AS "Notes"
                        FROM laboratory_jobs lj JOIN laboratories l ON l.id = lj.laboratory_id
                        JOIN patients p ON p.id = lj.patient_id ORDER BY lj.created_at DESC
                        """, "K"),
                new SheetDefinition("Factures fournisseurs", """
                        SELECT l.name AS "Laboratoire", si.invoice_number AS "N° facture", si.invoice_date AS "Date",
                               si.due_date AS "Échéance", si.total_amount AS "Total (MAD)",
                               si.paid_amount AS "Payé (MAD)", si.remaining_amount AS "Reste (MAD)",
                               si.status AS "Statut", si.notes AS "Notes"
                        FROM supplier_invoices si JOIN laboratories l ON l.id = si.laboratory_id
                        ORDER BY si.invoice_date DESC
                        """, "E"),
                new SheetDefinition("Paiements fournisseurs", """
                        SELECT l.name AS "Laboratoire", sp.payment_date AS "Date", sp.amount AS "Montant (MAD)",
                               sp.payment_method AS "Mode", sp.reference AS "Référence",
                               si.invoice_number AS "N° facture", sp.notes AS "Notes"
                        FROM supplier_payments sp JOIN laboratories l ON l.id = sp.laboratory_id
                        LEFT JOIN supplier_invoices si ON si.id = sp.supplier_invoice_id
                        WHERE sp.cancelled_at IS NULL ORDER BY sp.payment_date DESC
                        """, "C"),
                new SheetDefinition("Dépenses", """
                        SELECT e.expense_date AS "Date", ec.label AS "Catégorie", e.label AS "Libellé",
                               e.amount AS "Montant (MAD)", e.supplier AS "Fournisseur",
                               e.payment_method AS "Mode", e.reference AS "Référence", e.notes AS "Notes"
                        FROM expenses e JOIN expense_categories ec ON ec.id = e.category_id
                        ORDER BY e.expense_date DESC
                        """, "D")
        );
    }

    private record SheetDefinition(String name, String sql, String amountColumn) {}
    private record SheetResult(String name, int rowCount, int columnCount, String amountColumn) {}
    private record Styles(CellStyle header, CellStyle title, CellStyle date, CellStyle dateTime,
                          CellStyle money, CellStyle integer, CellStyle note) {}
}

package ma.cabinetdentaire.service;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PatientNumberGenerator {

    private final JdbcTemplate jdbcTemplate;

    public PatientNumberGenerator(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public String next() {
        Long value = jdbcTemplate.queryForObject("select nextval('patient_number_seq')", Long.class);
        return "PAT-%06d".formatted(value);
    }
}

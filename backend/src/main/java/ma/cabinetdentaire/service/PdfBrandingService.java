package ma.cabinetdentaire.service;

import ma.cabinetdentaire.repository.SettingRepository;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.graphics.image.PDImageXObject;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.HashMap;
import java.util.Map;

@Service
public class PdfBrandingService {
    private static final String BUNDLED_LOGO = "branding/dental-sabri-logo.png";
    private static final Map<String, String> DEFAULTS = Map.of(
            "cabinet.name", "DENTAL SABRI",
            "cabinet.doctor", "Khalid",
            "cabinet.address", "Aït Berra, Tinghir",
            "cabinet.phone", "06 90 33 70 82",
            "cabinet.email", "khalidsabri804@gm.com",
            "cabinet.specialty", "Prothésiste dentaire",
            "cabinet.logo.path", "classpath:/" + BUNDLED_LOGO
    );

    private final SettingRepository settings;

    public PdfBrandingService(SettingRepository settings) {
        this.settings = settings;
    }

    public Map<String, String> settings() {
        Map<String, String> result = new HashMap<>(DEFAULTS);
        settings.findAll().forEach(setting -> result.put(setting.getKey(), setting.getValue()));
        return result;
    }

    public void drawLogo(PDDocument document, PDPageContentStream content,
                         float x, float y, float width, float height,
                         Map<String, String> configuration) throws IOException {
        String configuredPath = configuration.get("cabinet.logo.path");
        PDImageXObject image = null;
        if (configuredPath != null && !configuredPath.startsWith("classpath:")) {
            Path path = Path.of(configuredPath);
            if (Files.isRegularFile(path)) {
                image = PDImageXObject.createFromFile(path.toString(), document);
            }
        }
        if (image == null) {
            try (var input = new ClassPathResource(BUNDLED_LOGO).getInputStream()) {
                image = PDImageXObject.createFromByteArray(document, input.readAllBytes(), "dental-sabri-logo");
            }
        }
        content.drawImage(image, x, y, width, height);
    }
}

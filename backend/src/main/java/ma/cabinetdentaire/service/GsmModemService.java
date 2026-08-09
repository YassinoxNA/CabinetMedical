package ma.cabinetdentaire.service;

import com.fazecast.jSerialComm.SerialPort;
import ma.cabinetdentaire.dto.GsmPortResponse;
import ma.cabinetdentaire.repository.SettingRepository;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.nio.charset.StandardCharsets;
import java.text.Normalizer;
import java.time.Duration;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

@Service
public class GsmModemService {
    private final SettingRepository settings;
    private final Object modemLock = new Object();

    public GsmModemService(SettingRepository settings) {
        this.settings = settings;
    }

    public List<GsmPortResponse> ports() {
        return Arrays.stream(SerialPort.getCommPorts())
                .map(port -> new GsmPortResponse(port.getSystemPortName(), port.getDescriptivePortName()))
                .toList();
    }

    public SendResult send(String rawPhone, String rawMessage) {
        synchronized (modemLock) {
            if (!booleanSetting("gsm.enabled", false)) {
                return SendResult.failure("L'envoi SMS par modem GSM est désactivé.");
            }
            SerialPort port = resolvePort();
            if (port == null) {
                return SendResult.failure("Aucun modem GSM détecté. Branchez le modem USB ou configurez gsm.port.");
            }
            port.setComPortParameters(integerSetting("gsm.baud", 115200), 8,
                    SerialPort.ONE_STOP_BIT, SerialPort.NO_PARITY);
            port.setComPortTimeouts(SerialPort.TIMEOUT_NONBLOCKING, 0, 0);
            if (!port.openPort()) {
                return SendResult.failure("Impossible d'ouvrir le port " + port.getSystemPortName() + ".");
            }
            try {
                drain(port);
                String response = command(port, "AT\r", Duration.ofSeconds(2), "OK");
                if (!response.contains("OK")) {
                    return SendResult.failure("Le périphérique ne répond pas aux commandes AT.");
                }
                command(port, "ATE0\r", Duration.ofSeconds(2), "OK");
                response = command(port, "AT+CMGF=1\r", Duration.ofSeconds(2), "OK");
                if (!response.contains("OK")) {
                    return SendResult.failure("Le modem ne prend pas en charge le mode SMS texte.");
                }
                command(port, "AT+CSCS=\"GSM\"\r", Duration.ofSeconds(2), "OK");
                write(port, "AT+CMGS=\"" + normalizePhone(rawPhone) + "\"\r");
                response = waitFor(port, Duration.ofSeconds(5), ">", "ERROR");
                if (!response.contains(">")) {
                    return SendResult.failure("Le modem n'a pas accepté le numéro : " + response.trim());
                }
                write(port, gsmSafe(rawMessage) + (char) 26);
                response = waitFor(port, Duration.ofSeconds(30), "OK", "ERROR");
                return response.contains("OK") && response.contains("+CMGS")
                        ? SendResult.success(response.trim())
                        : SendResult.failure("Échec d'envoi du modem : " + response.trim());
            } catch (Exception exception) {
                return SendResult.failure("Erreur modem GSM : " + exception.getMessage());
            } finally {
                port.closePort();
            }
        }
    }

    private SerialPort resolvePort() {
        String configured = stringSetting("gsm.port", "");
        SerialPort[] ports = SerialPort.getCommPorts();
        if (!configured.isBlank()) {
            return Arrays.stream(ports)
                    .filter(port -> port.getSystemPortName().equalsIgnoreCase(configured.trim()))
                    .findFirst().orElse(null);
        }
        List<SerialPort> candidates = Arrays.stream(ports).filter(port -> {
            String description = (port.getDescriptivePortName() + " " + port.getPortDescription())
                    .toLowerCase(Locale.ROOT);
            return description.contains("modem") || description.contains("gsm")
                    || description.contains("mobile") || description.contains("wwan");
        }).toList();
        if (candidates.size() == 1) return candidates.getFirst();
        return ports.length == 1 ? ports[0] : null;
    }

    private String command(SerialPort port, String command, Duration timeout, String expected)
            throws InterruptedException {
        write(port, command);
        return waitFor(port, timeout, expected, "ERROR");
    }

    private void write(SerialPort port, String value) {
        byte[] bytes = value.getBytes(StandardCharsets.US_ASCII);
        if (port.writeBytes(bytes, bytes.length) != bytes.length) {
            throw new IllegalStateException("Écriture incomplète sur le port série.");
        }
    }

    private String waitFor(SerialPort port, Duration timeout, String... markers)
            throws InterruptedException {
        long deadline = System.nanoTime() + timeout.toNanos();
        ByteArrayOutputStream buffer = new ByteArrayOutputStream();
        while (System.nanoTime() < deadline) {
            int available = port.bytesAvailable();
            if (available > 0) {
                byte[] bytes = new byte[Math.min(available, 1024)];
                int count = port.readBytes(bytes, bytes.length);
                if (count > 0) {
                    buffer.write(bytes, 0, count);
                    String response = buffer.toString(StandardCharsets.US_ASCII);
                    if (Arrays.stream(markers).anyMatch(response::contains)) return response;
                }
            }
            Thread.sleep(50);
        }
        return buffer.toString(StandardCharsets.US_ASCII);
    }

    private void drain(SerialPort port) {
        while (port.bytesAvailable() > 0) {
            byte[] bytes = new byte[Math.min(port.bytesAvailable(), 1024)];
            port.readBytes(bytes, bytes.length);
        }
    }

    private String normalizePhone(String phone) {
        String normalized = phone == null ? "" : phone.replaceAll("[^+\\d]", "");
        if (normalized.startsWith("00")) normalized = "+" + normalized.substring(2);
        else if (normalized.startsWith("0") && normalized.length() == 10)
            normalized = "+212" + normalized.substring(1);
        if (!normalized.matches("\\+?\\d{8,15}"))
            throw new IllegalArgumentException("Numéro de téléphone invalide.");
        return normalized;
    }

    private String gsmSafe(String value) {
        return Normalizer.normalize(value == null ? "" : value, Normalizer.Form.NFD)
                .replaceAll("\\p{M}", "").replace('’', '\'').replace('–', '-').replace('—', '-');
    }

    private String stringSetting(String key, String fallback) {
        return settings.findById(key).map(setting -> setting.getValue()).orElse(fallback);
    }

    private int integerSetting(String key, int fallback) {
        try { return Integer.parseInt(stringSetting(key, String.valueOf(fallback))); }
        catch (NumberFormatException exception) { return fallback; }
    }

    private boolean booleanSetting(String key, boolean fallback) {
        return Boolean.parseBoolean(stringSetting(key, String.valueOf(fallback)));
    }

    public record SendResult(boolean sent, String response) {
        static SendResult success(String response) { return new SendResult(true, response); }
        static SendResult failure(String response) { return new SendResult(false, response); }
    }
}

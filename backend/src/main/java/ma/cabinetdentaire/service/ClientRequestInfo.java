package ma.cabinetdentaire.service;

import jakarta.servlet.http.HttpServletRequest;

public record ClientRequestInfo(String workstation, String localIp) {

    public static ClientRequestInfo from(HttpServletRequest request) {
        String workstation = sanitize(request.getHeader("X-Workstation-Name"), 160);
        String forwarded = request.getHeader("X-Forwarded-For");
        String address = forwarded == null || forwarded.isBlank()
                ? request.getRemoteAddr()
                : forwarded.split(",")[0].trim();
        return new ClientRequestInfo(workstation, sanitize(address, 64));
    }

    private static String sanitize(String value, int maxLength) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String clean = value.replaceAll("[\\r\\n\\t]", " ").trim();
        return clean.substring(0, Math.min(clean.length(), maxLength));
    }
}

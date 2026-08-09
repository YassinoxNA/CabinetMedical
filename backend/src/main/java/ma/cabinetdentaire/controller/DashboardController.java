package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.DashboardStatsResponse;
import ma.cabinetdentaire.service.DashboardService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/dashboard")
public class DashboardController {
    private final DashboardService service;

    public DashboardController(DashboardService service) {
        this.service = service;
    }

    @GetMapping("/stats")
    public DashboardStatsResponse statistics() {
        return service.statistics();
    }
}

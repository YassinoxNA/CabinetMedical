package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.GsmPortResponse;
import ma.cabinetdentaire.service.GsmModemService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1/gsm")
public class GsmController {
    private final GsmModemService modem;

    public GsmController(GsmModemService modem) {
        this.modem = modem;
    }

    @GetMapping("/ports")
    public List<GsmPortResponse> ports() {
        return modem.ports();
    }
}

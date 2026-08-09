package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import ma.cabinetdentaire.service.ClientRequestInfo;
import ma.cabinetdentaire.service.CashService;
import ma.cabinetdentaire.dto.ExpenseRequest;
import ma.cabinetdentaire.dto.ExpenseResponse;
import ma.cabinetdentaire.service.ExpenseService;
import ma.cabinetdentaire.security.AuthenticatedUser;
import ma.cabinetdentaire.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class CashController {
    private final CashService cashService;
    private final ExpenseService expenseService;
    private final UserService userService;

    public CashController(CashService cashService, ExpenseService expenseService,
                          UserService userService) {
        this.cashService = cashService;
        this.expenseService = expenseService;
        this.userService = userService;
    }

    @PostMapping("/cash-sessions/open")
    public CashSessionResponse open(@Valid @RequestBody OpenCashSessionRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser principal,
                                    HttpServletRequest httpRequest) {
        return cashService.open(request.openingBalance(), userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(httpRequest));
    }

    @GetMapping("/cash-sessions/current")
    public CashSessionResponse current() {
        return cashService.current();
    }

    @PostMapping("/cash-sessions/close")
    public CashSessionResponse close(@Valid @RequestBody CloseCashSessionRequest request,
                                     @AuthenticationPrincipal AuthenticatedUser principal,
                                     HttpServletRequest httpRequest) {
        return cashService.close(request.actualClosingBalance(),
                userService.requireByUsername(principal.username()), ClientRequestInfo.from(httpRequest));
    }

    @PostMapping("/expenses")
    public ExpenseResponse expense(@Valid @RequestBody ExpenseRequest request,
                                    @AuthenticationPrincipal AuthenticatedUser principal,
                                    HttpServletRequest httpRequest) {
        return expenseService.create(request, userService.requireByUsername(principal.username()),
                ClientRequestInfo.from(httpRequest));
    }
}

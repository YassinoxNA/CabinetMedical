package ma.cabinetdentaire.controller;

import ma.cabinetdentaire.dto.*;
import jakarta.servlet.http.HttpServletRequest;import jakarta.validation.Valid;import ma.cabinetdentaire.service.ClientRequestInfo;import ma.cabinetdentaire.entity.VerificationStatus;
import ma.cabinetdentaire.security.AuthenticatedUser;import ma.cabinetdentaire.service.UserService;import ma.cabinetdentaire.service.VerificationService;
import org.springframework.data.domain.*;import org.springframework.security.access.prepost.PreAuthorize;import org.springframework.security.core.annotation.AuthenticationPrincipal;import org.springframework.web.bind.annotation.*;
import java.util.UUID;import static ma.cabinetdentaire.dto.VerificationModels.*;
@RestController @RequestMapping("/api/v1/verifications") @PreAuthorize("hasRole('DOCTEUR')")
public class VerificationController {
 private final VerificationService service;private final UserService users;public VerificationController(VerificationService s,UserService u){service=s;users=u;}
 @GetMapping("/pending") public PageResponse<Response> pending(@RequestParam(defaultValue="0")int page,@RequestParam(defaultValue="50")int size){return PageResponse.from(service.pending(PageRequest.of(Math.max(0,page),Math.min(100,Math.max(1,size)))));}
 @PostMapping("/{type}/{id}/verify") public Response verify(@PathVariable String type,@PathVariable UUID id,@Valid @RequestBody(required=false) DecisionRequest r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){return decide(type,id,VerificationStatus.VERIFIE_PAR_DOCTEUR,r,p,h);}
 @PostMapping("/{type}/{id}/request-correction") public Response correction(@PathVariable String type,@PathVariable UUID id,@Valid @RequestBody DecisionRequest r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){return decide(type,id,VerificationStatus.A_CORRIGER,r,p,h);}
 @PostMapping("/{type}/{id}/cancel") public Response cancel(@PathVariable String type,@PathVariable UUID id,@Valid @RequestBody DecisionRequest r,@AuthenticationPrincipal AuthenticatedUser p,HttpServletRequest h){return decide(type,id,VerificationStatus.ANNULE,r,p,h);}
 private Response decide(String t,UUID id,VerificationStatus s,DecisionRequest r,AuthenticatedUser p,HttpServletRequest h){return service.decide(t,id,s,r==null?null:r.comment(),users.requireByUsername(p.username()),ClientRequestInfo.from(h));}
}

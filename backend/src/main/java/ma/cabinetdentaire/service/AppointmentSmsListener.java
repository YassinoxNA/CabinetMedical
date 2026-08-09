package ma.cabinetdentaire.service;

import org.springframework.stereotype.Component;
import org.springframework.scheduling.annotation.Async;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

@Component
public class AppointmentSmsListener {
    private final SmsNotificationService notifications;

    public AppointmentSmsListener(SmsNotificationService notifications) {
        this.notifications = notifications;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    @Async
    public void onAppointmentSms(AppointmentSmsEvent event) {
        notifications.send(event);
    }
}

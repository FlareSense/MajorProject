package com.flaresense.auth.services;

import com.flaresense.auth.models.FireEvent;
import com.flaresense.auth.models.TwilioConfig;
import com.flaresense.auth.repository.FireEventRepository;
import com.flaresense.auth.repository.TwilioConfigRepository;
import com.flaresense.auth.models.User;
import com.flaresense.auth.repository.UserRepository;
import com.twilio.Twilio;
import com.twilio.rest.api.v2010.account.Message;
import com.twilio.rest.api.v2010.account.Call;
import com.twilio.type.PhoneNumber;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TwilioAlertService {

    @Autowired
    private TwilioConfigRepository configRepo;

    @Autowired
    private FireEventRepository fireEventRepo;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JavaMailSender mailSender;

    public void dispatchAlertsAsync(boolean hasFire, boolean evacNeeded, FireEvent event) {
        // Start thread directly to avoid requiring @EnableAsync config across the app
        new Thread(() -> {
            List<TwilioConfig> configs = configRepo.findAll();
            
            if (configs.isEmpty()) {
                System.out.println("⚠️ TwilioAlertService: No Twilio Configurations found in database. Skipping dispatch.");
                return;
            }

            boolean successfullySent = false;
            
            for (TwilioConfig config : configs) {
                try {
                    // Initialize Twilio using individual user's credentials
                    Twilio.init(config.getAccountSid(), config.getAuthToken());

                    String emoji = (evacNeeded || "HIGH".equals(event.getSeverity())) ? "🚨" : "⚠️";
                    String body = String.format("%s *FIRE ALERT* %s\n\n*Severity:* %s\n📍 *Zone:* %s", 
                                                emoji, emoji, event.getSeverity(), event.getZone());
                    
                    if (event.getImagePath() != null) {
                        body += "\n🖼️ Evidence Link: " + event.getImagePath();
                    }
                    
                    if (event.getLocationUrl() != null) {
                        body += "\n📍 Google Maps: " + event.getLocationUrl();
                    }

                    // Send Standard SMS Message
                    Message message = Message.creator(
                            new PhoneNumber(config.getToNumber()),
                            new PhoneNumber(config.getFromNumber()),
                            body
                    ).create();
                    
                    System.out.println("✅ Sent SMS Alert (SID: " + message.getSid() + ") to " + config.getToNumber());
                    
                    // Voice Call Escalation
                    if (hasFire) {
                        try {
                            com.twilio.type.Twiml twiml = new com.twilio.type.Twiml("<Response><Say voice=\"alice\">Emergency Alert! Fire detected in zone " + event.getZone() + ". Severity is " + event.getSeverity() + ". Please check your dashboard immediately.</Say></Response>");
                            
                            Call call = Call.creator(
                                    new PhoneNumber(config.getToNumber()),
                                    new PhoneNumber(config.getFromNumber()),
                                    twiml
                            ).create();
                            System.out.println("📞 Made Voice Call (SID: " + call.getSid() + ") to " + config.getToNumber());
                        } catch(Exception e) {
                            System.err.println("❌ Twilio Voice Failed: " + e.getMessage());
                        }
                    }

                    // Optional: WhatsApp Alerts via Sandbox
                    if (config.getEnableWhatsapp() != null && config.getEnableWhatsapp()) {
                        try {
                            com.twilio.rest.api.v2010.account.MessageCreator creator = Message.creator(
                                    new PhoneNumber("whatsapp:" + config.getToNumber()),
                                    new PhoneNumber("whatsapp:+14155238886"),
                                    body
                            );

                            String photoUrl = event.getImagePath();
                            if (photoUrl != null && !photoUrl.contains("127.0.0.1") && !photoUrl.contains("localhost")) {
                                creator.setMediaUrl(java.util.Arrays.asList(java.net.URI.create(photoUrl)));
                            }

                            Message waMessage = creator.create();
                            System.out.println("✅ Sent WhatsApp Alert (SID: " + waMessage.getSid() + ")");
                        } catch (Exception e) {
                            System.err.println("❌ Failed to send WhatsApp: " + e.getMessage());
                        }
                    }

                    // Optional: Telegram Bot Alert
                    if (config.getTelegramBotToken() != null && !config.getTelegramBotToken().trim().isEmpty() &&
                        config.getTelegramChatId() != null && !config.getTelegramChatId().trim().isEmpty()) {
                        try {
                            String baseTgUrl = "https://api.telegram.org/bot" + config.getTelegramBotToken().trim();
                            org.springframework.web.client.RestTemplate restTemplate = new org.springframework.web.client.RestTemplate();
                            
                            String photoUrl = event.getImagePath();
                            java.util.Map<String, String> tgPayload = new java.util.HashMap<>();
                            tgPayload.put("chat_id", config.getTelegramChatId().trim());
                            
                            String endpoint;
                            if (photoUrl != null && !photoUrl.contains("127.0.0.1") && !photoUrl.contains("localhost")) {
                                endpoint = "/sendPhoto";
                                tgPayload.put("photo", photoUrl);
                                tgPayload.put("caption", body);
                            } else {
                                endpoint = "/sendMessage";
                                tgPayload.put("text", body + "\n\n(Local image attachment omitted)");
                            }

                            org.springframework.http.ResponseEntity<String> response = restTemplate.postForEntity(baseTgUrl + endpoint, tgPayload, String.class);
                            System.out.println("✅ Telegram Alert Status: " + response.getStatusCode());
                        } catch (Exception e) {
                            System.err.println("❌ Failed to send Telegram: " + e.getMessage());
                        }
                    }

                    successfullySent = true;
                    
                } catch (Exception e) {
                    System.err.println("❌ Failed to send Twilio alert for config ID: " + config.getUserId());
                    System.err.println("   Reason: " + e.getMessage());
                }
            }

            // --- Multi-Resident Email Broadcast ---
            try {
                List<User> residents = userRepository.findAll();
                if (!residents.isEmpty()) {
                    String subject = String.format("🚨 FlareSense: FIRE DETECTED in %s", event.getZone());
                    String emailBody = String.format(
                        "EMERGENCY ALERT: FlareSense AI has detected a fire anomaly.\n\n" +
                        "Location Zone: %s\n" +
                        "Severity Level: %s\n\n" +
                        "Evidence Link: %s\n" +
                        "Map Location: %s\n\n" +
                        "Immediate action may be required. Please check the Monitoring Dashboard.",
                        event.getZone(), event.getSeverity(), event.getImagePath(), event.getLocationUrl()
                    );

                    for (User resident : residents) {
                        if (resident.getEmail() != null && resident.getEmail().contains("@")) {
                            try {
                                SimpleMailMessage mail = new SimpleMailMessage();
                                mail.setSubject(subject);
                                mail.setText(emailBody);
                                mail.setTo(resident.getEmail());
                                mailSender.send(mail);
                                System.out.println("📧 Emailed Resident: " + resident.getUsername() + " (" + resident.getEmail() + ")");
                            } catch (Exception e) {
                                System.err.println("❌ Failed to email " + resident.getUsername() + ": " + e.getMessage());
                            }
                        }
                    }
                }
            } catch (Exception e) {
                System.err.println("❌ Global Email Dispatch Error: " + e.getMessage());
            }
            
            if (successfullySent) {
                event.setAlertSent(true);
                fireEventRepo.save(event);
            }
        }).start();
    }
}

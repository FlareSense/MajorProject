package com.flaresense.auth.controllers;

import com.flaresense.auth.models.ContactMessage;
import com.flaresense.auth.repository.ContactMessageRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.web.bind.annotation.*;

import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/contact")
@CrossOrigin(origins = "*", maxAge = 3600)
public class ContactController {

    @Autowired
    private ContactMessageRepository contactMessageRepository;

    @Autowired
    private JavaMailSender mailSender;

    @PostMapping("/submit")
    public ResponseEntity<?> submitContactForm(@RequestBody ContactMessage request) {
        if (request.getName() == null || request.getName().trim().isEmpty() ||
            request.getEmail() == null || request.getEmail().trim().isEmpty() ||
            request.getMessage() == null || request.getMessage().trim().isEmpty()) {
            Map<String, String> error = new HashMap<>();
            error.put("message", "All fields are required");
            return ResponseEntity.badRequest().body(error);
        }

        // Save to Database
        ContactMessage savedMessage = contactMessageRepository.save(request);

        // Send Professional Email to Business Owner
        new Thread(() -> {
            try {
                SimpleMailMessage mail = new SimpleMailMessage();
                mail.setSubject("New Deployment Inquiry from: " + savedMessage.getName());
                
                String emailBody = String.format(
                    "You have received a new business inquiry from the FlareSense Gateway.\n\n" +
                    "--- CLIENT DIRECTORY INFO ---\n" +
                    "Name: %s\n" +
                    "Email Address: %s\n" +
                    "Internal Reference ID: #%d\n" +
                    "Timestamp: %s\n\n" +
                    "--- SECURE MESSAGE CONTENT ---\n\n" +
                    "%s\n\n" +
                    "-----------------------------\n" +
                    "To respond to this inquiry, simply reply directly to this email.\n" +
                    "FlareSense Automated Systems",
                    savedMessage.getName(), 
                    savedMessage.getEmail(), 
                    savedMessage.getId(), 
                    savedMessage.getSubmittedAt().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                    savedMessage.getMessage()
                );
                
                mail.setText(emailBody);
                mail.setReplyTo(savedMessage.getEmail()); // Ensure hitting "reply" goes to the client.
                mail.setTo("codewithpavan29@gmail.com");
                
                mailSender.send(mail);
                System.out.println("✅ Dispatched business inquiry email for " + savedMessage.getName());
            } catch (Exception e) {
                System.err.println("❌ Failed to edge email for inquiry: " + e.getMessage());
            }
        }).start();

        Map<String, String> response = new HashMap<>();
        response.put("message", "Request submitted successfully. Our deployment team will contact you shortly.");
        return ResponseEntity.ok(response);
    }
}

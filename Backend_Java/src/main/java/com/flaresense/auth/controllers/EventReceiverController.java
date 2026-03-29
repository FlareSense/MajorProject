package com.flaresense.auth.controllers;

import com.flaresense.auth.models.FireEvent;
import com.flaresense.auth.repository.FireEventRepository;
import com.flaresense.auth.services.TwilioAlertService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.Map;

@RestController
@RequestMapping("/api/internal/events")
public class EventReceiverController {

    @Autowired
    private FireEventRepository fireEventRepo;

    @Autowired
    private TwilioAlertService twilioAlertService;

    @PostMapping
    public ResponseEntity<?> receiveEvent(@RequestBody Map<String, Object> payload) {
        try {
            FireEvent event = new FireEvent();
            event.setTimestamp(new Date());
            event.setZone((String) payload.get("cameraName"));
            event.setSeverity((String) payload.get("severity"));
            
            Number confidence = (Number) payload.get("confidence");
            event.setConfidence(confidence != null ? confidence.doubleValue() : 0.0);
            
            Number chaos = (Number) payload.get("chaos");
            event.setChaosScore(chaos != null ? chaos.doubleValue() : 0.0);
            
            event.setImagePath((String) payload.get("imageUrl"));
            
            Number lat = (Number) payload.get("latitude");
            event.setLatitude(lat != null ? lat.doubleValue() : null);
            
            Number lon = (Number) payload.get("longitude");
            event.setLongitude(lon != null ? lon.doubleValue() : null);
            
            if (event.getLatitude() != null && event.getLongitude() != null) {
                event.setLocationUrl("https://maps.google.com/?q=" + event.getLatitude() + "," + event.getLongitude());
            }

            event.setAlertSent(false);

            FireEvent savedEvent = fireEventRepo.save(event);

            Boolean hasFire = (Boolean) payload.get("hasFire");
            Boolean evacNeeded = (Boolean) payload.get("evacuationNeeded");

            twilioAlertService.dispatchAlertsAsync(
                    hasFire != null ? hasFire : false,
                    evacNeeded != null ? evacNeeded : false,
                    savedEvent
            );

            return ResponseEntity.ok(Map.of("message", "Event logged successfully", "id", savedEvent.getId()));
        } catch (Exception e) {
            System.err.println("Webhook internal save error: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.internalServerError().body(Map.of("error", e.getMessage()));
        }
    }
}

package com.flaresense.auth.controllers;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@RestController
@RequestMapping("/api/iot")
public class IotController {

    // Simulates physical building hardware state per zone.
    // Example: { "cam_0": { "sprinklers_active": true, "door_locked": true } }
    private final Map<String, Map<String, Boolean>> deviceStates = new ConcurrentHashMap<>();

    // Initialize default states for known cameras
    public IotController() {
        deviceStates.put("cam_0", new ConcurrentHashMap<>(Map.of("sprinklers_active", false, "doors_locked", false)));
        deviceStates.put("cam_1", new ConcurrentHashMap<>(Map.of("sprinklers_active", false, "doors_locked", false)));
    }

    /**
     * Poll endpoint for React to display 3D visual effects.
     */
    @GetMapping("/status")
    public ResponseEntity<Map<String, Map<String, Boolean>>> getIotStatus() {
        return ResponseEntity.ok(deviceStates);
    }

    /**
     * Trigger endpoint for the Python AI to activate mitigation hardware.
     * Expects payload: { "camera_id": "cam_0", "mechanism": "sprinklers_active",
     * "state": true }
     */
    @PostMapping("/trigger")
    public ResponseEntity<?> triggerSuppression(@RequestBody Map<String, Object> payload) {
        try {
            String cameraId = (String) payload.get("camera_id");
            String mechanism = (String) payload.get("mechanism");
            Boolean activeState = (Boolean) payload.get("state");

            if (cameraId == null || mechanism == null || activeState == null) {
                return ResponseEntity.badRequest()
                        .body(Map.of("error", "Invalid payload. Requires camera_id, mechanism, and state."));
            }

            // Create zone if it somehow doesn't exist
            deviceStates.putIfAbsent(cameraId, new ConcurrentHashMap<>());

            // Execute the physical action (Update state in our mock)
            deviceStates.get(cameraId).put(mechanism, activeState);

            System.out.println("🚨 MOCK IOT HARDWARE TRIGGER 🚨 | Zone: " + cameraId + " | Mechanism: " + mechanism
                    + " | State: " + (activeState ? "ON 🟢" : "OFF 🔴"));

            return ResponseEntity.ok(Map.of("status", "success", "zone", cameraId, mechanism, activeState));

        } catch (ClassCastException e) {
            return ResponseEntity.badRequest().body(Map.of("error", "Payload data types incorrect."));
        }
    }
}

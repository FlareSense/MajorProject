package com.flaresense.auth.controllers;

import com.flaresense.auth.models.FireEvent;
import com.flaresense.auth.repository.FireEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/api/analytics")
public class AnalyticsController {

    @Autowired
    private FireEventRepository repository;

    @GetMapping("/stats")
    public ResponseEntity<?> getAnalyticsStats() {
        Map<String, Object> response = new HashMap<>();
        Map<String, Object> stats = new HashMap<>();

        long totalEvents = repository.countTotalEvents();
        Double avgConf = repository.getAverageConfidence();

        List<Map<String, Object>> severityRaw = repository.countBySeverity();
        Map<String, Long> severityCounts = new HashMap<>();
        severityCounts.put("LOW", 0L);
        severityCounts.put("MEDIUM", 0L);
        severityCounts.put("HIGH", 0L);

        for (Map<String, Object> row : severityRaw) {
            String sev = (String) row.get("severity");
            Long count = (Long) row.get("count");
            severityCounts.put(sev, count);
        }

        stats.put("total_events", totalEvents);
        stats.put("avg_confidence", avgConf == null ? 0.0 : avgConf);
        stats.put("severity_counts", severityCounts);
        stats.put("zones", new String[] {});

        List<FireEvent> recentEvents = repository.findAllByOrderByTimestampDesc();

        response.put("stats", stats);
        response.put("events", recentEvents);

        return ResponseEntity.ok(response);
    }

    @GetMapping("/events/{id}")
    public ResponseEntity<?> getEventDetails(@PathVariable Long id) {
        Optional<FireEvent> event = repository.findById(id);

        if (event.isPresent()) {
            return ResponseEntity.ok(event.get());
        } else {
            return ResponseEntity.status(404).body(Map.of("error", "Event not found"));
        }
    }
}

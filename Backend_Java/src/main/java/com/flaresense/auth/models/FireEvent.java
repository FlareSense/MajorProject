package com.flaresense.auth.models;

import jakarta.persistence.*;
import java.util.Date;

@Entity
@Table(name = "fire_events")
public class FireEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp;

    @Column(nullable = false)
    private Double confidence;

    @Column(name = "chaos_score", nullable = false)
    private Double chaosScore;

    @Column(nullable = false)
    private String severity; // ENUM('LOW', 'MEDIUM', 'HIGH')

    @Column(nullable = false, length = 50)
    private String zone;

    @Column(name = "image_path", nullable = false)
    private String imagePath;

    @Column(name = "alert_sent", nullable = false)
    private Boolean alertSent;

    private Double latitude;
    private Double longitude;

    @Column(name = "location_url")
    private String locationUrl;

    // Default constructor for JPA
    public FireEvent() {
    }

    // Getters
    public Long getId() {
        return id;
    }

    public Date getTimestamp() {
        return timestamp;
    }

    public Double getConfidence() {
        return confidence;
    }

    public Double getChaosScore() {
        return chaosScore;
    }

    public String getSeverity() {
        return severity;
    }

    public String getZone() {
        return zone;
    }

    public String getImagePath() {
        return imagePath;
    }

    public Boolean getAlertSent() {
        return alertSent;
    }

    public Double getLatitude() {
        return latitude;
    }

    public Double getLongitude() {
        return longitude;
    }

    public String getLocationUrl() {
        return locationUrl;
    }

    // Setters
    public void setId(Long id) {
        this.id = id;
    }

    public void setTimestamp(Date timestamp) {
        this.timestamp = timestamp;
    }

    public void setConfidence(Double confidence) {
        this.confidence = confidence;
    }

    public void setChaosScore(Double chaosScore) {
        this.chaosScore = chaosScore;
    }

    public void setSeverity(String severity) {
        this.severity = severity;
    }

    public void setZone(String zone) {
        this.zone = zone;
    }

    public void setImagePath(String imagePath) {
        this.imagePath = imagePath;
    }

    public void setAlertSent(Boolean alertSent) {
        this.alertSent = alertSent;
    }

    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    public void setLocationUrl(String locationUrl) {
        this.locationUrl = locationUrl;
    }
}

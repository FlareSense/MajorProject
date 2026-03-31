package com.flaresense.auth.repository;

import com.flaresense.auth.models.FireEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.Date;
import java.util.List;
import java.util.Map;

@Repository
public interface FireEventRepository extends JpaRepository<FireEvent, Long> {

    @Query("SELECT COUNT(f) FROM FireEvent f")
    long countTotalEvents();

    @Query("SELECT AVG(f.confidence) FROM FireEvent f")
    Double getAverageConfidence();

    @Query("SELECT f.severity AS severity, COUNT(f) AS count FROM FireEvent f GROUP BY f.severity")
    List<Map<String, Object>> countBySeverity();

    List<FireEvent> findAllByOrderByTimestampDesc();

    // Last 30 days history
    List<FireEvent> findByTimestampAfterOrderByTimestampDesc(Date cutoff);

    // Auto-cleanup: delete events older than cutoff
    void deleteByTimestampBefore(Date cutoff);
}

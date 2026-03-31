package com.flaresense.auth.services;

import com.flaresense.auth.repository.FireEventRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Calendar;
import java.util.Date;
import java.util.logging.Logger;

@Service
public class AlertCleanupService {

    private static final Logger log = Logger.getLogger(AlertCleanupService.class.getName());

    @Autowired
    private FireEventRepository fireEventRepository;

    /**
     * Runs every day at midnight (00:00:00).
     * Deletes all FireEvent records older than 30 days.
     */
    @Scheduled(cron = "0 0 0 * * *")
    @Transactional
    public void purgeOldAlerts() {
        Date cutoff = getThirtyDaysAgo();
        long countBefore = fireEventRepository.count();
        fireEventRepository.deleteByTimestampBefore(cutoff);
        long countAfter = fireEventRepository.count();
        long deleted = countBefore - countAfter;
        log.info("[FlareSense] Auto-cleanup: purged " + deleted + " fire events older than 30 days.");
    }

    public static Date getThirtyDaysAgo() {
        Calendar cal = Calendar.getInstance();
        cal.add(Calendar.DAY_OF_MONTH, -30);
        return cal.getTime();
    }
}

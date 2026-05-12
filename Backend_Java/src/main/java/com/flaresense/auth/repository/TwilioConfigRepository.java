package com.flaresense.auth.repository;

import com.flaresense.auth.models.TwilioConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface TwilioConfigRepository extends JpaRepository<TwilioConfig, Long> {
}

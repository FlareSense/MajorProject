package com.flaresense.auth;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.jdbc.core.JdbcTemplate;

@SpringBootApplication
@EnableScheduling
public class FlareSenseAuthApplication {

	public static void main(String[] args) {
        SpringApplication.run(FlareSenseAuthApplication.class, args);
	}

    @Bean
    public CommandLineRunner runDatabaseMigrations(JdbcTemplate jdbcTemplate) {
        return args -> {
            try {
                // Force profile_image column to LONGTEXT to support base64 avatars
                jdbcTemplate.execute("ALTER TABLE users MODIFY COLUMN profile_image LONGTEXT;");
                System.out.println("✅ Database Migration: profile_image column updated to LONGTEXT");
            } catch (Exception e) {
                System.out.println("⚠️ Database Migration failed (could be ignored if column is already correct): " + e.getMessage());
            }
        };
    }
}

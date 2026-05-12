package com.flaresense.auth.controllers;

import com.flaresense.auth.models.TwilioConfig;
import com.flaresense.auth.models.User;
import com.flaresense.auth.repository.TwilioConfigRepository;
import com.flaresense.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/settings/twilio")
@CrossOrigin(origins = "*", maxAge = 3600)
public class TwilioConfigController {

    @Autowired
    private TwilioConfigRepository configRepo;

    @Autowired
    private UserRepository userRepo;

    @GetMapping
    public ResponseEntity<?> getConfig() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Optional<User> userOpt = userRepo.findByUsername(auth.getName());
        
        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        User user = userOpt.get();

        Optional<TwilioConfig> config = configRepo.findById(user.getId());
        return config.map(ResponseEntity::ok).orElse(ResponseEntity.noContent().build());
    }

    @PostMapping
    public ResponseEntity<?> saveConfig(@RequestBody TwilioConfig request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        Optional<User> userOpt = userRepo.findByUsername(auth.getName());

        if (userOpt.isEmpty()) return ResponseEntity.status(401).build();
        User user = userOpt.get();

        request.setUserId(user.getId());
        TwilioConfig saved = configRepo.save(request);
        return ResponseEntity.ok(saved);
    }
}

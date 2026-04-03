package com.flaresense.auth.controllers;

import com.flaresense.auth.models.User;
import com.flaresense.auth.repository.UserRepository;
import com.flaresense.auth.security.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        String username = loginRequest.get("username");
        String password = loginRequest.get("password");

        return userRepository.findByUsername(username)
                .filter(user -> encoder.matches(password, user.getPassword()))
                .map(user -> {
                    String jwt = io.jsonwebtoken.Jwts.builder()
                            .setSubject(user.getUsername())
                            .setIssuedAt(new java.util.Date())
                            .setExpiration(new java.util.Date((new java.util.Date()).getTime() + 86400000))
                            .signWith(
                                    io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                                            "FlareSenseSuperSecretKey123!@#FlareSenseSuperSecretKey123!@#".getBytes()),
                                    io.jsonwebtoken.SignatureAlgorithm.HS256)
                            .compact();

                    Map<String, Object> response = new HashMap<>();
                    response.put("token", jwt);
                    response.put("id", user.getId());
                    response.put("username", user.getUsername());
                    response.put("email", user.getEmail());
                    response.put("roles", user.getRoles());
                    response.put("profileImage", user.getProfileImage());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.status(401).body(Map.of("message", "Error: Unauthorized")));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.get("username"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Username is already taken!"));
        }

        User user = new User(signUpRequest.get("username"),
                signUpRequest.get("email"),
                encoder.encode(signUpRequest.get("password")));

        // Store profile image if provided
        if (signUpRequest.get("profileImage") != null && !signUpRequest.get("profileImage").isEmpty()) {
            user.setProfileImage(signUpRequest.get("profileImage"));
        }

        String reqRole = signUpRequest.get("role");
        String finalRole = "ROLE_USER";
        if ("admin".equalsIgnoreCase(reqRole)) {
            if (userRepository.countByRolesContaining("ROLE_ADMIN") >= 1) {
                return ResponseEntity.badRequest().body(Map.of("message", "Max Capacity: Admin (Owner) already exists."));
            }
            finalRole = "ROLE_ADMIN";
        } else {
            if (userRepository.countByRolesContaining("ROLE_USER") >= 6) {
                return ResponseEntity.badRequest().body(Map.of("message", "Max Capacity: Resident limit (6) reached."));
            }
        }

        user.getRoles().add(finalRole);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "User registered successfully!"));
    }

    /**
     * GET /api/auth/me — returns the currently logged-in user's details.
     * Reads username from the JWT Authorization header.
     */
    @GetMapping("/me")
    public ResponseEntity<?> getCurrentUser(@RequestHeader("Authorization") String authHeader) {
        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing or invalid token"));
        }
        String token = authHeader.substring(7);
        try {
            String username = io.jsonwebtoken.Jwts.parserBuilder()
                    .setSigningKey(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                            "FlareSenseSuperSecretKey123!@#FlareSenseSuperSecretKey123!@#".getBytes()))
                    .build()
                    .parseClaimsJws(token)
                    .getBody()
                    .getSubject();

            return userRepository.findByUsername(username)
                    .map(user -> {
                        Map<String, Object> response = new HashMap<>();
                        response.put("id", user.getId());
                        response.put("username", user.getUsername());
                        response.put("email", user.getEmail());
                        response.put("roles", user.getRoles());
                        response.put("profileImage", user.getProfileImage());
                        return ResponseEntity.ok(response);
                    })
                    .orElse(ResponseEntity.status(404).body(Map.of("message", "User not found")));
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid token"));
        }
    }

    /**
     * PUT /api/auth/profile — update username, password, and/or profile image.
     */
    @PutMapping("/profile")
    public ResponseEntity<?> updateProfile(
            @RequestHeader("Authorization") String authHeader,
            @RequestBody Map<String, String> body) {

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(401).body(Map.of("message", "Missing or invalid token"));
        }

        // ── Step 1: parse JWT (only JWT errors go to 401) ──────────────────
        String username;
        try {
            username = io.jsonwebtoken.Jwts.parserBuilder()
                    .setSigningKey(io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                            "FlareSenseSuperSecretKey123!@#FlareSenseSuperSecretKey123!@#".getBytes()))
                    .build()
                    .parseClaimsJws(authHeader.substring(7))
                    .getBody()
                    .getSubject();
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Invalid or expired token"));
        }

        // ── Step 2: load user + apply changes (DB errors → 400/500) ────────
        try {
            var userOpt = userRepository.findByUsername(username);
            if (userOpt.isEmpty()) {
                return ResponseEntity.status(404).body(Map.of("message", "User not found"));
            }
            var user = userOpt.get();

            // Update username if provided and different
            String newUsername = body.get("username");
            if (newUsername != null && !newUsername.isBlank() && !newUsername.trim().equals(user.getUsername())) {
                if (userRepository.existsByUsername(newUsername.trim())) {
                    return ResponseEntity.badRequest().body(Map.of("message", "Username already taken"));
                }
                user.setUsername(newUsername.trim());
            }

            // Update password if provided
            String newPassword = body.get("password");
            if (newPassword != null && !newPassword.isBlank()) {
                user.setPassword(encoder.encode(newPassword));
            }

            // Update profile image if provided
            String newImage = body.get("profileImage");
            if (newImage != null && !newImage.isBlank()) {
                user.setProfileImage(newImage);
            }

            userRepository.save(user);

            Map<String, Object> response = new HashMap<>();
            response.put("message", "Profile updated successfully");
            response.put("username", user.getUsername());
            response.put("email", user.getEmail());
            response.put("profileImage", user.getProfileImage());
            return ResponseEntity.ok(response);

        } catch (Exception e) {
            System.err.println("Profile update error: " + e.getMessage());
            return ResponseEntity.status(500).body(Map.of("message", "Failed to update profile: " + e.getMessage()));
        }
    }
}

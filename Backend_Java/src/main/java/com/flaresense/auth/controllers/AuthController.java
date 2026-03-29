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

        // Basic direct check for this demo (usually use AuthenticationManager)
        return userRepository.findByUsername(username)
                .filter(user -> encoder.matches(password, user.getPassword()))
                .map(user -> {
                    // Generate cheap token manually for simplicity in this demo without full
                    // UserDetailsServiceImpl
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
                    response.put("roles", user.getRoles());
                    return ResponseEntity.ok(response);
                })
                .orElse(ResponseEntity.status(401).body(Map.of("message", "Error: Unauthorized")));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody Map<String, String> signUpRequest) {
        if (userRepository.existsByUsername(signUpRequest.get("username"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Username is already taken!"));
        }

        // Create new user's account
        User user = new User(signUpRequest.get("username"),
                signUpRequest.get("email"),
                encoder.encode(signUpRequest.get("password")));

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
}

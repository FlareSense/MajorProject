package com.flaresense.auth.controllers;

import com.flaresense.auth.models.User;
import com.flaresense.auth.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder encoder;

    @GetMapping("/users")
    public ResponseEntity<?> getAllUsers() {
        List<User> users = userRepository.findAll();
        // Mask passwords before sending to the client
        users.forEach(u -> u.setPassword(null));
        return ResponseEntity.ok(users);
    }

    @PostMapping("/users")
    public ResponseEntity<?> createUser(@RequestBody Map<String, String> request) {
        String role = request.getOrDefault("role", "ROLE_USER");
        if (!role.startsWith("ROLE_")) {
            role = "ROLE_" + role.toUpperCase();
        }

        // Limit Enforcement: 1 Admin, 6 Standard Users
        if ("ROLE_ADMIN".equals(role)) {
            if (userRepository.countByRolesContaining("ROLE_ADMIN") >= 1) {
                return ResponseEntity.badRequest().body(Map.of("message", "Max Capacity: Only 1 Admin (Apartment Owner) allowed."));
            }
        } else {
            if (userRepository.countByRolesContaining("ROLE_USER") >= 6) {
                return ResponseEntity.badRequest().body(Map.of("message", "Max Capacity: Apartment limit of 6 Rental Users reached."));
            }
        }

        if (userRepository.existsByUsername(request.get("username"))) {
            return ResponseEntity.badRequest().body(Map.of("message", "Error: Username is already taken!"));
        }

        User user = new User(
                request.get("username"),
                request.getOrDefault("email", "operator@flaresense.local"),
                encoder.encode(request.get("password")));

        if (request.get("profileImage") != null && !request.get("profileImage").isEmpty()) {
            user.setProfileImage(request.get("profileImage"));
        }

        user.getRoles().add(role);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Resident enrolled successfully!"));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        if (userRepository.existsById(id)) {
            userRepository.deleteById(id);
            return ResponseEntity.ok(Map.of("message", "User deleted successfully!"));
        }
        return ResponseEntity.badRequest().body(Map.of("error", "User not found"));
    }
}

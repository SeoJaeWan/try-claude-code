package com.example.app.auth.dto;

public record AuthResponse(
    Long userId,
    String email,
    String token
) {
}

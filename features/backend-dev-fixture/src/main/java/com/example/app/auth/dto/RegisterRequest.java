package com.example.app.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record RegisterRequest(
    @Email String email,
    @NotBlank String name,
    @NotBlank String password
) {
}

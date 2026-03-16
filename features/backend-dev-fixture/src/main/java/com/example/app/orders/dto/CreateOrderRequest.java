package com.example.app.orders.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;

public record CreateOrderRequest(
    @NotBlank String customerName,
    @Min(0) int totalAmount
) {
}

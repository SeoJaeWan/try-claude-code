package com.example.app.orders.dto;

public record OrderResponse(
    Long id,
    String customerName,
    int totalAmount,
    String status
) {
}

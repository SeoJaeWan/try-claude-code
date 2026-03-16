package com.example.app.orders.entity;

public record OrderEntity(
    Long id,
    String customerName,
    int totalAmount,
    String status
) {
}

package com.example.app.dto;

public record ProfileSummaryResponse(
    String userName,
    int pendingTodos,
    int completedTodos,
    int unreadNotifications
) {
}

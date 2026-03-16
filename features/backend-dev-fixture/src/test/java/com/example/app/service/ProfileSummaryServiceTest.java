package com.example.app.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.app.dto.ProfileSummaryResponse;
import org.junit.jupiter.api.Test;

class ProfileSummaryServiceTest {

  private final ProfileSummaryService profileSummaryService = new ProfileSummaryService();

  @Test
  void buildSummaryReturnsStableShape() {
    ProfileSummaryResponse result = profileSummaryService.buildSummary();

    assertThat(result.userName()).isEqualTo("테스트유저");
    assertThat(result.pendingTodos()).isGreaterThanOrEqualTo(0);
    assertThat(result.completedTodos()).isGreaterThanOrEqualTo(0);
    assertThat(result.unreadNotifications()).isGreaterThanOrEqualTo(0);
  }
}

package com.example.app.service;

import com.example.app.dto.ProfileSummaryResponse;
import org.springframework.stereotype.Service;

// Legacy seed: feature-specific service still lives in a root-level package.
@Service
public class ProfileSummaryService {

  public ProfileSummaryResponse buildSummary() {
    return new ProfileSummaryResponse("테스트유저", 3, 5, 2);
  }
}

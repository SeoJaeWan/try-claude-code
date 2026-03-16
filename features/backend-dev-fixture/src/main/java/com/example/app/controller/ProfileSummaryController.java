package com.example.app.controller;

import com.example.app.dto.ProfileSummaryResponse;
import com.example.app.service.ProfileSummaryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

// Legacy seed: feature-specific controller still lives in a root-level package.
@RestController
@RequestMapping("/profile-summary")
public class ProfileSummaryController {

  private final ProfileSummaryService profileSummaryService;

  public ProfileSummaryController(ProfileSummaryService profileSummaryService) {
    this.profileSummaryService = profileSummaryService;
  }

  @GetMapping
  public ProfileSummaryResponse getProfileSummary() {
    return profileSummaryService.buildSummary();
  }
}

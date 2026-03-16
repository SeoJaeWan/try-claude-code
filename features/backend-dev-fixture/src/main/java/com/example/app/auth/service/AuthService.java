package com.example.app.auth.service;

import com.example.app.auth.dto.AuthResponse;
import com.example.app.auth.dto.LoginRequest;
import com.example.app.auth.dto.RegisterRequest;
import com.example.app.auth.entity.UserEntity;
import com.example.app.auth.repository.UserRepository;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

  private final UserRepository userRepository;

  public AuthService(UserRepository userRepository) {
    this.userRepository = userRepository;
  }

  public AuthResponse register(RegisterRequest request) {
    UserEntity saved = userRepository.save(new UserEntity(null, request.email(), request.name()));
    return new AuthResponse(saved.id(), saved.email(), "registered-token");
  }

  public AuthResponse login(LoginRequest request) {
    UserEntity user = userRepository.findByEmail(request.email());
    return new AuthResponse(user.id(), user.email(), "login-token");
  }
}

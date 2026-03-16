package com.example.app.auth.repository;

import com.example.app.auth.entity.UserEntity;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Repository;

@Repository
public class UserRepository {

  private final Map<String, UserEntity> storage = new LinkedHashMap<>();
  private final AtomicLong sequence = new AtomicLong(1L);

  public UserEntity save(UserEntity userEntity) {
    long id = userEntity.id() == null ? sequence.getAndIncrement() : userEntity.id();
    UserEntity persisted = new UserEntity(id, userEntity.email(), userEntity.name());
    storage.put(persisted.email(), persisted);
    return persisted;
  }

  public UserEntity findByEmail(String email) {
    return storage.computeIfAbsent(email, value -> new UserEntity(sequence.getAndIncrement(), value, "기본사용자"));
  }
}

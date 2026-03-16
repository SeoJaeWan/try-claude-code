package com.example.app.orders.repository;

import com.example.app.orders.entity.OrderEntity;
import jakarta.annotation.PostConstruct;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.atomic.AtomicLong;
import org.springframework.stereotype.Repository;

@Repository
public class OrdersRepository {

  private final Map<Long, OrderEntity> storage = new LinkedHashMap<>();
  private final AtomicLong sequence = new AtomicLong(1L);

  @PostConstruct
  void seed() {
    save(new OrderEntity(null, "홍길동", 32000, "CONFIRMED"));
  }

  public List<OrderEntity> findAll() {
    return new ArrayList<>(storage.values());
  }

  public OrderEntity save(OrderEntity entity) {
    long id = entity.id() == null ? sequence.getAndIncrement() : entity.id();
    OrderEntity persisted = new OrderEntity(id, entity.customerName(), entity.totalAmount(), entity.status());
    storage.put(id, persisted);
    return persisted;
  }
}

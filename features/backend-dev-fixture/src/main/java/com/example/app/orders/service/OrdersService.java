package com.example.app.orders.service;

import com.example.app.orders.dto.CreateOrderRequest;
import com.example.app.orders.dto.OrderResponse;
import com.example.app.orders.entity.OrderEntity;
import com.example.app.orders.repository.OrdersRepository;
import java.util.List;
import org.springframework.stereotype.Service;

@Service
public class OrdersService {

  private final OrdersRepository ordersRepository;

  public OrdersService(OrdersRepository ordersRepository) {
    this.ordersRepository = ordersRepository;
  }

  public List<OrderEntity> findAll() {
    return ordersRepository.findAll();
  }

  public OrderEntity create(CreateOrderRequest request) {
    OrderEntity entity = new OrderEntity(
        null,
        request.customerName(),
        request.totalAmount(),
        "PENDING"
    );
    return ordersRepository.save(entity);
  }

  public OrderResponse toResponse(OrderEntity entity) {
    return new OrderResponse(
        entity.id(),
        entity.customerName(),
        entity.totalAmount(),
        entity.status()
    );
  }
}

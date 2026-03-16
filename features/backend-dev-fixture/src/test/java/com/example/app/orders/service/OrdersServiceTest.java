package com.example.app.orders.service;

import static org.assertj.core.api.Assertions.assertThat;

import com.example.app.orders.dto.CreateOrderRequest;
import com.example.app.orders.repository.OrdersRepository;
import org.junit.jupiter.api.Test;

class OrdersServiceTest {

  private final OrdersService ordersService = new OrdersService(new OrdersRepository());

  @Test
  void createAddsPendingOrder() {
    var created = ordersService.create(new CreateOrderRequest("테스터", 12000));

    assertThat(created.id()).isNotNull();
    assertThat(created.customerName()).isEqualTo("테스터");
    assertThat(created.status()).isEqualTo("PENDING");
  }
}

package com.example.app.orders.controller;

import com.example.app.orders.dto.CreateOrderRequest;
import com.example.app.orders.entity.OrderEntity;
import com.example.app.orders.service.OrdersService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/orders")
public class OrdersController {

  private final OrdersService ordersService;

  public OrdersController(OrdersService ordersService) {
    this.ordersService = ordersService;
  }

  @GetMapping
  public List<OrderEntity> getOrders() {
    return ordersService.findAll();
  }

  @PostMapping
  public OrderEntity createOrder(@Valid @RequestBody CreateOrderRequest request) {
    return ordersService.create(request);
  }
}

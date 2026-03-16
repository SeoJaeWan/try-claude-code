import { Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { Order } from './interfaces/order.interface';

@Injectable()
export class OrdersService {
  private readonly orders: Order[] = [];

  create(createOrderDto: CreateOrderDto): Order {
    const now = new Date();
    const order: Order = {
      id: randomUUID(),
      customerName: createOrderDto.customerName,
      items: createOrderDto.items,
      totalAmount: createOrderDto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      ),
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };

    this.orders.push(order);
    return order;
  }

  findAll(): Order[] {
    return this.orders;
  }

  findOne(id: string): Order {
    const order = this.orders.find((o) => o.id === id);
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return order;
  }

  update(id: string, updateOrderDto: UpdateOrderDto): Order {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }

    const existing = this.orders[index];
    const updated: Order = {
      ...existing,
      ...updateOrderDto,
      updatedAt: new Date(),
    };

    if (updateOrderDto.items) {
      updated.totalAmount = updateOrderDto.items.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0,
      );
    }

    this.orders[index] = updated;
    return updated;
  }

  remove(id: string): void {
    const index = this.orders.findIndex((o) => o.id === id);
    if (index === -1) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    this.orders.splice(index, 1);
  }
}

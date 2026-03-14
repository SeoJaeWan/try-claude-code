import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersService', () => {
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrdersService],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create an order with calculated total', () => {
      const dto: CreateOrderDto = {
        customerName: 'Test User',
        items: [
          { productName: 'Item A', quantity: 2, price: 15 },
          { productName: 'Item B', quantity: 1, price: 30 },
        ],
      };
      const order = service.create(dto);
      expect(order.id).toBeDefined();
      expect(order.customerName).toBe('Test User');
      expect(order.totalAmount).toBe(60);
      expect(order.status).toBe('pending');
      expect(order.items).toHaveLength(2);
    });
  });

  describe('findAll', () => {
    it('should return empty array initially', () => {
      expect(service.findAll()).toEqual([]);
    });

    it('should return all created orders', () => {
      service.create({
        customerName: 'A',
        items: [{ productName: 'X', quantity: 1, price: 10 }],
      });
      service.create({
        customerName: 'B',
        items: [{ productName: 'Y', quantity: 1, price: 20 }],
      });
      expect(service.findAll()).toHaveLength(2);
    });
  });

  describe('findOne', () => {
    it('should return the order by id', () => {
      const created = service.create({
        customerName: 'C',
        items: [{ productName: 'Z', quantity: 1, price: 5 }],
      });
      const found = service.findOne(created.id);
      expect(found.id).toBe(created.id);
    });

    it('should throw NotFoundException', () => {
      expect(() => service.findOne('bad-id')).toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update fields and recalculate total when items change', () => {
      const created = service.create({
        customerName: 'D',
        items: [{ productName: 'W', quantity: 1, price: 100 }],
      });
      const updated = service.update(created.id, {
        items: [{ productName: 'W', quantity: 3, price: 100 }],
      });
      expect(updated.totalAmount).toBe(300);
    });

    it('should update status without changing total', () => {
      const created = service.create({
        customerName: 'E',
        items: [{ productName: 'V', quantity: 1, price: 50 }],
      });
      const updated = service.update(created.id, { status: 'shipped' });
      expect(updated.status).toBe('shipped');
      expect(updated.totalAmount).toBe(50);
    });

    it('should throw NotFoundException for non-existent order', () => {
      expect(() => service.update('bad-id', { status: 'cancelled' })).toThrow(
        NotFoundException,
      );
    });
  });

  describe('remove', () => {
    it('should remove the order', () => {
      const created = service.create({
        customerName: 'F',
        items: [{ productName: 'U', quantity: 1, price: 10 }],
      });
      service.remove(created.id);
      expect(service.findAll()).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent order', () => {
      expect(() => service.remove('bad-id')).toThrow(NotFoundException);
    });
  });
});

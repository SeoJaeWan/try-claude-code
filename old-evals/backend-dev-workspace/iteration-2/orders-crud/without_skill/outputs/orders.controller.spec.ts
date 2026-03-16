import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let service: OrdersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [OrdersService],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should create an order', () => {
      const dto: CreateOrderDto = {
        customerName: 'John Doe',
        items: [{ productName: 'Widget', quantity: 2, price: 10 }],
      };
      const result = controller.create(dto);
      expect(result.customerName).toBe('John Doe');
      expect(result.totalAmount).toBe(20);
      expect(result.status).toBe('pending');
      expect(result.id).toBeDefined();
    });
  });

  describe('findAll', () => {
    it('should return an array of orders', () => {
      const dto: CreateOrderDto = {
        customerName: 'Jane Doe',
        items: [{ productName: 'Gadget', quantity: 1, price: 50 }],
      };
      controller.create(dto);
      const result = controller.findAll();
      expect(result).toHaveLength(1);
    });
  });

  describe('findOne', () => {
    it('should return a single order', () => {
      const dto: CreateOrderDto = {
        customerName: 'Jane Doe',
        items: [{ productName: 'Gadget', quantity: 1, price: 50 }],
      };
      const created = controller.create(dto);
      const result = controller.findOne(created.id);
      expect(result.id).toBe(created.id);
    });

    it('should throw NotFoundException for non-existent order', () => {
      expect(() => controller.findOne('non-existent')).toThrow(
        NotFoundException,
      );
    });
  });

  describe('update', () => {
    it('should update an order', () => {
      const dto: CreateOrderDto = {
        customerName: 'Jane Doe',
        items: [{ productName: 'Gadget', quantity: 1, price: 50 }],
      };
      const created = controller.create(dto);
      const result = controller.update(created.id, { status: 'confirmed' });
      expect(result.status).toBe('confirmed');
    });
  });

  describe('remove', () => {
    it('should remove an order', () => {
      const dto: CreateOrderDto = {
        customerName: 'Jane Doe',
        items: [{ productName: 'Gadget', quantity: 1, price: 50 }],
      };
      const created = controller.create(dto);
      controller.remove(created.id);
      expect(controller.findAll()).toHaveLength(0);
    });

    it('should throw NotFoundException for non-existent order', () => {
      expect(() => controller.remove('non-existent')).toThrow(
        NotFoundException,
      );
    });
  });
});

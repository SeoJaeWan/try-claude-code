import { OrderItemDto } from './create-order.dto';

export class UpdateOrderDto {
  customerName?: string;
  items?: OrderItemDto[];
  status?: 'pending' | 'confirmed' | 'shipped' | 'delivered' | 'cancelled';
}

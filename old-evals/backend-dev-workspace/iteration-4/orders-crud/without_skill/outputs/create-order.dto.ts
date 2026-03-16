export class CreateOrderDto {
  customerName: string;
  items: OrderItemDto[];
}

export class OrderItemDto {
  productName: string;
  quantity: number;
  price: number;
}

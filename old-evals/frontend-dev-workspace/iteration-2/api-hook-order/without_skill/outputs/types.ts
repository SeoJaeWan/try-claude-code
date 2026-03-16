export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "shipping"
  | "delivered"
  | "cancelled";

export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchOrderParams {
  orderId: string;
  enabled?: boolean;
}

export interface UseFetchOrderResult {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

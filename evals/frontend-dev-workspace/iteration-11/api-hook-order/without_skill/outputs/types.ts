export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string;
  orderNumber: string;
  status: "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";
  items: OrderItem[];
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface FetchOrderParams {
  orderId: string;
}

export interface UseFetchOrderResult {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

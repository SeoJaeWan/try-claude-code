export interface OrderItem {
  id: string;
  productName: string;
  quantity: number;
  unitPrice: number;
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

export interface UseFetchOrderParams {
  orderId: string | undefined;
}

export interface UseFetchOrderReturn {
  data: Order | null;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}
